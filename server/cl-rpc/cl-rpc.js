var fs          = require('fs'),
	libpath     = require('path'),
	async       = require('async'),
	crypto      = require('crypto'),
	exec        = require('child_process').exec,
	prettyPrint = require('pretty-data').pd,
	winston     = require('winston'),
	ms          = require('ms'),
	cronJob     = require('cron').CronJob;

var oldConsole = console;
var console = {
	log : function (text) {
		winston.log ('info', text);
	}
};

// directory where user can add their own .json action definition files
var actionsDirectories = [];

// object storing all the actions
var actions;

// permissions level (1 by default)
var permissions;

// base directory where all data files are (data, cache, actions, ..)
var filesRoot;

// allowed sub-directories in filesRoot. They are automatically created if not existent
var directories = [];
var dataDirs = {};

// variable to enumerate actions for logging
var actionsCounter = 0;

//30 days of maximum life time for cache folders
var maximumCacheAge = ms('30d');
function cleanCache() {
	console.log('Starting cache cleaning (delete folders older than ' +
		ms(maximumCacheAge, { long: true }) + ')'); 

	var cacheDir = filesRoot + 'cache/';
	if (!fs.existsSync(cacheDir)) {
		winston.log ('error' , 'wrong cache directory :' + cacheDir);
		return;
	}

	fs.readdir(cacheDir, function (err, files) {
		async.eachSeries(files,
			function (file, callback) {
				fs.stat( cacheDir + file, function (err, stats) {
					if (err) {
						callback (err);
					}
					var time = stats.mtime.getTime();
					var currentTime = new Date().getTime();
					var age = currentTime - time;
					if (age > maximumCacheAge) {
						console.log('deleting cache ' + file + ' (' + ms(age, { long: true }) + ' old)'); 
						exec('rm -rf ' + file, {cwd : cacheDir}, callback);
					} else {
						callback();
					}
				});
			},
			function (err) {
				if (err) {
					console.log(err);
				}
			}
		);
	});
}

var job = new cronJob({
	cronTime: '0 0 ' + Math.floor(24 * Math.random()) + ' * * *',
	onTick: cleanCache,
	start: true
});

exports.validatePath = function (path, callback) {
	fs.realpath(filesRoot + path, function (err, realPath) {
		if (err) {
			callback(err);
			return;
		} else {
			for (var i = 0; i != directories.length; i++) {
				var subDir = directories[i];
				if (realPath.slice(0, subDir.length) == subDir) {
					callback ();
					return;
				}
			}
			callback("path " + realPath + " not allowed");
		}
	});
};

function includeActionsFile (file, callback) {
	fs.exists(file, function (exists) {
		if (exists) {
			if (libpath.extname(file).toLowerCase() === '.json') {
				console.log('importing actions from : ' + file);
				includeActionsJSON(file, callback);
			} else {
				callback();
			}
		} else {
			console.log("Warning : no file "+file+" found");
			callback();
		}
	});
}

exports.includeActions = function (file, callback) {
	switch (typeof (file))
	{
	case "string" :
		includeActionsFile(file, afterImport);
		break;
	case "object" :
		async.eachSeries(file, includeActionsFile, afterImport);
		break;
	default:
		callback ("error in actions importations: cannot handle " + file);
		afterImport();
	}

	function afterImport() {
		exportActions(filesRoot + "actions.json", callback);
	}
};

includeActionsJSON = function (file, callback) {
	fs.readFile(file, function (err, data) {
		try {
			var libraryName = libpath.basename(file, '.json');
			var actionsObject = JSON.parse(data);

			var localActions = actionsObject.actions || [];
			var path = fs.realpathSync(libpath.dirname(file));
			var actionsArray = Object.keys(localActions);
			console.log(actionsArray.length + " actions in " + file);

			actionsArray.forEach(function (actionName) {
				var action = localActions[actionName];
				action.lib = libraryName;
				var attributes = action.attributes;
				if ( typeof (attributes.js) === 'string' ) {
					console.log('loaded javascript from ' + attributes.js);
					attributes.executable = path + '/' + attributes.js + '.js';
					attributes.module = require(path + '/' + attributes.js);
					attributes.path = path;
				} else if ( typeof (attributes.executable) === 'string' ) {
					attributes.executable = path + '/' + attributes.executable;
					attributes.path = path;
				}
				var existingAction = actions[actionName];
				if (existingAction) {
					if (action.priority < existingAction.priority) {
						return;
					}
				}
				actions[actionName] = action;
			});

			var dirs = actionsObject.dataDirs || {};
			Object.keys(dirs).forEach(function (key) {
				var source = dirs[key];
				if (source.indexOf('./') === 0) {
					// source is relative, prepend directory
					source = libpath.join(libpath.dirname(file), source);
				}
				dataDirs[key] = source;
			});

			var includes = (actionsObject.include || []).map(function (include) {
				if (include.charAt(0) != '/') {
					// the path is relative. Prepend directory
					include = libpath.dirname(file) + '/' + include;
				}
				return include;
			});

			if (typeof(actionsObject.permissions) === 'number') {
				permissions = actionsObject.permissions;
			}

			exports.includeActions(includes, callback);
		}
		catch (error) {
			console.log('error importing ' + file);
			console.log(error);
			actions['import_error_' + libraryName] = {lib : libraryName};
			if ( typeof(callback) === 'function' ) {
				callback();
			}
		}
	});
};

function exportActions(file, callback) {
	fs.writeFile(file, prettyPrint.json(JSON.stringify({actions : actions ,
														permissions : permissions,
														dataDirs : dataDirs})),
		function (err) {
			if (err) throw err;
			if (typeof callback === "function") {
				callback();
			}
	});
}

exports.addDirectory = function (directory) {
	actionsDirectories.push(directory);
};

exports.update = function (callback) {
	// clear actions
	actions = {};
	dataDirs = {};
	permissions = 1;

	async.each(actionsDirectories, function (directory, callback) {
		fs.readdir(directory, function (err, files) {
			for (var i = 0; i < files.length; i++) {
				files[i] = directory + files[i];
			}
			exports.includeActions(files, callback);
		});
	}, function (err) {
		console.log(Object.keys(actions).length + ' actions included');

		// create all data directories and symlinks if they do not exist
		Object.keys(dataDirs).forEach(function (key) {
			var dir = filesRoot + key;
			if (!fs.existsSync(dir)) {
				console.log('Warning : directory ' + dir + ' does not exist. Creating it');
				var source = dataDirs[key];
				if (source === key) {
					fs.mkdirSync(dir);
					console.log('directory ' + dir + ' created');
					directories.push(fs.realpathSync(dir));
				} else {
					if (fs.existsSync(source)) {
						fs.symlinkSync(source, dir, 'dir');
						console.log('directory ' + dir + ' created as a symlink to ' + source);
						directories.push(fs.realpathSync(dir));
					} else {
						console.log('ERROR : Cannot create directory ' + dir + ' as source directory ' + source + ' does not exist');
					}
				}
			} else {
				directories.push(fs.realpathSync(dir));
			}
		});
		cleanCache();

		if (typeof callback === 'function') {
			callback();
		}
	});
};

exports.getAction = function (actionName) {
	return JSON.parse(JSON.stringify(actions[actionName]));
};

exports.setRoot = function (root) {
	filesRoot = fs.realpathSync(root) + '/';
};

ongoingActions = {};

exports.performAction = function (POST, callback) {
	if (POST.manage) {
		switch (POST.manage)
		{
		case "kill" :
			var handle = ongoingActions[POST.handle];
			if (!handle) {
				callback ({status : 'not found'});
				return;
			}
			var processToKill = handle.childProcess;
			if (processToKill) {
				var pid = processToKill.pid;
				processToKill.kill();
				console.log('killed process ' + (pid+1));
				callback ({status : 'killed'});
			} else {
				callback ({status : 'not existent'});
			}
			return;
		case "list" :
		default:
			// we need to remove circular dependencies before sending the list
			var cache = [];
			var objString = JSON.stringify(ongoingActions,
				function(key, value) {
					if (typeof value === 'object' && value !== null) {
						if (cache.indexOf(value) !== -1) {
							// Circular reference found, discard key
							return;
						}
						// Store value in our collection
						cache.push(value);
					}
					return value;
				}
			);
			cache = null; 
			callback(JSON.parse(objString));
			return;
		}
	}

	var action;
	var commandLine = '';
	var inputMTime = -1;
	var actionParameters = {};
	var outputDirectory;
	var cachedAction = false;
	var actionHandle = POST.handle || Math.random().toString();

	actionsCounter++;
	var header = "[" + actionsCounter + "] ";

	var response = {};

	async.series([

	// first, parse parameters into actionParameters;
	function (callback) {
		var i;
		var actionName = POST.action;
		actionParameters.action = actionName;

		action = actions[actionName];
		if (!action) {
			callback("action "+actionName+" not found");
			return;
		}

		commandLine += (action.attributes.executable || 
			action.attributes.command) + ' ';

		function parseParameter (parameter, callback) {
            function validateValue (parameterValue, parameter) {
                var compare;
                if (parameter.min) {
                    compare = parseFloat(parameter.min);
                    if (parameterValue < compare) {
                        return ('error : parameter ' + parameter.name +
                            ' minimum value is ' + compare);
                    }
                }
                if (parameter.max) {
                    compare = parseFloat(parameter.max);
                    if (parameterValue > compare) {
                        return ('error : parameter ' + parameter.name +
                            ' maximal value is ' + compare);
                    }
                }
                return (null);
            }

			if (parameter.text !== undefined) {
				// parameter is actually a text anchor
				commandLine += parameter.text;
				callback ();
				return;
			} else {
				var parameterValue = POST[parameter.name];
                var numericValue;
				actionParameters[parameter.name] = parameterValue;

				if (parameterValue === undefined){
					if (parameter.required === "true") {
						callback ("parameter " + parameter.name + " is required!");
						return;
					} else {
						callback();
						return;
					}
				} else {
					if (parameter.prefix !== undefined) {
						commandLine += parameter.prefix;
					}

					switch (parameter.type)
					{
					case 'file':
						fs.realpath(filesRoot + parameterValue, function (err, path) {
							if (err) {
								callback (err);
								return;
							}
							commandLine += path + " ";
							fs.stat(filesRoot + parameterValue, function (err, stats) {
								inputMTime = Math.max(stats.mtime.getTime(), inputMTime);
								callback ();
							});
						});
						break;
					case 'directory':
						fs.realpath(filesRoot + parameterValue, function (err, path) {
							if (err) {
								callback (err);
								return;
							}
							commandLine += path + " ";
							fs.stat(filesRoot + parameterValue, function (err, stats) {
								inputMTime = Math.max(stats.mtime.getTime(), inputMTime);
								if (!stats.isDirectory()) {
									callback ("error : " + parameterValue + " is not a directory");
								}
								callback ();
							});
						});
						break;
					case 'string':
						if (parameterValue.indexOf(" ") === -1) {
							commandLine += parameterValue + " ";
							callback ();
						}
						else {
							callback ("parameter " + parameter.name + " must not contain spaces");
						}
						break;
					case 'int':
                        numericValue = parseInt(parameterValue, 10);
						if (isNaN(numericValue)) {
							callback ("parameter " + parameter.name + " must be an integer value");
						}
						else {
							commandLine += parameterValue + " ";
							callback (validateValue(numericValue, parameter));
						}
						break;
					case 'float':
                        numericValue = parseFloat(parameterValue, 10);
						if (isNaN(numericValue)) {
							callback ("parameter " + parameter.name + " must be a floating point value");
						}
						else {
							commandLine += parameterValue + " ";
                            callback (validateValue(numericValue, parameter));
						}
						break;
					case 'text':
					case 'base64data':
						commandLine += parameterValue + " ";
						callback ();
						break;
					default:
						callback ("parameter type not handled : " + parameter.type);
					}
				}
			}
		}

		var parameters = action.parameters;

		async.eachSeries(parameters, parseParameter, function(err){
			response.MTime = inputMTime;
			// take into account executable modification time
			if (action.attributes.executable) {
				fs.stat(action.attributes.executable, function (err, stats) {
					if (!err) {
						inputMTime = Math.max(stats.mtime.getTime(), inputMTime);
					}
					callback (err);
				});
			} else {
				callback ();
			}
		});
	},

	// then handle output directory in outputDirectory
	function (callback) {
		if (permissions === 0) {
			POST.output_directory = "cache/";
		}
		outputDirectory = POST.output_directory;
		actionParameters.output_directory = outputDirectory;

		if (action.attributes.voidAction === "true") {
			callback();
			return;
		}

		switch (outputDirectory) 
		{
		case undefined :
			var counterFile = filesRoot + "/actions/counter.json";
			fs.readFile(counterFile, function (err, data) {
				var index = 1;
				if (!err) {
					index=JSON.parse(data).value + 1;
				}
				outputDirectory = "actions/" + index + "/";
				fs.mkdir(filesRoot + "/actions/" + index, function (err) {
					if ( err ) {
						callback( err.message );
					} else {
						fs.writeFile(counterFile, JSON.stringify({value : index}), 
							function(err) {
								if (err) {
									callback(err);
								}
								else {
									callback();
								}
							}
						);
					}
				});
			});
			break;
		case "cache/" :
			var shasum = crypto.createHash('sha1');
			shasum.update(commandLine);
			outputDirectory = "cache/" + shasum.digest('hex') + "/";
			fs.stat(filesRoot + outputDirectory, function (err, stats) {
				if (err) {
					// directory does not exist, create it
					fs.mkdir(filesRoot + outputDirectory, 0777 , function (err) {
						if (err) {
							callback(err.message);
						} else {
							callback ();
						}
					});
					return;
				} else {
					callback ();
				}
			});
			break;
		default :
			exports.validatePath ( outputDirectory, callback );
		}
	},

	// log the action and  detect whether the action is already in cache 
	function (callback) 
	{
		actionParameters.output_directory = outputDirectory;
		console.log (header + 'in : ' + outputDirectory);
		if (commandLine.length < 500) {
			console.log (header + commandLine);
		} else {
			console.log (header + commandLine.substr(0,500) + '...[trimmed]');
		}

		if ((action.attributes.voidAction === "true")||
        (POST.force_update === "true") ||
        (action.attributes.noCache === "true")){
			callback();
		}
		else {
			// check if action was already performed
			var actionFile = libpath.join(filesRoot, outputDirectory, "action.json");
			fs.stat(actionFile, function (err, stats) {
				if ((err)||(stats.mtime.getTime() < inputMTime)) {
					callback();
				} else {
					fs.readFile(actionFile, function (err, data) {
						if (data == JSON.stringify(actionParameters)) {
							console.log(header + "cached");
							cachedAction = true;
						}
						callback();
					});
				}
			});
		}
	},

	// execute the action (or not when it is cached)
	function (callback) {
		if (action.attributes.voidAction !== "true") {
			response.outputDirectory = outputDirectory;
		}

		if (cachedAction) {
			exec('touch ' + libpath.join(filesRoot, outputDirectory, "action.json"),
				function () {
					fs.readFile(libpath.join(filesRoot, outputDirectory, 'action.log'),
					function (err, string) {
						response.status = 'CACHED';
						response.log = string;
						// touch output Directory to avoid automatic deletion
						exec('touch ' + libpath.join(filesRoot, outputDirectory));

						callback();
				});
			});
			return;
		}

		var startTime = new Date().getTime();

		var writeJSON = false;
		var commandOptions = { cwd: filesRoot , maxBuffer: 1080*1920};
		if ((action.attributes.voidAction !== "true" ||
				action.attributes.noCache === "true")) {
			commandOptions.cwd += outputDirectory;
			writeJSON = true;
		}

		if (action.attributes.noCache === "true") {
			writeJSON = false;
		}

		var js = action.attributes.module;
		if ( typeof (js) === "object" ) {
			var actionParameters2 = JSON.parse(JSON.stringify(actionParameters));
			actionParameters2.filesRoot = filesRoot;
			actionParameters2.HackActionsHandler = exports;
			js.execute(actionParameters2, afterExecution);
			return;
		}

		var handle = {};
		handle.POST = JSON.parse(JSON.stringify(POST));
		handle.childProcess = exec(commandLine, commandOptions, afterExecution);
		ongoingActions[actionHandle] = handle;
		response.handle = actionHandle;

		var logStream;
		if (outputDirectory) {
			logStream = fs.createWriteStream(libpath.join(filesRoot, outputDirectory, "action.log"));
			handle.childProcess.stdout.pipe(logStream);
			handle.childProcess.stderr.pipe(logStream);
		}

		function afterExecution(err, stdout, stderr) {
			if (logStream) {
				logStream.end();
			}
		//	console.log(err);
			delete ongoingActions[actionHandle];
			if (POST.stdout == "true") {
				response.stdout = stdout;
			} else {
				response.stdout = 'stdout and stderr not included. Launch action with parameter stdout="true"';
			}
			response.stderr = stderr;
			if (err) {
				if (err.killed) {
					response.status = "KILLED";
					callback();
				} else {
					callback(err);
				}
			} else if (stderr) {
				callback(stderr);
			} else {
				response.status = 'OK (' + (new Date().getTime() - startTime) / 1000 + 's)';
				if (writeJSON) {
					// touch output Directory to avoid automatic deletion
					exec('touch ' + libpath.join(filesRoot, outputDirectory));
					fs.writeFile(filesRoot + outputDirectory + "/action.json", JSON.stringify(actionParameters), function (err) {
						if (err) {throw err;}
						callback();
					});
				} else {
					callback();
				}
			}
		}
	}],
	function (err) {
		if (err) {
			response.status = "ERROR";
			response.error = err;
		}
		callback(response);
	});
};

exports.getDirectoryContent = function (path, callback) {
	console.log('listDir : ' + path);
	async.waterfall([
		function (callback) {
			exports.validatePath(path, callback);
		},

		function (callback) {
			var realDir = filesRoot + "/" + path + "/";
			fs.readdir(realDir, function (err, files) {
				if (err) {
					callback (err);
					return;
				}

				async.map(files, function (file, callback) {
						fs.stat(realDir + file, function (err, stats) {
							stats.name = file;
							stats.isDirectory = stats.isDirectory();
							stats.mtime = stats.mtime.getTime();
							callback(null, stats);
						});
					},
					callback
				);
			});
		}],
		function (error, message) {
			callback(message);
		}
	);
};
exports.addDirectory(__dirname + '/lib/');

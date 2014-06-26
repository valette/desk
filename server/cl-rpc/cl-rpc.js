var	fs          = require('fs'),
	libpath     = require('path'),
	async       = require('async'),
	crypto      = require('crypto'),
	exec        = require('child_process').exec,
	prettyPrint = require('pretty-data').pd,
	winston     = require('winston'),
	ms          = require('ms'),
	os          = require('os'),
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

	var cacheDir = libpath.join(filesRoot, 'cache');
	if (!fs.existsSync(cacheDir)) {
		winston.log ('error' , 'wrong cache directory :' + cacheDir);
		return;
	}

	fs.readdir(cacheDir, function (err, files) {
		async.eachSeries(files,
			function (file, callback) {
				fs.stat(libpath.join(cacheDir, file), function (err, stats) {
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
	fs.realpath(libpath.join(filesRoot, path), function (err, realPath) {
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
			console.log("Warning : no file " +file + " found");
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
		exportActions(libpath.join(filesRoot, "actions.json"), callback);
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
					attributes.executable = libpath.join(path, attributes.js + '.js');
					attributes.module = require(libpath.join(path, attributes.js));
					attributes.path = path;
				} else if ( typeof (attributes.executable) === 'string' ) {
					attributes.executable = libpath.join(path, attributes.executable);
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
					include = libpath.join(libpath.dirname(file), include);
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
				files[i] = libpath.join(directory, files[i]);
			}
			exports.includeActions(files, callback);
		});
	}, function (err) {
		console.log(Object.keys(actions).length + ' actions included');

		// create all data directories and symlinks if they do not exist
		Object.keys(dataDirs).forEach(function (key) {
			var dir = libpath.join(filesRoot, key);
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
	filesRoot = fs.realpathSync(root);
};

ongoingActions = {};


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

function parseParameter (commandLine, parameter, callback) {
	if (parameter.text !== undefined) {
		// parameter is actually a text anchor
		commandLine += parameter.text;
		callback (null, commandLine);
		return;
	} else {
		var parameterValue = parameter.value;
		var numericValue;

		if (parameterValue === undefined) {
			if (parameter.required) {
				callback ("parameter " + parameter.name + " is required!");
				return;
			} else {
				callback(null, commandLine);
				return;
			}
		} else {
			if (parameter.prefix !== undefined) {
				commandLine += parameter.prefix;
			}

			switch (parameter.type) {
			case 'file':
				fs.realpath(libpath.join(filesRoot, parameterValue), function (err, path) {
					if (err) {
						callback (err);
						return;
					}
					commandLine += path + " ";
					callback (null, commandLine);
				});
				break;
			case 'directory':
				fs.realpath(libpath.join(filesRoot, parameterValue), function (err, path) {
					if (err) {
						callback (err);
						return;
					}
					commandLine += path + " ";
					fs.stat(libpath.join(filesRoot, parameterValue), function (err, stats) {
						if (!stats.isDirectory()) {
							callback ("error : " + parameterValue + " is not a directory");
						}
						callback (null, commandLine);
					});
				});
				break;
			case 'string':
				if (parameterValue.indexOf(" ") === -1) {
					commandLine += parameterValue + " ";
					callback (null, commandLine);
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
					callback (validateValue(numericValue, parameter), commandLine);
				}
				break;
			case 'float':
				numericValue = parseFloat(parameterValue, 10);
				if (isNaN(numericValue)) {
					callback ("parameter " + parameter.name + " must be a floating point value");
				}
				else {
					commandLine += parameterValue + " ";
					callback (validateValue(numericValue, parameter), commandLine);
				}
				break;
			case 'text':
			case 'base64data':
				commandLine += parameterValue + " ";
				callback (null, commandLine);
				break;
			default:
				callback ("parameter type not handled : " + parameter.type);
			}
		}
	}
}

function manageActions (POST, callback) {
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

var queue = async.queue(doAction, os.cpus().length);

exports.performAction = function (POST, callback) {
	if (POST.manage) {
		manageActions(POST, callback);
	} else {
		queue.push({POST : POST, callback : callback});
	}
};
function doAction(task, queueCallback) {
	var POST = task.POST;

	function callback (msg) {
		task.callback(msg);
		queueCallback();
	}

	var inputMTime = -1;
	var actionParameters = {};
	var outputDirectory;
	var cachedAction = false;
	var actionHandle = POST.handle || Math.random().toString();

	actionsCounter++;
	var header = "[" + actionsCounter + "] ";

	var response = {handle :actionHandle};

	var action = actions[POST.action];
	if (!action) {
		callback({error : "action " + POST.action + " not found"});
		return;
	};

	var commandLine = (action.attributes.executable ||	action.attributes.command) + ' ';
	var actionCopy = JSON.parse(JSON.stringify(action));

	async.series([

	// first, parse parameters into actionParameters;
	function (callback) {
		actionParameters.action = POST.action;
		actionCopy.parameters.forEach(function (parameter) {
				parameter.value = actionParameters[parameter.name] = POST[parameter.name];
		});

		async.reduce(actionCopy.parameters, commandLine, parseParameter, function(err, cl){
			commandLine = cl;
			callback (err);
		});
	},

	// take into account executable modification time
	function (callback) {
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
	},

	// take into account input files modification time
	function (callback) {
		async.each(actionCopy.parameters, function (parameter, callback) {
			switch (parameter.type) {
			case "file":
			case "directory" : 
				if (parameter.value) {
					fs.stat(libpath.join(filesRoot, parameter.value), function (err, stats) {
						inputMTime = Math.max(stats.mtime.getTime(), inputMTime);
						callback (err);
					});
				} else {
					callback();
				}
				break;
			default : 
				callback();
			}
		}, function (err) {
			callback(err);
		});
	},

	// then handle output directory in outputDirectory
	function (callback) {
		response.MTime = inputMTime;

		if (permissions === 0) {POST.output_directory = "cache/";}
		outputDirectory = POST.output_directory;

		if (action.attributes.voidAction) {
			callback();
			return;
		}

		switch (outputDirectory) {
		case undefined :
			var counterFile = libpath.join(filesRoot, "actions/counter.json");
			fs.readFile(counterFile, function (err, data) {
				var index = 1;
				if (!err) {
					index = JSON.parse(data).value + 1;
				} 
				outputDirectory = libpath.join("actions", index + "");
				fs.mkdir(libpath.join(filesRoot, "actions", index + ""), function (err) {
					if ( err ) {
						callback( err.message );
					} else {
						fs.writeFile(counterFile, JSON.stringify({value : index}), 
							function(err) {
								if (err) {
									callback(err);
								} else {
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
			outputDirectory = libpath.join("cache", shasum.digest('hex'));
			fs.stat(libpath.join(filesRoot, outputDirectory), function (err, stats) {
				if (err) {
					// directory does not exist, create it
					fs.mkdir(libpath.join(filesRoot, outputDirectory), 0777 , function (err) {
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
			exports.validatePath (outputDirectory, callback);
		}
	},

	// log the action and  detect whether the action is already in cache 
	function (callback) {
		actionParameters.output_directory = outputDirectory;
		console.log (header + 'in : ' + outputDirectory);
		if (commandLine.length < 500) {
			console.log (header + commandLine);
		} else {
			console.log (header + commandLine.substr(0,500) + '...[trimmed]');
		}

		if (action.attributes.voidAction || POST.force_update || action.attributes.noCache) {
			callback();
		} else {
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
			response.outputDirectory = outputDirectory + "/";
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

		var commandOptions = {cwd: filesRoot, maxBuffer : 1e10};

		if ((action.attributes.voidAction !== "true" ||	action.attributes.noCache)) {
			commandOptions.cwd = libpath.join(filesRoot, outputDirectory);
			writeJSON = true;
		}

		if (action.attributes.noCache) {
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

		var handle = {POST : JSON.parse(JSON.stringify(POST))};

		var argsArray = commandLine.split(" ");
		var cmd = argsArray[0];
		argsArray.shift();

		var child = handle.childProcess = exec(commandLine, commandOptions, afterExecution);

		ongoingActions[actionHandle] = handle;

		if (outputDirectory) {
			var logStream = fs.createWriteStream(libpath.join(filesRoot, outputDirectory, "action.log"));
			child.stdout.pipe(logStream);
			child.stderr.pipe(logStream);
		}

		function afterExecution(err, stdout, stderr) {
			if (logStream) {
				logStream.end();
			}

			if (POST.stdout) {
				response.stdout = stdout;
				response.stderr = stderr;
			} else {
				response.stdout = 'stdout and stderr not included. Launch action with parameter stdout="true"';
			}

			delete ongoingActions[actionHandle];

			if (err) {
				if (err.killed) {
					response.status = "KILLED";
					callback();
				} else {
					callback(err);
				}
			} else {
				response.status = 'OK (' + (new Date().getTime() - startTime) / 1000 + 's)';
				if (writeJSON) {
					// touch output Directory to avoid automatic deletion
					exec('touch ' + libpath.join(filesRoot, outputDirectory));
					fs.writeFile(libpath.join(filesRoot, outputDirectory, "action.json"),
						JSON.stringify(actionParameters), function (err) {
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
		console.log(header + "done");
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
			var realDir = libpath.join(filesRoot, path);
			fs.readdir(realDir, function (err, files) {
				if (err) {
					callback (err);
					return;
				}

				async.map(files, function (file, callback) {
						fs.stat(libpath.join(realDir, file), function (err, stats) {
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
exports.addDirectory(libpath.join(__dirname,'lib'));

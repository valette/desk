var	async       = require('async'),
	cronJob     = require('cron').CronJob,
	crypto      = require('crypto'),
	exec        = require('child_process').exec,
	fs          = require('fs'),
	libpath     = require('path'),
	mkdirp      = require('mkdirp'),
	ms          = require('ms'),
	os          = require('os'),
	prettyPrint = require('pretty-data').pd,
	winston     = require('winston');

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
		async.eachSeries(files, function (file, callback) {
			var fullFile = libpath.join(cacheDir, file);
			fs.stat(fullFile, function (err, stats) {
				if (!stats.isDirectory()) {
					callback();
					return;
				}
				fs.readdir(fullFile, function (err, files2) {
					async.eachSeries(files2, function (file2, callback2) {
						var fullFile2 = libpath.join(fullFile, file2)
						fs.stat(fullFile2, function (err, stats) {
							if (!stats.isDirectory()) {
								callback();
								return;
							}
							fs.readdir(fullFile2, function (err, files3) {
								async.eachSeries(files3,
									function (file3, callback3) {
										var file4 = libpath.join(file, file2, file3);
										var absoluteFile = libpath.join(cacheDir, file4);
										fs.stat(absoluteFile, function (err, stats) {
											if (!stats.isDirectory()) {
												callback ();
												return;
											}
											var time = stats.mtime.getTime();
											var currentTime = new Date().getTime();
											var age = currentTime - time;
											if (age > maximumCacheAge) {
												console.log('deleting cache ' + file3 + ' (' + ms(age, { long: true }) + ' old)'); 
												exec('rm -rf ' + file4, {cwd : cacheDir}, callback3);
											} else {
												callback3();
											}
										});
									},
								callback2);
							});
						});
					}, callback);
				});
			});
		});
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
			Object.keys(localActions).forEach(function (actionName) {
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

function update (callback) {
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
			callback({});
		}
	});
};

exports.getAction = function (actionName) {
	return JSON.parse(JSON.stringify(actions[actionName]));
};

exports.setRoot = function (root) {
	filesRoot = fs.realpathSync(root);
};

var ongoingActions = {};

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

function manageActions (POST, callback) {
	switch (POST.manage) {
	case 'update':
		update(callback);
		return;
	case "kill" :
		var handle = ongoingActions[POST.actionHandle];
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
		var objString = JSON.stringify({ ongoingActions : ongoingActions},
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

var queue = async.queue(function (task, callback) {
	new RPC(task, callback);
}, os.cpus().length);

exports.performAction = function (POST, callback) {
	POST.handle  = POST.handle || Math.random().toString();
	if (POST.manage) {
		manageActions(POST, finished);
	} else {
		queue.push(POST, finished);
	}

	function finished(msg) {msg.handle = POST.handle;callback(msg);}
};

var actionsDirectoriesQueue = async.queue(function (task, callback) {
	var counterFile = libpath.join(filesRoot, "actions/counter.json");
	fs.readFile(counterFile, function (err, data) {
		var index = 1;
		if (!err) {index = JSON.parse(data).value + 1;} 

		var outputDirectory = libpath.join("actions", index + "");
		mkdirp(libpath.join(filesRoot, outputDirectory), function (err) {
			if ( err ) {
				callback( err.message );
			} else {
				fs.writeFile(counterFile, JSON.stringify({value : index}), 
					function(err) {
						if (err) {
							callback(err);
						} else {
							callback(null, outputDirectory);
						}
					}
				);
			}
		});
	});
}, 1);


function RPC(POST, callback) {
	actionsCounter++;

	this.POST = POST;
	this.inputMTime = -1;
	this.outputDirectory = "";
	this.header = "[" + actionsCounter + "] ";
	this.response = {};
	this.action = actions[POST.action];

	if (!this.action) {
		callback({error : "action " + POST.action + " not found"});
		return;
	};

	this.commandLine = (this.action.attributes.executable ||
		this.action.attributes.command) + ' ';

	async.waterfall([
		this.parseParameters.bind(this),
		this.handleExecutableMTime.bind(this),
		this.handleInputMTimes.bind(this),
		this.handleOutputDirectory.bind(this),
		this.handleLogAndCache.bind(this),
		this.executeAction.bind(this)
		],
		function (err) {
			console.log(this.header + "done");
			if (err) {
				this.response.status = "ERROR";
				this.response.error = err;
			}
			callback(this.response);
		}.bind(this)
	);
};

RPC.prototype.parseParameters = function (callback) {
	async.eachSeries(this.action.parameters, this.parseParameter.bind(this), callback);
};

RPC.prototype.parseParameter = function (parameter, callback) {
	if (parameter.text !== undefined) {
		// parameter is actually a text anchor
		this.commandLine += parameter.text;
		callback();
		return;
	}

	var parameterValue = this.POST[parameter.name];

	if (parameterValue === undefined) {
		if (parameter.required) {
			callback ("parameter " + parameter.name + " is required!");
		} else {
			callback();
		}
		return;
	}

	if (parameter.prefix !== undefined) {
		this.commandLine += parameter.prefix;
	}

	switch (parameter.type) {
	case 'file':
		fs.realpath(libpath.join(filesRoot, parameterValue), function (err, path) {
			if (err) {
				callback (err);
				return;
			}
			this.commandLine += path + " ";
			callback ();
		}.bind(this));
		break;
	case 'directory':
		fs.realpath(libpath.join(filesRoot, parameterValue), function (err, path) {
			if (err) {
				callback (err);
				return;
			}
			this.commandLine += path + " ";
			fs.stat(libpath.join(filesRoot, parameterValue), function (err, stats) {
				if (!stats.isDirectory()) {
					callback ("error : " + parameterValue + " is not a directory");
				}
				callback ();
			});
		}.bind(this));
		break;
	case 'string':
		if (parameterValue.indexOf(" ") === -1) {
			this.commandLine += parameterValue + " ";
			callback ();
		} else {
			callback ("parameter " + parameter.name + " must not contain spaces");
		}
		break;
	case 'int':
		var numericValue = parseInt(parameterValue, 10);
		if (isNaN(numericValue)) {
			callback ("parameter " + parameter.name + " must be an integer value");
		} else {
			this.commandLine += parameterValue + " ";
			callback (validateValue(numericValue, parameter));
		}
		break;
	case 'float':
		numericValue = parseFloat(parameterValue, 10);
		if (isNaN(numericValue)) {
			callback ("parameter " + parameter.name + " must be a floating point value");
		} else {
			this.commandLine += parameterValue + " ";
			callback (validateValue(numericValue, parameter));
		}
		break;
	case 'text':
	case 'base64data':
		this.commandLine += parameterValue + " ";
		callback ();
		break;
	default:
		callback ("parameter type not handled : " + parameter.type);
	}

};

RPC.prototype.handleExecutableMTime = function (callback) {
	this.addMTime(this.action.attributes.executable, callback);
};

RPC.prototype.addMTime = function (file, callback) {
	if (file) {
		fs.stat(file , function (err, stats) {
			this.inputMTime = Math.max(stats.mtime.getTime(), this.inputMTime);
			callback (err);
		}.bind(this));
	} else {
		callback();
	}
}

RPC.prototype.handleInputMTimes = function (callback) {
	async.each(this.action.parameters, function (parameter, callback) {
			switch (parameter.type) {
			case "file":
			case "directory" : 
				this.addMTime(libpath.join(filesRoot, this.POST[parameter.name]), callback);
				break;
			default : 
				callback();
			}
		}.bind(this),
		function (err) {
			callback(err);
		}
	);
};

RPC.prototype.handleOutputDirectory = function (callback) {
	this.response.MTime = this.inputMTime;

	if (permissions === 0) {this.POST.output_directory = "cache/";}
	this.outputDirectory = this.POST.output_directory;

	if (this.action.attributes.voidAction) {
		callback();
		return;
	}

	switch (this.outputDirectory) {
	case undefined :
		actionsDirectoriesQueue.push({}, function (err, dir) {
			this.outputDirectory = dir;
			callback(err);
		}.bind(this));
		break;
	case "cache/" :
		var shasum = crypto.createHash('sha1');
		shasum.update(this.commandLine);
		var hash = shasum.digest('hex');
		this.outputDirectory = libpath.join("cache", hash.charAt(0), hash.charAt(1), hash);
		mkdirp(libpath.join(filesRoot, this.outputDirectory), function (err) {
			callback(err);
		});
		break;
	default :
		exports.validatePath (this.outputDirectory, callback);
	}
};

RPC.prototype.handleLogAndCache = function (callback) {

	var actionParameters = {action : this.POST.action};
	this.action.parameters.forEach(function (parameter) {
		actionParameters[parameter.name] = this.POST[parameter.name];
	}.bind(this));
	actionParameters.output_directory = this.outputDirectory;
	this.parametersString = JSON.stringify(actionParameters);

	console.log (this.header + 'in : ' + this.outputDirectory);

	if (this.commandLine.length < 500) {
		console.log (this.header + this.commandLine);
	} else {
		console.log (this.header + this.commandLine.substr(0,500) + '...[trimmed]');
	}

	if (this.action.attributes.voidAction || this.POST.force_update ||
		this.action.attributes.noCache) {
			callback(null, false);
	} else {
		// check if action was already performed
		var actionFile = libpath.join(filesRoot, this.outputDirectory, "action.json");
		fs.stat(actionFile, function (err, stats) {
			if ((err) || (stats.mtime.getTime() < this.inputMTime)) {
				callback(null, false);
			} else {
				fs.readFile(actionFile, function (err, data) {
					if (data == this.parametersString) {
						console.log(this.header + "cached");
						callback(null, true);
					} else {
						callback(null, false);
					}
				}.bind(this));
			}
		}.bind(this));
	}
};

RPC.prototype.executeAction = function (cached, callback) {
	if (this.action.attributes.voidAction !== "true") {
		this.response.outputDirectory = this.outputDirectory + "/";
	}

	if (cached) {
		this.cacheAction(callback);
		return;
	}

	this.startTime = new Date().getTime();
	this.writeJSON = false;

	var commandOptions = {cwd: filesRoot, maxBuffer : 1e10};

	if ((this.action.attributes.voidAction !== "true" || this.action.attributes.noCache)) {
		commandOptions.cwd = libpath.join(filesRoot, this.outputDirectory);
		this.writeJSON = true;
	}

	if (this.action.attributes.noCache) {
		this.writeJSON = false;
	}

	var after = function (err, stdout, stderr) {
		this.afterExecution(err, stdout, stderr, callback);			
	}.bind(this);

	var js = this.action.attributes.module;
	if ( typeof (js) === "object" ) {
		var actionParameters2 = JSON.parse(this.parametersString);
		actionParameters2.filesRoot = filesRoot;
		actionParameters2.HackActionsHandler = exports;
		js.execute(actionParameters2, after);
		return;
	}

	var handle = {POST : JSON.parse(JSON.stringify(this.POST))};

	var argsArray = this.commandLine.split(" ");
	var cmd = argsArray[0];
	argsArray.shift();

	var child = handle.childProcess = exec(this.commandLine, commandOptions, after);
console.log("launched")
	ongoingActions[this.POST.handle] = handle;

	if (this.outputDirectory) {
		this.logStream = fs.createWriteStream(libpath.join(filesRoot, this.outputDirectory, "action.log"));
		this.logStream2 = fs.createWriteStream(libpath.join(filesRoot, this.outputDirectory, "action.err"));
		child.stdout.pipe(this.logStream);
		child.stderr.pipe(this.logStream2);
	}
};

RPC.prototype.cacheAction = function (callback) {
	this.response.status = 'CACHED';
	async.parallel([
		function (callback) {
			exec('touch ' + libpath.join(filesRoot, this.outputDirectory, "action.json"), callback);
		}.bind(this),

		function (callback) {
			exec('touch ' + libpath.join(filesRoot, this.outputDirectory), callback);
		}.bind(this),

		function (callback) {
			if (this.POST.stdout) {
				async.parallel([function (callback) {
						fs.readFile(libpath.join(filesRoot, this.outputDirectory, 'action.log'),
							function (err, content) {
								if (content) this.response.stdout = content.toString();
								callback();
						}.bind(this));
					}.bind(this),
					function (callback) {
						fs.readFile(libpath.join(filesRoot,this. outputDirectory, 'action.err'),
							function (err, content) {
								if (content) this.response.stderr = content.toString();
								callback();
						}.bind(this));
					}.bind(this)],
				callback);
			} else {
				this.response.stdout = 'stdout and stderr not included. Launch action with parameter stdout="true"';
				callback();
			}
		}.bind(this)
	], callback);
	return;
};

RPC.prototype.afterExecution = function(err, stdout, stderr, callback) {
	if (this.logStream) {
		this.logStream.end();
		this.logStream2.end();
	}

	if (this.POST.stdout) {
		this.response.stdout = stdout;
		this.response.stderr = stderr;
	} else {
		this.response.stdout = 'stdout and stderr not included. Launch action with parameter stdout="true"';
	}

	delete ongoingActions[this.POST.handle];

	if (err) {
		if (err.killed) {
			this.response.status = "KILLED";
			callback();
		} else {
			callback(err);
		}
	} else {
		this.response.status = 'OK (' + (new Date().getTime() - this.startTime) / 1000 + 's)';
		if (this.writeJSON) {
			// touch output Directory to avoid automatic deletion
			exec('touch ' + libpath.join(filesRoot, this.outputDirectory));
			fs.writeFile(libpath.join(filesRoot, this.outputDirectory, "action.json"),
				this.parametersString, function (err) {
					if (err) {throw err;}
					callback();
				}.bind(this));
		} else {
			callback();
		}
	}
}

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

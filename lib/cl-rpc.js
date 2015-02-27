var	async        = require('async'),
	CronJob      = require('cron').CronJob,
	crypto       = require('crypto'),
	exec         = require('child_process').exec,
	EventEmitter = require('events').EventEmitter,
	fs           = require('fs'),
	libpath      = require('path'),
	mkdirp       = require('mkdirp'),
	ms           = require('ms'),
	os           = require('os'),
	prettyPrint  = require('pretty-data').pd,
	_            = require('lodash');

var cacheCleaner = require('./cacheCleaner.js');

// directories where user can add their own .json action definition files
var includeDirectories = [];

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
var maxAge = ms('30d');

// object storing all currently running actions
var ongoingActions = {}; // with 'handle' as index
var ongoingActions2 = {}; // with actionParameters hash as index

// one watcher for each json configuration file or directory
var watchers = [];

exports = module.exports = new EventEmitter();

function myLog(message) {
	exports.emit("log", message);
}

function cleanCache() {
	cacheCleaner.cleanCache(libpath.join(filesRoot, 'cache'), maxAge);
}

var job = new CronJob({
	cronTime: '0 0 ' + Math.floor(5 * Math.random()) + ' * * *',
	onTick: cleanCache,
	start: true
});

exports.validatePath = function (dir, callback) {
	fs.realpath(libpath.join(filesRoot, dir), function (err, realPath) {
		if (!err && !_.some(directories, function (subDir) {
				return realPath.slice(0, subDir.length) === subDir;
			})) {
			err = "path " + dir + " not allowed"; 
		}

		callback (err);
	});
};

includeFile = function (file) {
	if (!fs.existsSync(file)) {
		myLog("Warning : no file " +file + " found");
		return;
	} 
    if (libpath.extname(file).toLowerCase() !== '.json') {
        return;
    }

	myLog('importing ' + file);

	watchers.push(fs.watch(file, update));
	try {
		var lib = libpath.basename(file, '.json');
		var actionsObject = JSON.parse(fs.readFileSync(file));

		var localActions = actionsObject.actions || [];
		var dir = fs.realpathSync(libpath.dirname(file));
		Object.keys(localActions).forEach(function (name) {
			var action = localActions[name];
			action.lib = action.lib || lib;

            // backwards compatibility
            if (action.attributes) {
                Object.keys(action.attributes).forEach(function (key) {
                    action[key] = action.attributes[key];
                });
                delete action.attributes;
            }

			if ( typeof (action.js) === 'string' ) {
				myLog('loaded javascript from ' + action.js);
				action.executable = libpath.join(dir, action.js + '.js');
				action.module = require(libpath.join(dir, action.js));
			} else if ( typeof (action.executable) === 'string' ) {
				if (action.executable.charAt(0) !== '/') {
					action.executable = libpath.join(dir, action.executable);
				}
			}

			if (actions[name]) {
				if (action.priority < actions[name].priority) {
					return;
				}
			}
			actions[name] = action;
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
	    (actionsObject.include || []).forEach(function (include) {
			if (include.charAt(0) !== '/') {
				// the path is relative. Prepend directory
				include = libpath.join(libpath.dirname(file), include);
			}
			includeFile(include);
		});

		if (typeof(actionsObject.permissions) === 'number') {
			permissions = Math.min(permissions, actionsObject.permissions);
		}
	} catch (error) {
		myLog('error importing ' + file);
		myLog(error.toString());
		actions['import_error_' + lib] = {lib : lib};
	}
};

exports.includeDirectory = function (directory) {
	includeDirectories.push(directory);
	if (filesRoot) {
		update();
	}
};

var update = _.throttle(updateSync, 1000, {leading: false});

function updateSync() {
	myLog("updating actions:");
	// clear actions
	actions = {};
	dataDirs = {};
	permissions = 1;
	watchers.forEach(function (watcher) {watcher.close();});
	watchers.length = 0;

	includeDirectories.forEach(function (directory) {
		watchers.push(fs.watch(directory, update));
		fs.readdirSync(directory).forEach(function(file) {
			includeFile(libpath.join(directory, file));
		});
	});
	myLog(Object.keys(actions).length + ' actions included');

	// create all data directories and symlinks if they do not exist
	Object.keys(dataDirs).forEach(function (key) {
		var dir = libpath.join(filesRoot, key);
		var source = dataDirs[key];
		if (source === key) {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir);
				myLog('directory ' + dir + ' created');
			}
		} else {
			if (!fs.existsSync(dir) || !(fs.readlinkSync(dir) === source)) {
                try {
                    fs.unlinkSync(dir);
                    myLog("removed wrong symbolic link " + dir);
                } catch (e) {}

        		if (fs.existsSync(source)) {
					fs.symlinkSync(source, dir, 'dir');
					myLog('directory ' + dir + ' created as a symlink to ' + source);
				} else {
					myLog('ERROR : Cannot create directory ' + dir + ' as source directory ' + source + ' does not exist');
				}
			}
		}
		directories.push(fs.realpathSync(dir));
	});

	// filter actions according to permissions
	actions = _.pick(actions, function(action) {
		var perm = action.permissions;
		if (perm !== 0) {
			perm = 1;
		}
		return permissions >= perm;
	});

	// export filtered actions.json
	fs.writeFileSync(libpath.join(filesRoot, "actions.json"),
		prettyPrint.json({
			actions : actions,
			permissions : permissions,
			dataDirs : dataDirs
		})
	);

	exports.emit("actionsUpdated");
};

exports.getAction = function (actionName) {
	return JSON.parse(JSON.stringify(actions[actionName]));
};

exports.setRoot = function (root) {
	filesRoot = fs.realpathSync(root);
};

function validateValue (value, parameter) {
	['min', 'max'].forEach(function (bound) {
		if (!parameter[bound]) {return;}
		var compare = parseFloat(parameter[bound]);
		if (bound === 'min' ? value > compare : value < compare) {
			return ('error for parameter ' + parameter.name +
				' : ' + bound + ' value is ' + compare)
		}
	});
}

function manageActions (POST, callback) {
	switch (POST.manage) {
	case "kill" :
		var handle = ongoingActions[POST.actionHandle];
		if (!handle) {
			callback ({status : 'not found'});
			return;
		}
		if (handle.childProcess) {
			handle.childProcess.kill();
			myLog('killed process ' + handle.childProcess.pid);
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
		callback(JSON.parse(objString));
		return;
	}	
}

var queue = async.queue(function (task, callback) {
	new RPC(task, callback);
}, os.cpus().length * 2);

exports.performAction = function (POST, callback) {
	POST.handle  = POST.handle || Math.random().toString();
	if (POST.manage) {
		manageActions(POST, finished);
	} else {
		queue.push(POST, finished);
	}

	function finished(msg) {
		msg.handle = POST.handle;
		callback(msg);
	}
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
				return;
			}
			fs.writeFile(counterFile, JSON.stringify({value : index}), 
				function(err) {
					if (err) {
						callback(err);
						return;
					}
					callback(null, outputDirectory);
				}
			);
		});
	});
}, 1);

function RPC(POST, callback) {
	this.id = actionsCounter++;

	this.POST = POST;
	this.inputMTime = -1;

	var header = "[" + this.id + "] ";
	this.log = function (msg) {myLog(header + msg)};

	this.response = {};
	this.action = actions[POST.action];
	this.cached = false;

	if (!this.action) {
		callback({error : "action " + POST.action + " not found"});
		return;
	};

	this.commandLine = "nice " + (this.action.executable || this.action.command);
	this.log("handle : " + this.POST.handle);

	// array used to store concurrent similar actions
	this.similarActions = [];

	async.series([
		this.parseParameters.bind(this),
		this.handleExecutableMTime.bind(this),
		this.handleInputMTimes.bind(this),
		this.handleOutputDirectory.bind(this),
		this.handleLogAndCache.bind(this),
		this.executeAction.bind(this)
		],
		function (err) {
			if (err) {
				this.response.status = "ERROR";
				this.response.error = err;
				this.log("error for:");
				this.log(this.commandLine);
				this.log(err);
			} else {
				this.log("done");
			}
			callback(this.response);
		}.bind(this)
	);
};

RPC.prototype.parseParameters = function (callback) {
	async.map(this.action.parameters, this.parseParameter.bind(this), function (err, params) {
		params.forEach(function (param) {
			if (typeof param === "string") {
				this.commandLine += ' '+ param;
			}
		}.bind(this));
		callback (err);
	}.bind(this));
};

RPC.prototype.parseParameter = function (parameter, cb) {

	function callback (err, value) {
		if (err) {
			err = "error for parameter " + parameter.name + " : " + err;
		}
		cb (err, value);
	}

	if (parameter.text !== undefined) {
		// parameter is actually a text anchor
		callback(null, parameter.text);
		return;
	}

	var prefix = parameter.prefix || '';
	var value = this.POST[parameter.name];

	if (value === undefined || value === null) {
		if (parameter.required) {
			callback ("parameter " + parameter.name + " is required!");
		} else {
			callback();
		}
		return;
	}

	switch (parameter.type) {
	case 'file':
		fs.realpath(libpath.join(filesRoot, value), function (err, path) {
			callback (err, err ? null : prefix + path.split(" ").join("\\ "));
		});
		break;
	case 'directory':
		fs.realpath(libpath.join(filesRoot, value), function (err, path) {
			if (err) {
				callback (err);
				return;
			}
			fs.stat(libpath.join(filesRoot, value), function (err, stats) {
				if (!stats.isDirectory()) {
					callback ("error : " + value + " is not a directory");
					return;
				}
				callback (null, prefix + path.split(" ").join("\\ "));
			});
		});
		break;
	case 'string':
		if (value.indexOf(" ") === -1) {
			callback (null, prefix + value);
		} else {
			callback ("parameter " + parameter.name + " must not contain spaces");
		}
		break;
	case 'int':
		var number = parseInt(value, 10);
		if (isNaN(number)) {
			callback ("parameter " + parameter.name + " must be an integer value");
		} else {
			callback (validateValue(number, parameter), prefix + value);
		}
		break;
	case 'float':
		number = parseFloat(value, 10);
		if (isNaN(number)) {
			callback ("parameter " + parameter.name + " must be a floating point value");
		} else {
			callback (validateValue(number, parameter), prefix + value);
		}
		break;
	case 'text':
	case 'base64data':
		callback (null, prefix + value);
		break;
	default:
		callback ("parameter type not handled : " + parameter.type);
	}

};

RPC.prototype.handleExecutableMTime = function (callback) {
	this.addMTime(this.action.executable, callback);
};

RPC.prototype.addMTime = function (file, callback) {
	if (!file) {
		callback();
		return;
	}
	fs.stat(file , function (err, stats) {
		if (!err) {
			this.inputMTime = Math.max(stats.mtime.getTime(), this.inputMTime);
		}
		callback (err);
	}.bind(this));
}

RPC.prototype.handleInputMTimes = function (callback) {
	async.each(this.action.parameters, function (parameter, callback) {
		if (this.POST[parameter.name] === undefined) {
			callback();
			return;
		}
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
	if (permissions === 0) {this.POST.output_directory = "cache/";}

	this.response.MTime = this.inputMTime;
	this.outputDirectory = this.POST.output_directory || "";

	if (this.action.voidAction) {
		callback();
		return;
	}

	switch (this.outputDirectory) {
	case "actions/" :
		actionsDirectoriesQueue.push({}, function (err, dir) {
			this.outputDirectory = dir;
			callback(err);
		}.bind(this));
		break;
	case "cache/" :
	case "" : 
		var shasum = crypto.createHash('sha1');
		shasum.update(this.commandLine);
		var hash = shasum.digest('hex');
		this.outputDirectory = libpath.join("cache", hash.charAt(0), hash.charAt(1), hash);
		mkdirp(libpath.join(filesRoot, this.outputDirectory), callback);
		break;
	default :
		exports.validatePath (libpath.normalize(this.outputDirectory).split("/")[0], function (err) {
			if (err) {
				callback(err);
				return;
			}
			mkdirp(libpath.join(filesRoot, this.outputDirectory), callback);
		}.bind(this));
	}
};

RPC.prototype.handleLogAndCache = function (callback) {
	this.outputDirectory = libpath.normalize(this.outputDirectory);
	if (this.outputDirectory.charAt(this.outputDirectory.length -1) !== "/") {
		this.outputDirectory += "/";
	}

	this.response.outputDirectory = this.outputDirectory;

	var params = {action : this.POST.action, output_directory :  this.outputDirectory};
	this.action.parameters.forEach(function (parameter) {
		params[parameter.name] = this.POST[parameter.name];
	}, this);
	this.parametersString = JSON.stringify(params);

	this.log ('in : ' + this.outputDirectory);

	if (this.commandLine.length < 500) {
		this.log(this.commandLine);
	} else {
		this.log(this.commandLine.substr(0,500) + '...[trimmed]');
	}

	if (this.action.voidAction || this.POST.force_update ||
		this.action.noCache) {
			callback();
			return;
	}

	// check if action was already performed
	var actionFile = libpath.join(filesRoot, this.outputDirectory, "action.json");
	fs.stat(actionFile, function (err, stats) {
		if ((err) || (stats.mtime.getTime() < this.inputMTime)) {
			callback();
			return;
		}
		fs.readFile(actionFile, function (err, data) {
			if (data == this.parametersString) {
				this.log("cached");
				this.cached = true;
			} 
			callback();
		}.bind(this));
	}.bind(this));

};

RPC.prototype.executeAction = function (callback) {
	if (this.cached) {
		this.cacheAction(callback);
		return;
	}

	this.startTime = new Date().getTime();
	this.writeJSON = false;

	var commandOptions = {cwd: libpath.join(filesRoot, this.outputDirectory), maxBuffer : 1e10};

	if (!this.action.voidAction) {
		this.writeJSON = true;
	}

	var after = function (err, stdout, stderr) {
		this.afterExecution(err, stdout, stderr, callback);
		delete ongoingActions2[hash];
		this.similarActions.forEach(function (opts) {
			opts.RPC.afterExecution(err, stdout, stderr, opts.callback);
			this.log("triggering completion for same action [" + opts.RPC.id + "]");
		}.bind(this));
	}.bind(this);

	var shasum = crypto.createHash('sha1');
	shasum.update(this.parametersString + this.outputDirectory);
	var hash = shasum.digest('hex');
	var opts = {
		POST : JSON.parse(JSON.stringify(this.POST)),
		RPC : this,
		callback : callback
	};

	ongoingActions[this.POST.handle] = opts;

	var existingOpts = ongoingActions2[hash];
	if (existingOpts) {
		opts.childProcess = existingOpts.childProcess;
		existingOpts.RPC.similarActions.push(opts);
		this.log("same as action [" + existingOpts.RPC.id + "], wait for its completion");
		return;
	}

	var js = this.action.module;
	if ( typeof (js) === "object" ) {
		var actionParameters2 = JSON.parse(this.parametersString);
		actionParameters2.filesRoot = filesRoot;
		actionParameters2.HackActionsHandler = exports;
		js.execute(actionParameters2, after);
		return;
	}

	var child = opts.childProcess = exec(this.commandLine, commandOptions, after);
	ongoingActions2[hash] = opts;

	if (this.outputDirectory) {
		this.logStream = fs.createWriteStream(libpath.join(filesRoot, this.outputDirectory, "action.log"));
		this.logStream2 = fs.createWriteStream(libpath.join(filesRoot, this.outputDirectory, "action.err"));
		child.stdout.pipe(this.logStream);
		child.stderr.pipe(this.logStream2);
	}
};

RPC.prototype.cacheAction = function (callback) {
	this.response.status = 'CACHED';
	var now = new Date();

	async.parallel([

		function (callback) {
			fs.utimes(libpath.join(filesRoot, this.outputDirectory, "action.json"), now, now, callback);
		}.bind(this),

		function (callback) {
			fs.utimes(libpath.join(filesRoot, this.outputDirectory), now, now, callback);
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
				this.response.stdout = 'stdout and stderr not included. Launch action with parameter stdout=true';
				callback();
			}
		}.bind(this)
	], callback);
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
		this.response.stdout = 'stdout and stderr not included. Launch action with parameter stdout=true';
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
		if (!this.writeJSON) {
			callback();
			return;
		}
		// touch output Directory to avoid automatic deletion
		var now = new Date();
		fs.utimes(libpath.join(filesRoot, this.outputDirectory), now, now);

		fs.writeFile(libpath.join(filesRoot, this.outputDirectory, "action.json"),
			this.parametersString, function (err) {
			if (err) {throw err;}
			callback();
		}.bind(this));
	}
}

exports.includeDirectory(libpath.join(__dirname,'includes'));

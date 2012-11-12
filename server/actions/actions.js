var fs          = require('fs'),
	libpath     = require('path'),
	async       = require('async'),
	crypto      = require('crypto'),
	exec        = require('child_process').exec,
	prettyPrint = require('pretty-data').pd,
	//~ winston     = require('winston'),
	winston     = require('winston');
	//~ cronJob     = require('cron').CronJob;

var console = {
	log : function (text) {
		winston.log ('info', text);
	}
};

// directory where user can add their own .json action definition files
var actionsDirectories = [];

// array storing all the actions
var actions;

// base directory where all data files are (data, cache, actions, ..)
var filesRoot;

// allowed sub-directories in filesRoot. They are automatically created if not existent
var directories = [];

// last allowed directory : the /public path
var publicPath = '/public'

// variable to enumerate actions for logging
var actionsCounter = 0;

//30 days of maximum life time for cache folders
var millisecondsInADay = 24 * 60 * 60 * 1000;
var maximumCacheAge = 30 * millisecondsInADay;

function cleanCache() {
	console.log('Starting cache cleaning (delete folders older than ' +
		+ Math.floor(maximumCacheAge / millisecondsInADay) + ' days)'); 

	var cacheDir = filesRoot + 'cache/';
	if (!fs.existsSync(cacheDir)) {
		winston.log ('error' , 'wrong cache directory :' + cacheDir);
		return;
	}

	fs.readdir(cacheDir, function (err, files) {
		async.forEachSeries(files,
			function (file, callback) {
				fs.stat( cacheDir + file, function (err, stats) {
					if (err) {
						callback (err);
					}
					var time=stats.mtime.getTime();
					var currentTime = new Date().getTime();
					var age = currentTime - time;
					if (age > maximumCacheAge) {
						days = Math.floor(age / millisecondsInADay);
						console.log('deleting cache ' + file + ' (' + days + ' days old)'); 
						exec('rm -rf ' + file, {cwd : cacheDir}, callback);
					}
					else {
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

//~ var job = new cronJob({
	//~ cronTime: '* * ' + Math.floor(24 * Math.random()) + ' * * *',
	//~ onTick: cleanCache,
	//~ start: true
//~ });

exports.validatePath = function (path, callback) {
	fs.realpath(filesRoot + path, function (err, realPath) {
		if (err) {
			callback(err.message);
			return;
		}
		else {
			for (var i = 0; i != directories.length; i++) {
				var subDir = directories[i];
				if (realPath.slice(0, subDir.length) == subDir) {
					callback (null);
					return;
				}
			}
			callback("path " + realPath + " not allowed");
		}
	});
}

function includeActionsFile (file, callback) {
	fs.exists(file, function (exists) {
		if (exists) {
			switch (libpath.extname(file).toLowerCase()) {
			case ".json":
				includeActionsJSON(file, afterImport);
				break;
			default:
		//		console.log("*: "+file+": format not handled");
				callback(null);
			}

			function afterImport (data) {
				actions = actions.concat(data)
				console.log(data.length+'/'+actions.length+' actions from '+file);
				callback(null);
			}
		}
		else {
			console.log("Warning : no file "+file+" found");
			callback(null);
		}
	});
}

exports.includeActions=function (file, callback) {
	switch (typeof (file))
	{
	case "string" :
		includeActionsFile(file, afterImport);
		break;
	case "object" :
		async.forEachSeries(file, includeActionsFile, afterImport);
		break;
	default:
		callback ("error in actions importations: cannot handle "+file);
		afterImport();
	}

	function afterImport() {
		//~ exportActions( filesRoot+"/actions.json", callback );
		exportActions( filesRoot+"actions.json", callback );
	}
}

includeActionsJSON = function (file, callback) {
	fs.readFile(file, function (err, data) {
		var actionsObject = JSON.parse(data);
		var localActions = actionsObject.actions || [];
		var path = fs.realpathSync(libpath.dirname(file));
		var libraryName = libpath.basename(file, '.json');
		for (var i = 0; i < localActions.length; i++) {
			localActions[i].lib = libraryName;
			var attributes = localActions[i].attributes;
			if ( typeof (attributes.js) === 'string' ) {
				console.log('loaded javascript from ' + attributes.js);
				attributes.executable = path + '/' + attributes.js + '.js';
				attributes.module = require(path + '/' + attributes.js);
				attributes.path = path;
			}
			else if ( typeof (attributes.executable) === 'string' ) {
				attributes.executable = path + '/' + attributes.executable;
				attributes.path = path;
			}
			else if ( typeof (attributes.command) === 'string' ) {
				attributes.executable = attributes.command;
			}
		}
		var includes = actionsObject.include || [];
		exports.includeActions(includes, function () {
			if ( typeof(callback) === 'function' ) {
				callback(localActions);
			}
		});
	});
}

function exportActions( file, callback ) {
//	console.log("saving actions.json to "+file);
	fs.writeFile(file, prettyPrint.json(JSON.stringify({ actions : actions , permissions : 1})),
		function (err) {
			if (err) throw err;
			if (typeof callback === "function") {
				callback();
			}
	});
}

exports.addDirectory = function (directory) {
	actionsDirectories.push(directory);
}

exports.update = function (callback) {
	// clear actions
	actions = [];
	async.forEach(actionsDirectories, function (directory, callback) {
		fs.readdir(directory, function (err, files) {
			for (var i = 0; i < files.length; i++) {
				files[i] = directory + files[i];
			}
			exports.includeActions(files, callback);
		});
	}, callback);
}

exports.getAction = function (actionName) {
	for (var i = 0; i != actions.length; i++) {
		var action = actions[i];
		if (action.name === actionName) {
			return JSON.parse(JSON.stringify(action));
		}
	}
}

exports.setRoot = function (root) {
	filesRoot = fs.realpathSync(root) + '/';

	function getSubdir(subdir) {
		var dir = filesRoot + subdir;
		if (!fs.existsSync(dir)) {
			console.log('Warning : directory ' + dir + ' does not exist. Creating it');
			fs.mkdirSync(dir);
		}
		return (fs.realpathSync(dir));
	}

	directories.push(getSubdir('data'));
	directories.push(getSubdir('cache'));
	directories.push(getSubdir('actions'));
	directories.push(getSubdir('code'));
	directories.push('/public/');

	cleanCache();
};

exports.performAction = function (POST, callback) {
	var action;
	var commandLine = '';
	var inputMTime = -1;
	var actionParameters = {};
	var outputDirectory;
	var cachedAction = false;

	actionsCounter++;
	var header = "[" + actionsCounter + "] ";

	async.series([

	// first, parse parameters into actionParameters;
	function (callback) {
		var i;
		var actionName = POST.action;
		actionParameters.action = actionName;

		for (i = 0; i < actions.length; i++) {
			action = actions[i];
			if (action.name == actionName) {
				break;
			}
		}

		if (i >= actions.length) {
			callback("action "+actionName+" not found");
			return;
		}

		commandLine += action.attributes.executable + ' ';

		function parseParameter (parameter, callback) {
			if (parameter.text !== undefined) {
				// parameter is actually a text anchor
				commandLine += parameter.text;
				callback (null);
				return;
			}
			else {
				var parameterValue = POST[parameter.name];

				actionParameters[parameter.name] = parameterValue;

				if (parameterValue === undefined){
					if (parameter.required === "true") {
						callback ("parameter " + parameter.name + " is required!");
						return;
					} else {
						callback(null);
						return;
					}
				}
				else {
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
								var time = stats.mtime.getTime();
								if (time > inputMTime) {
									inputMTime = time;
								}
								callback (null);
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
								var time = stats.mtime.getTime();
								if (time > inputMTime) {
									inputMTime = time;
								}
								if (!stats.isDirectory()) {
									callback ("error : " + parameterValue + " is not a directory");
								}
								callback (null);
							});
						});
						break;
					case 'string':
						if (parameterValue.indexOf(" ") === -1) {
							commandLine += parameterValue + " ";
							callback (null);
						}
						else {
							callback ("parameter " + parameter.name + " must not contain spaces");
						}
						break;
					case 'int':
						if (isNaN(parseInt(parameterValue))) {
							callback ("parameter " + parameter.name + " must be an integer value");
						}
						else {
							commandLine += parameterValue + " ";
							callback (null);
						}
						break;
					case 'float':
						if (isNaN(parseFloat(parameterValue))) {
							callback ("parameter " + parameter.name + " must be a floating point value");
						}
						else {
							commandLine += parameterValue + " ";
							callback (null);
						}
						break;
					case 'text':
					case 'base64data':
						commandLine += parameterValue + " ";
						callback (null);
						break;
					default:
						callback ("parameter type not handled : " + parameter.type);
					}
				}
			}
		}

		var parameters = action.parameters;

		async.forEachSeries(parameters, parseParameter, function(err){
			callback (err);
		});
	},

	// then handle output directory in outputDirectory
	function (callback) {

		outputDirectory = POST.output_directory;
		actionParameters.output_directory = outputDirectory;

		if (action.attributes.voidAction === "true") {
			callback(null);
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
					}
					else {
						fs.writeFile(counterFile, JSON.stringify({value : index}), 
							function(err) {
								if (err) {
									callback( err );
								}
								else {
									callback( null );
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
					fs.mkdir(filesRoot + outputDirectory,0777 , function (err) {
						if (err) {
							callback(err.message);
						}
						else {
							callback (null);
						}
					});
					return;
				}
				else {
					callback (null);
				}
			})
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
		console.log (header + commandLine);

		if ((action.attributes.voidAction === "true")||(POST.force_update === "true")){
			callback();
		}
		else {
			// check if action was already performed
			var actionFile = filesRoot + outputDirectory + "/action.json";
			fs.stat(actionFile, function (err, stats) {
				if ((err)||(stats.mtime.getTime() < inputMTime)) {
					callback();
				}
				else {
					fs.readFile(actionFile, function (err, data) {
						if (data == JSON.stringify(actionParameters)) {
					  		console.log(header + "cached");
					  		cachedAction = true;
							callback();
						}
						else {
							callback();
						}
					});
			  	}
			});
		}
	},

	// execute the action (or not when it is cached)
	function (callback) {
		if (cachedAction) {
			fs.readFile(filesRoot + outputDirectory + '/action.log', function (err, string) {
				callback (outputDirectory + '\n' + string + '\nCACHED\n')
			});
			return;
		}

		var startTime=new Date().getTime();

		var js = action.attributes.module;
		if ( typeof (js) === "object" ) {
			var actionParameters2 = JSON.parse(JSON.stringify(actionParameters));
			actionParameters2.filesRoot = filesRoot;
			actionParameters2.HackActionsHandler = exports;
			js.execute(actionParameters2, afterExecution);
			return;
		}

		var commandOptions = { cwd:filesRoot , maxBuffer: 1024*1024};
		if ((action.attributes.voidAction !== "true") || (action.name == "add_subdirectory")) {
			commandOptions.cwd += outputDirectory;
		}

		exec(commandLine + " | tee action.log", commandOptions, afterExecution);

		function afterExecution(err, stdout, stderr) {
			if (err) {
				callback (err.message);
			}
			else {
				if (action.attributes.voidAction === "true") {
					callback ("void\n" + stdout + "\nOK (" + (new Date().getTime() - startTime) / 1000 + "s)\n");
					return;
				}

				var string = JSON.stringify(actionParameters);
				fs.writeFile(filesRoot + outputDirectory + "/action.json", string, function (err) {
					if (err) throw err;
					callback (outputDirectory + "\n" + stdout + "\nOK (" + (new Date().getTime() - startTime) / 1000 + "s)\n");
				});
			}
		}
	}],
	
	callback);
}

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

				var realFiles = [];
				for (var i = 0; i != files.length; i++) {
					realFiles.push(realDir + files[i]);
				}

				async.map(realFiles, fs.stat, function(err, results){
					for (var i = 0; i != files.length; i++) {
						results[i].name = files[i];
					}
					callback (err, results);
				});
			});
		},

		function (files, callback) {
			for (var i = 0; i != files.length; i++) {
				var file = files[i];
				file.isDirectory = file.isDirectory();
				file.mtime = file.mtime.getTime();
			}
			callback(null, JSON.stringify(files));
		}],
		function (error, message) {
			callback(message);
		}
	);
}

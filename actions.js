var fs = require('fs'),
	libpath = require('path'),
	async = require('async'),
	crypto = require('crypto'),
	exec = require('child_process').exec,
	prettyPrint = require('pretty-data').pd;
	
var dataRoot;
var actions=[];

function includeActionsFile (file, callback) {
	libpath.exists(file, function (exists) {
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
				actions=actions.concat(data)
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
		includeActionsFile(file, callback);
		break;
	case "object" :
		async.forEachSeries(file, includeActionsFile, callback);
		break;
	default:
		callback ("error in actions importations: cannot handle "+file);
		afterImport();
	}

	function afterImport() {
		exportActions( "actions.json", callback );
	}
}

includeActionsJSON= function (file, callback) {
	fs.readFile(file, function (err, data) {
		var actionsObject=JSON.parse(data);
		var localActions=actionsObject.actions || [];

		var path=fs.realpathSync(libpath.dirname(file));
		for (var i=0; i<localActions.length;i++) {
			var attributes=localActions[i].attributes;
			if ( typeof (attributes.js) === "string" ) {
				console.log("loaded javascript from "+attributes.js);
				attributes.js=require(path+"/"+attributes.js);
			}
			if ( typeof (attributes.executable) === "string" ) {
				attributes.executable=path+"/"+attributes.executable;
			}
		}
		var includes=actionsObject.includes || [];
		exports.includeActions( includes, function () {
			if ( typeof(callback) === "function" ) {
				callback(localActions);
			}
		});
	});
}

function exportActions( file, callback ) {
	fs.writeFile(file, pd.json(JSON.stringify(actions)), function (err) {
		if (err) throw err;
		if (typeof callback === "function") {
			callback();
		}
	});
}

exports.setupActions=function (root, callback) {
	dataRoot=root;
	fs.readdir("actions", function (err, files) {
		for (var i=0;i<files.length;i++) {
			files[i]="actions/"+files[i];
		}
		exports.includeActions(files, callback);
	});
};

exports.performAction= function (POST, callback) {

	var action;
	var commandLine="ulimit -v 12000000; nice ";

	var inputMTime=-1;

	var actionParameters={};

	function parseParameters (callback) {
		var i;
		var actionName=POST.action;
		actionParameters.action=actionName;

		for (i=0;i<actions.length;i++) {
			action=actions[i];
			if (action.name==actionName) {
				break;
			}
		}

		if (i>=actions.length) {
			callback("action "+actionName+" not found");
			return;
		}

		commandLine+=action.attributes.executable+" ";

		function parseParameter (parameter, callback) {
			if (parameter.text!==undefined) {
				// parameter is actually a text anchor
				commandline+=parameter.text;
				callback (null);
				return;
			}
			else {
				var parameterValue=POST[parameter.name];

				actionParameters[parameter.name]=parameterValue;

				if (parameterValue===undefined){
					if (parameter.required==="true") {
						callback ("parameter "+parameter.name+" is required!");
						return;
					} else {
						callback(null);
						return;
					}
				}
				else {
				//	console.log ("parameter : "+parameter.name+"="+parameterValue);
					switch (parameter.type)
					{
					case 'file':
						fs.realpath(dataRoot+parameterValue, function (err, path) {
							if (err) {
								callback (err);
								return;
							}
							commandLine+=path+" ";
							fs.stat(dataRoot+parameterValue, function (err, stats) {
								var time=stats.mtime.getTime();
								if (time>inputMTime) {
									inputMTime=time;
								}
								callback (null);
							});
						});
						break;
					case 'int':
					case 'text':
						if (parameter.prefix!==undefined) {
							commandLine+=parameter.prefix;
						}
						commandLine+=parameterValue+" ";
						callback (null);
						break;
					default:
						callback ("parameter type not handled : "+parameter.type);
					}
				}
			}
		}

		var parameters=action.parameters;

		async.forEachSeries(parameters, parseParameter, function(err){
			callback (null);
		});
	}


	parseParameters( function (err) {
		if (err) {
			callback (err);
		}

		var outputDirectory;
		var cachedAction=false;

		function handleOutputDirectory(callback) {
			if (action.attributes.void==="true") {
				callback(null);
			}

			outputDirectory=POST.output_directory;
			actionParameters.output_directory=outputDirectory;
			switch (outputDirectory) 
			{
			case "undefined" :
			// TODO create actions directory 
				callback ("TODO : create directory in actions");
				break;
			case "cache/" :
				var shasum = crypto.createHash('sha1');
				shasum.update(commandLine);
				outputDirectory="cache/"+shasum.digest('hex')+"/";
				fs.stat(dataRoot+outputDirectory, function (err, stats) {
					if (err) {
						// directory does not exist, create it
						fs.mkdir(dataRoot+outputDirectory,0777 , function (err) {
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
				callback ("error output directory!");
			}
		}

		function executeAction (callback) {
			var startTime=new Date().getTime();

			var js=action.attributes.js;
			if ( typeof (js) === "object" ) {
				var actionParameters2 = JSON.parse(JSON.stringify(actionParameters));
				actionParameters2.dataRoot=dataRoot;
				js.execute(actionParameters2, afterExecution);
				return;
			}

			exec(commandLine+" | tee action.log", {cwd : dataRoot+outputDirectory}, afterExecution);

			function afterExecution(err, stdout, stderr) {
				if (err) {
					callback (err.message);
				}
				else {
					var string=JSON.stringify(actionParameters);
					fs.writeFile(dataRoot+outputDirectory+"action.json", string, function (err) {
						if (err) throw err;
						callback (outputDirectory+"\n"+stdout+"\nOK ("+(new Date().getTime()-startTime)/1000+"s)\n");
					});
				}
			}

		}

		handleOutputDirectory(function (err) {
			if (err) {
				callback (err);
				return;
			}

			console.log("command line : "+commandLine);
			console.log("output directory : "+dataRoot+outputDirectory);

			actionParameters.output_directory=outputDirectory;

			if ((action.attributes.void==="true")||(POST.force_update==="true")){
				executeAction(callback);
			}
			else {
				// check if action was already performed
				var actionFile=dataRoot+outputDirectory+"/action.json";
				fs.stat(actionFile, function (err, stats) {
					if ((err)||(stats.mtime.getTime()<inputMTime)) {
						executeAction(callback);
					}
					else {
						fs.readFile(actionFile, function (err, data) {
							if (data==JSON.stringify(actionParameters)) {
						  		console.log("cached");
						  		fs.readFile(dataRoot+outputDirectory+"/action.log", function (err, string) {
								//	if (err) throw err;
									callback (outputDirectory+"\n"+string+"\nCACHED\n")
								});
							}
							else {
								executeAction(callback);
							}
						});
				  	}
				});
			}
		})
	});
}

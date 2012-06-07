var fs = require('fs'),
	async = require('async'),
	libxmljs = require("libxmljs"),
	crypto = require('crypto'),
	exec = require('child_process').exec;

var dataRoot;
var actions=[];

exports.setupActions=function (file, root, callback) {
	dataRoot=root;
	fs.readFile(file, function (err, data) {
		if (err) throw err;
		console.log("read : "+file);
		var xmlDoc = libxmljs.parseXmlString(data.toString());

		var elements=xmlDoc.root().childNodes();

		var numberOfActions=0;
		for (var i=0;i!=elements.length;i++) {
			var action={parameters : []};
			var element=elements[i];
			if (element.name()=='action') {
				action.name=element.attr('name').value();
		//		console.log("action : "+action.name);
		//		console.log("attributes : ");
				var attributes=element.attrs();
				var actionAttributes={};
				for (var k=0;k!=attributes.length;k++) {
					var attribute=attributes[k];
					actionAttributes[attribute.name()]=attribute.value();
				}
				action.attributes=actionAttributes;
		//		console.log(actionAttributes);
				numberOfActions++;

				var parameters=element.childNodes();
		//		console.log("parameters : ");
				for (var j=0;j<parameters.length;j++) {
					var parameter=parameters[j];
					switch (parameter.name())
					{
						case "parameter":
						case "anchor":
							var attributes=parameter.attrs();
							var parameterAttributes={};
							for (var k=0;k!=attributes.length;k++) {
								var attribute=attributes[k];
								parameterAttributes[attribute.name()]=attribute.value();
							}
		//					console.log(parameterAttributes);
							action.parameters.push(parameterAttributes);
							break;
						default:
					}
				}
				actions.push(action);
		//		console.log("************************");
			}
		}
		console.log(numberOfActions+" actions registered");
		callback ();
	//	console.log(actions);
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
			var child = exec(commandLine+" | tee action.log", {cwd : dataRoot+outputDirectory}, function(err, stdout, stderr) {
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
			});
		}

		handleOutputDirectory(function (err) {
			if (err) {
				callback (err);
				return;
			}

			console.log("command line : "+commandLine);
			console.log("output directory : "+dataRoot+outputDirectory);

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
									if (err) throw err;
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

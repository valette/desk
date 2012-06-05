var libpath = require('path'),
    http = require("http"),
    fs = require('fs'),
    url = require("url"),
    mime = require('mime'),
    qs = require('querystring'),
	async = require('async'),
	libxmljs = require("libxmljs"),
	crypto = require('crypto');

var path = "trunk/";
var dataRoot=path+"ext/php/";
var port = 1337;


var actions=[];

var setupActions=function (file, callback) {
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



function performAction(POST, callback) {

	var action;
	var commandLine="";
	var outputMtime;

	function parseParameters (callback) {
		var i;
		var actionName=POST.action;

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

		commandLine+="ulimit -v 12000000; nice "+action.attributes.executable+" ";

		function parseParameter (parameter, callback) {
			if (parameter.text!==undefined) {
				// parameter is actually a text anchor
				commandline+=parameter.text;
				callback (false);
				return;
			}
			else {
				var parameterValue=POST[parameter.name];
				if (parameterValue===undefined){
					if (parameter.required==="true") {
						callback ("parameter "+parameter.name+" is required!");
						return;
					} else {
						callback(false);
						return;
					}
				}
				else {
					switch (parameter.type)
					{
					case 'file':
						fs.realpath(dataRoot+parameterValue, function (err, path) {
							if (err) {
								callback (err);
								return;
							}
							commandLine+=path+" ";
							callback (false);
						});
						break;
					case 'int':
					case 'text':
						console.log ("parameter : "+parameter.name+"="+parameterValue);
						if (parameter.prefix!==undefined) {
							commandLine+=parameter.prefix;
						}
						commandLine+=parameterValue+" ";
						callback (false);
						break;
					default:
						callback ("parameter type not handled : "+parameter.type);
					}
				}
			}
		}

		var parameters=action.parameters;

		async.forEachSeries(parameters, parseParameter, function(err, results){
			callback (false, commandLine);
		});
	}


	parseParameters( function (err) {
		if (err) {
			callback (err);
		}
		console.log("command line : "+commandLine);

		var voidAction=false;
		if (action.attributes.void==="true") {
			voidAction=true;
		}

		var outputDirectory;

		function handleOutputDirectory(callback) {
			outputDirectory=POST.output_directory;
			switch (outputDirectory) 
			{
			case "undefined" :
			// TODO create actions directory 
				callback ("TODO : create directory in actions");
				break;
			case "cache/" :
				var shasum = crypto.createHash('sha1');
				shasum.update(commandLine);
				outputDirectory=dataRoot+"cache/"+shasum.digest('hex');
			//	console.log("new output directory : "+outputDirectory);
				fs.stat(outputDirectory, function (err, stats) {
					if (err) {
						// directory does not exist, create it
						fs.mkdir(outputDirectory,0777 , function (err) {
							outputMtime=-1;
							callback (false);
						});
						return;
					}
					else {
						outputMtime=stats.mtime.getTime();
						callback (false);
					}
				})
				break;
			default :
				callback ("error output directory!");
			}
		}

		handleOutputDirectory(function (err) {
			if (err) {
				callback (err);
				return;
			}
		//	console.log(outputMtime);
		})

		callback("action not finished...");
	});
}


function createServer() {
	http.createServer(function (request, response) {

		var uri = url.parse(request.url).pathname;
		var filename = libpath.join(path, uri);


		function getDirectory (dir, callback) {
			var realFiles=[];

			fs.readdir(dir, function (err, files) {
				if (err) {
					callback (err);
					return;
				}
		
				for (var i=0;i!=files.length;i++) {
					realFiles.push(dir+"/"+files[i]);
				}

				async.map(realFiles, fs.stat, function(err, results){
					for (var i=0;i!=files.length;i++) {
						results[i].name=files[i];
					}
					callback (err, results);
				});
			});
		}

		if (request.method == 'POST') {
		    var body = '';
		    request.on('data', function (data) {
		        body += data;
		    });
		    request.on('end', function () {
		        var POST = qs.parse(body);

				var filename = libpath.join(path, uri);
			//	console.log(uri)
				switch (uri) 
				{
				case "/ext/php/listDir.php":
				//	console.log("listDir");
					getDirectory(dataRoot+POST.dir, function (err, files) {
						if (err) {
							response.writeHead(500, {
							  "Content-Type": "text/plain"
							});
							response.write(err + "\n");
							response.end();
							return;
						}
						response.writeHead(200, {
							"Content-Type": "text/plain"
						});
						for (var i=0;i!=files.length;i++)
						{
							var file=files[i];
							var dirString;
							if (file.isDirectory()) {
								dirString="dir";
							}
							else {
								dirString="file";
							}

							response.write(file.name+" "+dirString+" "+file.mtime.getTime()+" "+file.size);
							if (i!=files.length-1) {
								response.write("\n");
							}
						}
						response.end();

					});
					break;
				case "/ext/php/actions.php":
					performAction(POST, function (err, answer) {
						response.writeHead(200, {"Content-Type": "text/plain"});
						response.write(err);
						response.end();
					});
					break;
				default:
					console.log("Warning : POST request not implemented : "+uri);
					return;
				}
		    });
		    return;
		}

		libpath.exists(filename, function (exists) {
		    if (!exists) {
		        response.writeHead(404, {
		            "Content-Type": "text/plain"
		        });
		        response.write("404 Not Found\n");
		        response.end();
		        return;
		    }

			fs.stat(filename, function (err, stats) {
		      if (err) {
		          response.writeHead(500, {
		              "Content-Type": "text/plain"
		          });
		          response.write(err + "\n");
		          response.end();
		          return;
		      }

		      if (stats.isDirectory()) {
		          filename += '/index.html';
		      }

		      fs.readFile(filename, "binary", function (err, file) {
		          if (err) {
		              response.writeHead(500, {
		                  "Content-Type": "text/plain"
		              });
		              response.write(err + "\n");
		              response.end();
		              return;
		          }

		          var type = mime.lookup(filename);
		          response.writeHead(200, {
		              "Content-Type": type
		          });
		          response.write(file, "binary");
		          response.end();
		      });
		    });
		});
	}).listen(port);
	console.log ("server running on port "+port+", serving path "+path);
};

setupActions(dataRoot+"actions.xml", function (err, doc) {
	createServer();
	
});




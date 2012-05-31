var libpath = require('path'),
    http = require("http"),
    fs = require('fs'),
    url = require("url"),
    mime = require('mime'),
    qs = require('querystring'),
	async = require('async'),
	libxmljs = require("libxmljs");



var path = "trunk";
var port = 1337;

var setupActions=function (file, callback) {
	fs.readFile(file, function (err, data) {
		if (err) throw err;
		console.log("read : "+file);
		var xmlDoc = libxmljs.parseXmlString(data.toString());

		var elements=xmlDoc.root().childNodes();

		var actions=[];
		var numberOfActions=0;
		for (var i=0;i!=elements.length;i++) {
			var action={parameters : []};
			var element=elements[i];
			if (element.name()=='action') {
				action.name=element.attr('name').value();
				console.log("action : "+action.name);
				console.log("attributes : ");
				var attributes=element.attrs();
				var actionAttributes={};
				for (var k=0;k!=attributes.length;k++) {
					var attribute=attributes[k];
					actionAttributes[attribute.name()]=attribute.value();
				}
				action.attributes=actionAttributes;
				console.log(actionAttributes);
				numberOfActions++;

				var parameters=element.childNodes();
				console.log("parameters : ");
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
							console.log(parameterAttributes);
							action.parameters.push(parameterAttributes);
							break;
						default:
					}
				}
				actions.push(action);
				console.log("************************");
			}
		}
		console.log(numberOfActions+" actions registered");
		console.log(actions);
	});
};

setupActions(path+"/ext/php/actions.xml", function (err, doc) {
	
});

var getDirectory=function (dir, callback) {
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

var createServer=function () {
	http.createServer(function (request, response) {

		var uri = url.parse(request.url).pathname;
		var filename = libpath.join(path, uri);

		if (request.method == 'POST') {
		    var body = '';
		    request.on('data', function (data) {
		        body += data;
		    });
		    request.on('end', function () {
		        var POST = qs.parse(body);

				var filename = libpath.join(path, uri);
				console.log(uri)
				switch (uri) 
				{
				case "/ext/php/listDir.php":
					console.log("listDir");
					getDirectory(path+"/ext/php/"+POST.dir, function (err, files) {
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
				default:
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
};

createServer();
console.log ("server running on port "+port+", serving path "+path);

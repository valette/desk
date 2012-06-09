var libpath = require('path'),
    http = require("http"),
    fs = require('fs'),
    url = require("url"),
    mime = require('mime'),
    qs = require('querystring'),
	async = require('async');

var actions=require('./actions');

var path = "trunk/";
var dataRoot=path+"ext/php/";
var port = 1337;


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
					actions.performAction(POST, function (message) {
						response.writeHead(200, {"Content-Type": "text/plain"});
						response.write(message);
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

actions.setupActions(dataRoot, function (err, doc) {
	createServer();
});

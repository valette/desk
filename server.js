var libpath = require('path'),
    http = require("http"),
    fs = require('fs'),
    url = require("url"),
    mime = require('mime'),
    qs = require('querystring'),
	async = require('async');

var path = "build";
var port = 1337;

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

		if (request.method == 'POST') {
		    var body = '';
		    request.on('data', function (data) {
		        body += data;
		    });
		    request.on('end', function () {

		        var POST = qs.parse(body);
		        // use POST

				getDirectory(path+"/php/"+POST.dir, function (err, files) {
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
		    });
		    return;
		}

		var uri = url.parse(request.url).pathname;
		var filename = libpath.join(path, uri);

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

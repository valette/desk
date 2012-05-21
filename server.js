var libpath = require('path'),
    http = require("http"),
    fs = require('fs'),
    url = require("url"),
    mime = require('mime'),
    qs = require('querystring');

var path = "build";
var port = 1337;

http.createServer(function (request, response) {

	if (request.method == 'POST') {
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function () {

            var POST = qs.parse(body);
            // use POST

			fs.readdir(POST.dir, function (err, files) {
				response.writeHead(200, {
					"Content-Type": "text/plain"
				});
				for (var i=0;i!=files.length;i++)
				{
					response.write(files[i]+" file 10 10");
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

console.log ("server running on port "+port+", serving path "+path);

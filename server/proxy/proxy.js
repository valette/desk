var fs = require('fs'),
    http = require('http'),
    httpProxy = require('http-proxy');

var options = {
	https: {
		key: fs.readFileSync(__dirname+'/privatekey.pem', 'utf8'),
		cert: fs.readFileSync(__dirname+'/certificate.pem', 'utf8')
	},
	router: __dirname+'/routes.json'
};

var proxyServer = httpProxy.createServer(options);
var port = process.env.LISTEN_PID > 0 ? 'systemd' : 8081;
console.log('desk-proxy service listening on port '+port);
proxyServer.listen(port);

var server = http.createServer(function (req, res) {
	res.writeHead(301,
		{Location: 'https://desk.creatis.insa-lyon.fr' + req.url});
	res.end();
});
server.listen(8080);
console.log('desk-http2https service listening on port 8080');


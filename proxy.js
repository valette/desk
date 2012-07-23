var fs = require('fs'),
    https = require('https'),
    httpProxy = require('http-proxy');

var options = {
	https: {
		key: fs.readFileSync('privatekey.pem', 'utf8'),
		cert: fs.readFileSync('certificate.pem', 'utf8')
	},

	router: {
		'localhost/valette': 'localhost:1337/valette'
	},

	target: {
		https: true
	}
};

var proxyServer = httpProxy.createServer(options);
proxyServer.listen(80);


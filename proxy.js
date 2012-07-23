var fs = require('fs'),
    https = require('https'),
    httpProxy = require('http-proxy');

var options2 = {
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

var proxyServer2 = httpProxy.createServer(options2);
proxyServer2.listen(80);


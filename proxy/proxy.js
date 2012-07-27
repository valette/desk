var fs = require('fs'),
    https = require('https'),
    http = require('http'),
    httpProxy = require('http-proxy');
    express = require("express");

var options = {
	https: {
		key: fs.readFileSync('privatekey.pem', 'utf8'),
		cert: fs.readFileSync('certificate.pem', 'utf8')
	},

	router: {
		'desk/valette': 'desk:1337/valette'
	},

	/*target: {
		https: true
	}*/
};

var proxyServer = httpProxy.createServer(options);
proxyServer.listen(8081);


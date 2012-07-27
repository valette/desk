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

// set up plain http server
var http = express.createServer();

// set up a route to redirect http to https
http.get('*',function(req,res){ 
console.log("ici"); 
    res.redirect('https://desk'+req.url)
})

// have it listen on 8080
http.listen(8080);


var fs = require('fs'),
    https = require('https'),
    http = require('http'),
    httpProxy = require('http-proxy');

require ('systemd');

var options = {
	https: {
		key: fs.readFileSync(__dirname+'/privatekey.pem', 'utf8'),
		cert: fs.readFileSync(__dirname+'/certificate.pem', 'utf8')
	},

	router: {
		'desk.creatis.insa-lyon.fr/valette': 'desk.creatis.insa-lyon.fr:1337/valette'
		'desk.creatis.insa-lyon.fr/jacinto' : 'desk.creatis.insa-lyon.fr:1338/jacinto'
	},

//	target: {
//		https: true
//	}
};

var proxyServer = httpProxy.createServer(options);
var port = process.env.LISTEN_PID > 0 ? 'systemd' : 8081;
console.log('desk-proxy service listening on port '+port);
proxyServer.listen(port);


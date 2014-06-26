var	fs        = require('fs'),
	http      = require('http'),
	https     = require('https'),
	httpProxy = require('http-proxy'),
	exec      = require('child_process').exec,
	async     = require('async'),
	os        = require('os'),
	cluster   = require('cluster');

var	port      = 80,
	port2     = 443;

var 	defaultRoutes,
	routesFile = __dirname + '/routes.json',
	keyFile    = __dirname + '/privatekey.pem',
	certFile   = __dirname + '/certificate.pem',
	caFile     = __dirname + '/chain.pem',
	httpAllowed;

if (cluster.isMaster) {
	for (var i = 0; i < 4; i++) {
		cluster.fork();
	}
	cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died');
		cluster.fork();
	});
	return;
}

var proxy = httpProxy.createProxyServer({});

var ca = [];
if (fs.existsSync(caFile)) {
	var chain = fs.readFileSync (__dirname + '/chain.pem', 'utf8').split ("\n");
	var cert = [];
	chain.forEach(function (line) {
		if (line.length === 0) return;

		cert.push(line);

		if (line.match(/-END CERTIFICATE-/)) {
			ca.push (cert.join("\n"));
			cert = [];
		}
	});
}

var proxyServer = https.createServer({
	key: fs.readFileSync(keyFile, 'utf8'),
	cert: fs.readFileSync(certFile, 'utf8'),
	ca : ca
}, processRequest);

var server = http.createServer(function (req, res) {
	if (httpAllowed[req.headers.host]) {
		processRequest(req, res);
	} else {
		res.writeHead(301, {Location: 'https://' + req.headers.host + req.url});
		res.end();
	}
});

function  processRequest (req, res) {
	req.socket.setTimeout(36000000);
	if (req.url == "/") {
		res.writeHead(301, {Location: defaultRoutes[req.headers.host]});
		res.end();
	} else {
		var target = routes[req.headers.host + '/' + req.url.split("/")[1]];
		if (!target)  {
			res.end();
			return;
		}
		proxy.web(req, res, target);
	}
}

proxyServer.on('upgrade', function (req, socket, head) {
	var target = routes[req.headers.host + '/' + req.url.split("/")[1]];
	if (!target)  {
		res.end();
		return;
	}

	proxy.ws(req, socket, head, target);
});

// read routes files and configure routing
async.series([
	updateRoutes,

	function (callback) {
		server.listen(port, callback)
	},

	function (callback) {
		proxyServer.listen(port2, callback);
	}
], function () {
	console.log('desk-http2https service listening on port ' + port);
	console.log('desk-proxy service listening on port ' + port2);
	process.setgid('dproxy');
	process.setuid('dproxy');
});

var routes;

function updateRoutes(callback) {
	console.log(fs.readFileSync(routesFile).toString());
	var routesContent = JSON.parse(fs.readFileSync(routesFile));
	var users = routesContent.users;
	var newRoutes = {};

	async.forEachSeries(users, function (user, callback) {
		exec('id -u ' + user, function (err, stdout) {
			newRoutes[os.hostname() + '/' + user] = 
				{target : 'http://' + os.hostname() + ':' + stdout};
			callback();
		});
	}, function () {
		// add external proxies
		var otherRoutes = routesContent.otherRoutes || {};
		Object.keys(otherRoutes).forEach(function (key) {
			newRoutes[key] = {target : otherRoutes[key]};
		});
		defaultRoutes = routesContent.defaultRoutes;
		httpAllowed = routesContent.httpAllowed || {}
		console.log('... done! Routes:');
		routes = newRoutes;
		console.log(routes);
		callback();
	});
}

// watch routes files for auto-update
fs.watchFile(routesFile, function () {
	console.log(new Date());
	console.log(routesFile + ' modified, updating routes...');
	updateRoutes(function () {});
});
console.log('Watching file ' + routesFile + ' for routes');


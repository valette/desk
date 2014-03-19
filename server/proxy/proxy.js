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
	});
	return;
}

var proxy = new httpProxy.RoutingProxy({router : {}});

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
		proxy.proxyRequest(req, res);
	}
}

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
fs.watchFile(routesFile, updateRoutes);

function updateRoutes(callback) {
	console.log(new Date());
	console.log(routesFile + ' modified, updating routes...');
	var routesContent = JSON.parse(fs.readFileSync(routesFile));
	var users = routesContent.users;
	routes = {};

	async.forEachSeries(users, addUser, function () {
		// add external proxies
		var otherRoutes = routesContent.otherRoutes || {};
		Object.keys(otherRoutes).forEach(function (key) {
			routes[key] = otherRoutes[key];
		});
		defaultRoutes = routesContent.defaultRoutes;
		httpAllowed = routesContent.httpAllowed || {}
		proxy.proxyTable.setRoutes(routes);
		console.log('... done! Routes:');
		console.log(routes);
		if (typeof callback === "function") callback();
	});
}

console.log('Watching file ' + routesFile + ' for routes');

function addUser(user, callback) {
        exec('id -u ' + user, function (err, stdout) {
                var UID = parseInt(stdout, 10);
                routes[os.hostname() + '/' + user] = os.hostname() + ':' + UID + '/' + user;
                callback();
        });
}


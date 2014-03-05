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

var proxyServer = https.createServer({
	key: fs.readFileSync(__dirname+'/privatekey.pem', 'utf8'),
	cert: fs.readFileSync(__dirname+'/certificate.pem', 'utf8')
}, performRequest);

var server = http.createServer(function (req, res) {
	if (httpAllowed[req.headers.host]) {
		performRequest(req, res);
	} else {
		res.writeHead(301, {Location: 'https://' + req.headers.host + req.url});
		res.end();
	}
});

function  performRequest (req, res) {
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


var	execSync  = require('child_process').execSync,
	fs        = require('fs'),
	http      = require('http'),
	https     = require('https'),
	httpProxy = require('http-proxy'),
	os        = require('os');

var	port      = 80,
	port2     = 443;

var defaultRoutes,
	config     = __dirname + '/config.json',
	ports      = __dirname + '/ports.json',
	keyFile    = __dirname + '/cert/privatekey.pem',
	certFile   = __dirname + '/cert/certificate.pem',
	caFile     = __dirname + '/cert/chain.pem',
	httpAllowed;

var routes, // main routing object
	ca = []; // certificate chain

var proxy = httpProxy.createProxyServer({xfwd : true});
proxy.on('error', function(err, req, res) {
	//just end the request
	res.end();
});

if (fs.existsSync(caFile)) {
	var chain = fs.readFileSync (caFile, 'utf8').split ("\n");
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

updateRoutes();

// start proxies
server.listen(port, function () {
	proxyServer.listen(port2, function () {
		console.log('desk-http2https service listening on port ' + port);
		console.log('desk-proxy service listening on port ' + port2);
		process.setgid('dproxy');
		process.setuid('dproxy');
	});
});

function updateRoutes() {
	try{
		var routesContent = JSON.parse(fs.readFileSync(config));
		var users = routesContent.users;
		routes = {};

		users.forEach(function (user, index) {
			routes[os.hostname() + '/' + user] = {
				target : 'http://' + os.hostname() + ':'
					+ (routesContent.basePort + index)
			};
		});

		// add external proxies
		var otherRoutes = routesContent.otherRoutes || {};
		Object.keys(otherRoutes).forEach(function (key) {
			routes[key] = {target : otherRoutes[key]};
		});
		defaultRoutes = routesContent.defaultRoutes;
		httpAllowed = routesContent.httpAllowed || {}
		console.log('... done! Routes:');
		console.log(routes);
	} catch (err) {
		console.log("error updating routes : ");
		console.log(err);
	}
}

// watch routes files for auto-update
fs.watchFile(config, function (curr, prev) {
	if (curr.mtime > prev.mtime) {
		console.log(new Date().toDateString() + " " + new Date().toTimeString());
		console.log(config + ' modified, updating routes...');
		updateRoutes();
	}
});

console.log('Watching file ' + config + ' for routes');

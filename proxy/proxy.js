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

var routes; // main routing object

var proxy = httpProxy.createProxyServer( {

	xfwd : true,
	agent : new http.Agent( { keepAlive: true } )

} );

proxy.on('error', function(err, req, res) {
	//just end the request
	res.end();
});

var serverOpts = {
	key: fs.readFileSync(keyFile, 'utf8'),
	cert: fs.readFileSync(certFile, 'utf8'),
};

if ( fs.existsSync( caFile ) ) {
	serverOpts.ca = fs.readFileSync(caFile, 'utf8')
} else {
	console.warn( 'no .ca file provided' );
}

var proxyServer = https.createServer( serverOpts, processRequest);

var server = http.createServer(function (req, res) {
	if (httpAllowed[req.headers.host]) {
		processRequest(req, res);
	} else {
		res.writeHead(302, {Location: 'https://' + req.headers.host + req.url});
		res.end();
	}
});

function processRequest (req, res) {
	if (req.url == "/" && defaultRoutes[req.headers.host] ) {
		res.writeHead( 302, {Location: defaultRoutes[req.headers.host]} );
		res.end();
	} else {
		var target = routes[req.headers.host + '/' + req.url.split("/")[1]];
		if (!target)  {
			res.writeHead(404, {"Content-Type": "text/plain"});
			res.write("404 Not Found\n");
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
server.listen( port, function () {
	proxyServer.listen( port2, function () {
		console.log('desk-http2https service listening on port ' + port);
		console.log('desk-proxy service listening on port ' + port2);
		process.setgid('dproxy');
		process.setuid('dproxy');
	});
});

function updateRoutes() {
	try{
		var routesContent = JSON.parse(fs.readFileSync(config));
		routes = {};

		var baseURL = routesContent.baseURL || os.hostname();

		routesContent.users.forEach( function ( user ) {
			routes[ baseURL + '/' + user ] = {
				target : 'http://' + baseURL + ':' + routesContent.ports[user]
			};
		});

		// add external proxies
		var otherRoutes = routesContent.otherRoutes || {};
		Object.keys( otherRoutes ).forEach(function (key) {
			routes[ key ] = { target : otherRoutes[ key ] };
		});
		defaultRoutes = routesContent.defaultRoutes;
		httpAllowed = routesContent.httpAllowed || {}
		console.log( '... done! Routes:' );
		console.log( routes );
	} catch (err) {
		console.log( "error updating routes : " );
		console.log( err );
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

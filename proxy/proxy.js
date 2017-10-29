const execSync  = require( 'child_process' ).execSync,
      fs        = require( 'fs' ),
      http      = require( 'http' ),
      https     = require( 'https' ),
      httpProxy = require( 'http-proxy' ),
      os        = require( 'os' );

const port      = 80,
      port2     = 443,
      file       = __dirname + '/config.json',
      keyFile    = __dirname + '/cert/privatekey.pem',
      certFile   = __dirname + '/cert/certificate.pem',
      caFile     = __dirname + '/cert/chain.pem';

let defaultRoutes,
	httpAllowed,
	routes; // main routing object

const proxy = httpProxy.createProxyServer( {

	xfwd : true,
	agent : new http.Agent( { keepAlive: true } )

} );

proxy.on('error', ( err, req, res ) => res.end() );

const serverOpts = {

	key: fs.readFileSync( keyFile, 'utf8' ),
	cert: fs.readFileSync( certFile, 'utf8' ),

};

if ( fs.existsSync( caFile ) ) {

	serverOpts.ca = fs.readFileSync( caFile, 'utf8' )

} else {

	console.warn( 'no .ca file provided' );

}

const proxyServer = https.createServer( serverOpts, processRequest );

const server = http.createServer( function ( req, res ) {

	if ( httpAllowed[ req.headers.host ] ) {

		processRequest(req, res);

	} else {

		res.writeHead( 302, { Location: 'https://' + req.headers.host + req.url } );
		res.end();

	}

} );

function processRequest ( req, res ) {

	if ( req.url == "/" && defaultRoutes[ req.headers.host ] ) {

		res.writeHead( 302, { Location: defaultRoutes[ req.headers.host ] } );
		res.end();

	} else {

		const target = routes[ req.headers.host + '/' + req.url.split( "/" )[ 1 ] ];

		if ( !target )  {

			res.writeHead( 404, { "Content-Type": "text/plain" } );
			res.write( "404 Not Found\n" );
			res.end();
			return;

		}

		proxy.web( req, res, target );

	}
}

proxyServer.on( 'upgrade', function ( req, socket, head ) {

	const target = routes[ req.headers.host + '/' + req.url.split( "/" )[ 1 ] ];
	if ( !target ) return res.end();
	proxy.ws( req, socket, head, target );

} );

updateRoutes();

// start proxies
server.listen( port, function () {

	proxyServer.listen( port2, function () {

		console.log( 'desk-http2https service listening on port ' + port );
		console.log( 'desk-proxy service listening on port ' + port2 );
		process.setgid( 'dproxy' );
		process.setuid( 'dproxy' );

	} );

} );

function updateRoutes() {

	try{

		const newRoutes = JSON.parse( fs.readFileSync( file ) );
		routes = {};

		const baseURL = newRoutes.baseURL || os.hostname();

		for( let user of newRoutes.users ) {

			routes[ baseURL + '/' + user ] = {

				target : 'http://' + baseURL + ':' + newRoutes.ports[ user ]

			};

		}

		// add external proxies
		const otherRoutes = newRoutes.otherRoutes || {};

		for ( let [ key, value ] of Object.entries( otherRoutes ) ) {

			routes[ key ] = { target : value };

		}

		defaultRoutes = newRoutes.defaultRoutes;
		httpAllowed = newRoutes.httpAllowed || {}
		console.log( '... done! Routes:' );
		console.log( routes );

	} catch (err) {

		console.log( "error updating routes : " );
		console.log( err );

	}
}

// watch routes files for auto-update
fs.watchFile( file, function ( curr, prev ) {

	if ( curr.mtime <= prev.mtime ) return;
	console.log( new Date().toDateString() + " " + new Date().toTimeString() );
	console.log( file + ' modified, updating routes...' );
	updateRoutes();

} );

console.log('Watching file ' + file + ' for routes');

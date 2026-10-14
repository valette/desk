const fs        = require( 'fs' ),
      http      = require( 'http' ),
      https     = require( 'https' ),
      httpProxy = require( 'http-proxy' ),
      os        = require( 'os' ),
      { execSync } = require( 'child_process' );

// HTTP_PORT: the HTTP redirect (or, in http-only mode, the serving) port.
// HTTPS_PORT: the TLS port, only used when HTTPS is enabled.
const httpPort   = parseInt( process.env.HTTP_PORT ) || 80,
      httpsPort  = parseInt( process.env.HTTPS_PORT ) || 443,
      file       = process.env.DESK_CONFIG || __dirname + '/config.json',
      keyFile    = __dirname + '/cert/privatekey.pem',
      certFile   = __dirname + '/cert/certificate.pem',
      caFile     = __dirname + '/cert/chain.pem',
      proxyUser  = 'dproxy';

// HTTPS is on by default (production). manage.mjs passes DESK_HTTPS=0 when a
// custom config is given without --https (debug/http-only mode).
const httpsEnabled = process.env.DESK_HTTPS !== '0';

let defaultRoutes = {},
	httpAllowed = {},
	routes = {}; // main routing object

const proxy = httpProxy.createProxyServer( {

	xfwd : true,
	agent : new http.Agent( { keepAlive: true } )

} );

proxy.on('error', ( err, req, res ) => {

	console.log( new Date().toISOString() + ' proxy error : ' + err.message + ' for ' + ( req && req.headers && req.headers.host ) + ( req && req.url ) );
	if ( res ) res.end();

});

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

function handleUpgrade ( req, socket, head ) {

	const target = routes[ req.headers.host + '/' + req.url.split( "/" )[ 1 ] ];
	if ( !target ) return socket.destroy();
	proxy.ws( req, socket, head, target );

}

let proxyServer = null;

if ( httpsEnabled ) {

	if ( !fs.existsSync( keyFile ) || !fs.existsSync( certFile ) ) {

		console.error( 'proxy: missing TLS files ' + keyFile + ' / ' + certFile );
		process.exit( 1 );

	}

	const serverOpts = {

		key: fs.readFileSync( keyFile, 'utf8' ),
		cert: fs.readFileSync( certFile, 'utf8' ),

	};

	if ( fs.existsSync( caFile ) ) {

		serverOpts.ca = fs.readFileSync( caFile, 'utf8' )

	} else {

		console.warn( 'no .ca file provided' );

	}

	proxyServer = https.createServer( serverOpts, processRequest );

} else {

	proxyServer = http.createServer( processRequest );

}

// HTTP server: redirect to https, except for httpAllowed hosts. Skipped when
// HTTPS is disabled (debug/http-only mode) — the proxy serves plain HTTP.
let server = null;

if ( httpsEnabled ) {

	server = http.createServer( function ( req, res ) {

		if ( httpAllowed[ req.headers.host ] ) {

			processRequest(req, res);

		} else {

			res.writeHead( 302, { Location: 'https://' + req.headers.host + req.url } );
			res.end();

		}

	} );

	// http server: redirect to https, except for httpAllowed hosts
	server.on( 'upgrade', function ( req, socket, head ) {

		if ( !httpAllowed[ req.headers.host ] ) return socket.destroy();
		handleUpgrade( req, socket, head );

	} );

	proxyServer.on( 'upgrade', handleUpgrade );

} else {

	server = proxyServer;

}

updateRoutes();

function checkPrivileges() {

	if ( typeof process.getuid !== 'function' || process.getuid() !== 0 ) {

		// non-root: single-user debug mode, high port, no privilege drop
		console.log( 'proxy: running as non-root (debug); no privilege drop' );
		return;

	}

	try {

		execSync( 'id -u ' + proxyUser, { stdio : 'ignore' } );

	} catch ( err ) {

		console.error( 'proxy: system user ' + proxyUser + ' does not exist' );
		process.exit( 1 );

	}

}

// start proxy
checkPrivileges();

const onAllListening = () => {

	if ( typeof process.getuid === 'function' && process.getuid() === 0 ) {

		try {

			process.setgid( proxyUser );
			process.setuid( proxyUser );

		} catch ( err ) {

			console.error( 'proxy: failed to drop privileges to ' + proxyUser + ' : ' + err );

		}

	}

};

if ( httpsEnabled ) {

	// http redirect server + https server on their own ports
	server.listen( httpPort, () => {
		console.log( 'desk-http2https service listening on port ' + httpPort );
		proxyServer.listen( httpsPort, () => {
			console.log( 'desk-proxy service listening on port ' + httpsPort + ' (https)' );
			onAllListening();
		} );
	} );

} else {

	proxyServer.listen( httpPort, () => {
		console.log( 'desk-proxy service listening on port ' + httpPort + ' (http)' );
		onAllListening();
	} );

}

function updateRoutes() {

	try{

		const newRoutes = JSON.parse( fs.readFileSync( file ) );
		routes = {};

		const baseURL = newRoutes.baseURL || os.hostname();

		// strip any port from baseURL to build the upstream host (per-user desk
		// servers each listen on their own port, not the proxy's)
		const targetHost = String( baseURL ).replace( /:\d+$/, '' );

		for( let [ user, port ] of Object.entries( newRoutes.ports ) ) {

			routes[ baseURL + '/' + user ] = {

				target : 'http://' + targetHost + ':' + port

			};

		}

		// add external proxies
		const otherRoutes = newRoutes.otherRoutes || {};

		for ( let [ key, value ] of Object.entries( otherRoutes ) ) {

			routes[ key ] = { target : value };

		}

		defaultRoutes = newRoutes.defaultRoutes || {};
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

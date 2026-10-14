import { execFileSync } from 'child_process';
import * as fs from 'fs';
import getPort from 'get-port';
import { mkdirp } from 'mkdirp'
import * as os from 'os';
import * as path from 'path';
import pm2 from 'pm2';
import { promisify } from 'util';
import * as url from 'url';
import { parseArgs } from './args.mjs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const proxyUser = "dproxy";
const proxyApp = "PROXY";

for ( let name of [ "delete", "dump", "list", "start" ] ) {

	pm2[ name + 'Async' ] = promisify( pm2[ name ] );

}

const isDebug = ( typeof process.getuid === 'function' && process.getuid() !== 0 );

function userRoot ( user ) {

	// Per-user DESK_ROOTDIR. A configured rootDir places every user's desk dir
	// under <rootDir>/<user>. Otherwise, in debug (single non-root account)
	// every "user" maps to an isolated dir under the invoking user's home.
	if ( config.rootDir ) return path.join( config.rootDir, user );
	if ( isDebug ) return path.join( os.homedir(), 'desk', 'debug', user );
	return '/home/' + user + '/desk';

}

async function addUser( config, runningApps, user ) {

	if ( ( config.unmanaged || {} )[ user ] ) {
		console.log( user + " is an unmanaged port : " + config.unmanaged[ user ] );
		return;
	}

	const app = runningApps.find( a => ( a.name === user ) );

	if ( app ) {

		if ( app.pm2_env.PORT ) {

			console.log( 'User ' + user + ' is already active' );
			config.ports[ user ] = app.pm2_env.PORT;
			return;

		}

		console.log( 'App ' + user + ' exists but has no PORT; restarting it' );

	}

	const id = isDebug ? -1 : parseInt( execFileSync( 'id', [ '-u', user ] ).toString() );
	const port = await getPort()
	console.log( "Starting " + user );
	const cwd = userRoot( user );

	if ( !fs.existsSync( cwd ) ) {

		mkdirp.sync( cwd );
		if ( !isDebug ) {

			const group = parseInt( execFileSync( 'id', [ '-g', user ] ).toString() );
			fs.chownSync( cwd, id, group );

		}
		console.log( "Created desk directory for user " + user );

	}

	config.ports[ user ] = port;
	const logFile = cwd + '/log.txt';

	const settings = {

		name       : user,
		script     : path.join( __dirname, "deskSU.js" ),
		cwd        : cwd,
		error_file : logFile,
		out_file   : logFile,
		merge_logs : true,
		env: {

			...(config.env || {}),
			PORT : port,
			USER : user,
			DESK_USER : user,
			// in subdomain mode the subdomain identifies the user, so the desk
			// server serves at root (no DESK_PREFIX); otherwise use /user/
			...( config.subdomains ? {} : { DESK_PREFIX : user } ),
			DESK_ROOTDIR : cwd,
			HOME : isDebug ? os.homedir() : '/home/' + user,
			LOGNAME : user

		}

	};

	if ( isDebug ) settings.env.CCACHE_DIR = path.join( os.homedir(), '.ccache' );
	else settings.env.CCACHE_DIR = "/home/" + user + "/.ccache";

	const userConfig = path.join( cwd, 'config.json' );

	if ( fs.existsSync( userConfig ) ) try {

		const boot = JSON.parse( fs.readFileSync( userConfig ) ).boot;
		if ( boot ) {

			console.log( "using custom script : " + boot );
			settings.env.DESK_STARTUP  = boot;

		}

	} catch ( err ) {

		console.log( '\nerror while reading ' + userConfig );
		console.log( err );
		return;

	}

	await pm2.startAsync( settings );

}

async function removeUser( config, runningApps, user ) {

	delete config.ports[ user ];

	if ( runningApps.find( app => ( app.name === user ) ) ) {

		await pm2.deleteAsync( user );
		console.log( 'app stopped for user ' + user );

	} else console.log( 'no running app found for user ' + user + '; port removed from config' );

}

async function init( config, runningApps, file, https, httpPort, httpsPort ) {

	for ( let user of Object.keys( config.ports ) ) await addUser( config, runningApps, user );
	console.log("All runningApps launched");

	if ( runningApps.find( app => ( app.name === proxyApp ) ) ) {

		console.log( 'Proxy already started' );
		return;

	}

	// add proxy cluster app
	const cwd = isDebug ? path.join( os.homedir(), 'desk' ) : '/home/' + proxyUser + '/desk/';
	const logFile = cwd + '/log.txt';
	const proxy = {

		name       : proxyApp,
		script     : __dirname + "/proxy.js",
		error_file : logFile,
		out_file   : logFile,
		merge_logs : true,
		exec_mode  : 'cluster_mode',
		instances  : 4,
		env : {

			DESK_CONFIG : file,
			DESK_HTTPS  : https ? '1' : '0',
			HTTP_PORT   : httpPort,
			HTTPS_PORT  : httpsPort

		}

	};

	if ( isDebug ) proxy.env.DESK_DEBUG = '1';

	await pm2.startAsync( proxy );
	console.log( "Proxy started" );

	if ( https ) {

		console.log( 'Proxy listening on https://' + ( config.baseURL || 'localhost' ) + ':' + httpsPort );
		if ( httpPort ) console.log( 'Proxy HTTP redirect listening on port ' + httpPort );

	} else {

		console.log( 'Proxy listening on http://' + ( config.baseURL || 'localhost:' + httpPort ) );

	}

}

// CLI: [action] [user] [--config <file>] [--https] [--help|-h]
const args = parseArgs( process.argv.slice( 2 ) );
const file = args.config || path.join( __dirname, 'config.json' );
const https = ( args.config ? args.https : true );

if ( args.help || args.action === 'help' ) {

	console.log( `
DESK multi-user proxy manager

Usage:
  node manage.mjs [action] [user] [options]

Actions:
  (none)   init: start every user in config.ports plus the PROXY proxy
  add <user>     start a DESK instance for <user>
  remove <user>  stop <user>'s app and remove its port from the config
  help           show this help

Options:
  --config <file>  use <file> as the shared config instead of config.json.
                   Also disables HTTPS (proxy becomes HTTP-only) unless
                   --https is given.
  --https          force HTTPS on even when a custom config was given.
  -h, --help       show this help.

Environment:
  HTTP_PORT   proxy HTTP (redirect) port; debug mode defaults to 8080,
              production to 80
  HTTPS_PORT  proxy TLS port, default 443 (only used with HTTPS)

Examples:
  node manage.mjs                        # init, HTTPS (production, root)
  node manage.mjs add alice              # start user alice
  node manage.mjs remove bob             # stop user bob
  HTTP_PORT=8080 node manage.mjs --config config_debug.json   # debug, HTTP only
  node manage.mjs --config config.json --https                # custom config, HTTPS
` );
	process.exit( 0 );

}

const runningApps = await pm2.listAsync();
let config;
try {

	config = JSON.parse( fs.readFileSync( file ) );

} catch ( err ) {

	console.error( 'error: cannot read config file ' + file );
	console.error( '  ' + err.message );
	console.error( 'Create it from the template, e.g.: cp ' + path.join( __dirname, 'config.json.example' ) + ' ' + file );
	console.error( 'Or pass a custom one with --config <file>. See --help.' );
	process.exit( 1 );

}

// Proxy ports. Debug (HTTP-only) defaults to 8080 so it works as a non-root
// user; production defaults to the privileged ports the proxy binds (80/443).
const httpPort  = https ? ( process.env.HTTP_PORT  || undefined ) : ( process.env.HTTP_PORT  || '8080' );
const httpsPort = process.env.HTTPS_PORT || undefined;

if ( isDebug && !https ) {

	// make sure the proxy routes match the (high) HTTP port we bind
	if ( !config.baseURL || !config.baseURL.includes( ':' ) ) {

		config.baseURL = 'localhost:' + httpPort;
		console.log( 'debug: baseURL set to ' + config.baseURL );

	}

}

switch ( args.action ) {

	case "add":
		if ( !args.user ) throw "no user specified";
		await addUser( config, runningApps, args.user );
		break;

	case "remove":

		if ( !args.user ) throw "no user specified";
		await removeUser( config, runningApps, args.user );
		break;

	default:
		await init( config, runningApps, file, https, httpPort, httpsPort );

}

// sort ports
config.ports = { ...config.ports, ...( config.unmanaged || {} ) }
const entries = Object.entries( config.ports );
entries.sort( ( a, b ) => a[ 0 ].toLowerCase().localeCompare( b[ 0 ].toLowerCase() ) );
config.ports = {}
for ( let [ user, port ] of entries ) config.ports[ user ] = port;
await pm2.dumpAsync();
fs.writeFileSync( file, JSON.stringify( config, null, "\t" ) );

process.exit();

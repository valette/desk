import { execSync } from 'child_process';
import * as fs from 'fs';
import getPort from 'get-port';
import { mkdirp } from 'mkdirp'
import * as path from 'path';
import pm2 from 'pm2';
import { promisify } from 'util';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const file = __dirname + '/config.json';
const proxyUser = "dproxy";
const proxyApp = "PROXY";

for ( let name of [ "delete", "dump", "list", "start" ] ) {

	pm2[ name + 'Async' ] = promisify( pm2[ name ] );

}

async function addUser( config, runningApps, user ) {

	const app = runningApps.find( a => ( a.name === user ) );

	if ( app ) {

		console.log( 'User ' + user + ' is already active' );
		config.ports[ user ] = app.pm2_env.PORT;
		return;

	}

	const id = parseInt( execSync( 'id -u ' + user ) );
	const port = await getPort()
	console.log( "Starting " + user );
	const cwd = '/home/' + user + '/desk/';

	if ( !fs.existsSync( cwd ) ) {

		mkdirp.sync( cwd );
		const group = parseInt( execSync( 'id -g ' + user ) );
		fs.chownSync( cwd, id, group );
		console.log( "Created desk directory for user " + user );

	}

	config.ports[ user ] = port;
	const logFile = cwd + 'log.txt';

	const settings = {

		name       : user,
		script     : path.join( __dirname, "deskSU.js" ),
		cwd        : cwd,
		error_file : logFile,
		out_file   : logFile,
		merge_logs : true,
		env: {

			PORT : port,
			USER : user,
			DESK_USER : user,
			DESK_PREFIX : user,
			CCACHE_DIR : "/home/" + user + "/.ccache",
			HOME : "/home/" + user,
			LOGNAME : user

		}

	};

	const userConfig = path.join( '/home', user, 'desk/config.json' );

	if ( fs.existsSync( userConfig ) ) try {

		const boot = JSON.parse( fs.readFileSync( userConfig ) ).boot;
		if ( boot ) {

			console.log( "using custom script : " + boot );
			settings.env.DESK_STARTUP  = boot;

		}

	} catch ( err ) {

		console.log( '\nerror while reading ' + userConfig );
		console.log( err );
		settings = null;

	}

	if ( !settings ) return;
	await pm2.startAsync( settings );

}

async function removeUser( config, runningApps, user ) {

	delete config.ports[ user ];

	if ( runningApps.find( app => ( app.name === user ) ) ) {

		await pm2.deleteAsync( user );
		console.log( 'app stopped for user ' + user );

	} else throw 'no app found for user ' + user;

}

async function init( config, runningApps ) {

	for ( let user of Object.keys( config.ports ) ) await addUser( config, runningApps, user );
	console.log("All runningApps launched");

	if ( runningApps.find( app => ( app.name === proxyApp ) ) ) {

		console.log( 'Proxy already started' );
		return;

	}

	// add proxy cluster app
	const cwd = '/home/' + proxyUser + '/desk/';
	const logFile = cwd + 'log.txt';
	const proxy = {

		name       : proxyApp,
		script     : __dirname + "/proxy.js",
		error_file : logFile,
		out_file   : logFile,
		merge_logs : true,
		exec_mode  : 'cluster_mode',
		instances  : 4

	};

	await pm2.startAsync( proxy );
	console.log( "Proxy started" );

}

const [ , , action, user ] = process.argv;
const runningApps = await pm2.listAsync();
const config = JSON.parse( fs.readFileSync( file ) );

switch ( action ) {

	case "add":
		if ( !user ) throw "no user specified";
		await addUser( config, runningApps, user );
		break;

	case "remove":

		if ( !user ) throw "no user specified";
		await removeUser( config, runningApps, user );
		break;

	default:
		await init( config, runningApps );

}

// sort ports
const entries = Object.entries( config.ports );
entries.sort( ( a, b ) => a[ 0 ].toLowerCase().localeCompare( b[ 0 ].toLowerCase() ) );
config.ports = {}
for ( let [ user, port ] of entries ) config.ports[ user ] = port;

await pm2.dumpAsync();
fs.writeFileSync( file, JSON.stringify( config, null, "\t" ) );

process.exit();

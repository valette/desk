const	execSync   = require( 'child_process' ).execSync,
		fs         = require( 'fs' ),
		getPort    = require( 'get-port' ),
		mkdirp     = require( 'mkdirp' ),
		path       = require( 'path' ),
		pm2        = require( 'pm2' ),
		promisify  = require( 'util' ).promisify;

const file = __dirname + '/config.json';
const proxyUser = "dproxy";
const proxyApp = "PROXY";

for ( let name of [ "delete", "list", "start" ] ) {

	pm2[ name + 'Async' ] = promisify( pm2[ name ] );

}

const config = JSON.parse( fs.readFileSync( file ) );

async function addUser( apps, user ) {

	if ( !config.users.includes( user ) ) config.users.push( user );

	const app = apps.find( a => ( a.name === user ) );

	if ( app ) {

		console.log( 'User ' + user + ' is already active' );
		config.ports[ user ] = app.pm2_env.PORT;
		return;

	}

	const port = await getPort()
	config.ports[ user ] = port;
	console.log("Starting " + user);
	const cwd = '/home/' + user + '/desk/';

	if ( !fs.existsSync( cwd ) ) {

		mkdirp.sync( cwd );
		const id = parseInt( execSync( 'id -u ' + user ) );
		const group = parseInt( execSync( 'id -g ' + user ) );
		fs.chownSync( cwd, id, group );
		console.log( "Created desk directory for user " + user );

	}

	const logFile = cwd + 'log.txt';
	const settings = {

		"name"       : user,
		"uid"        : user,
		"script"     : path.join( __dirname, "../desk.js" ),
		"cwd"        : cwd,
		"error_file" : logFile,
		"out_file"   : logFile,
		"merge_logs" : true,
		"env": {

			PORT : port,
			USER : user,
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
			settings.script = boot;

		}

	} catch ( err ) {

		console.log( '\nerror while reading ' + userConfig );
		console.log( err );
		settings = null;

	}

	if ( !settings ) return;
	await pm2.startAsync( settings );

}

async function removeUser( apps, user ) {

	if ( config.users.includes( user ) ) {

		config.users = config.users.filter( u => u !== user );

	}

	if ( config.ports[ user ] ) delete config.ports[ user ];

	if ( apps.find( app => ( app.name === user ) ) ) {

		await pm2.deleteAsync( user );
		console.log( 'app stopped for user ' + user );

	} else throw 'no app found for user ' + user;

}

async function init( apps ) {

	const users = config.users;
	config.users = [];
	config.ports = {};

	await Promise.all(  users.map ( user => addUser( apps, user ) ) );
	console.log("All apps launched");

	if ( apps.find( app => ( app.name === proxyApp ) ) ) {

		console.log( 'Proxy already started' );
		return;

	}

	// add proxy cluster app
	const cwd = '/home/' + proxyUser + '/desk/';
	const logFile = cwd + 'log.txt';
	const proxy = {

		"name"       : proxyApp,
		"script"     : __dirname + "/proxy.js",
		"error_file" : logFile,
		"out_file"   : logFile,
		"merge_logs" : true,
		"exec_mode"  : 'cluster_mode',
		"instances"  : 4

	};

	await pm2.startAsync( proxy );
	console.log( "Proxy started" );

}

( async function () {

	const [ , , action, user ] = process.argv;
	const apps = await pm2.listAsync();

	if ( action === "add" ) {

		if ( !user ) throw "no user specified";
		await addUser( apps, user );

	} else if ( action === "remove" ) {

		if ( !user ) throw "no user specified";
		await removeUser( apps, user );

	} else await init( apps );

	config.users.sort();
	fs.writeFileSync( file, JSON.stringify( config, null, "\t" ) );

} )()
	.then( process.exit )
	.catch( err => {

		console.log( 'Error : ', err )
		process.exit( 1 );

	} );

const	async      = require('async'),
		execSync   = require('child_process').execSync,
		fs         = require('fs'),
		getPort    = require('get-port'),
		mkdirp     = require('mkdirp'),
		path       = require('path'),
		pm2        = require('pm2'),
		prettyPrint= require('pretty-data').pd;

const configFile = __dirname + '/config.json';
const proxyUser = "dproxy";
const proxyApp = "PROXY";

var config = JSON.parse( fs.readFileSync( configFile ) );

function exportConfig () {
	config.users.sort();
	fs.writeFileSync( configFile, prettyPrint.json( config ) );
}

function addUser( user, callback ) {
	var app = apps.find( function ( app ) {
		return app.name === user;
	});

	if ( config.users.indexOf( user ) === -1 ) config.users.push( user );

	if (app) {
		console.log( 'User ' + user + ' is already active' );
		config.ports[ user ] = app.pm2_env.PORT;
		callback();
		return;
	}

	getPort().then( function ( port ) {
		config.ports[ user ] = port;
		addApp( user, callback );
	});
}

function addApp ( user, callback ) {
	console.log("Starting " + user);
	var cwd = '/home/' + user + '/desk/';
	if (!fs.existsSync(cwd)) {
		mkdirp.sync(cwd);
		var id = parseInt(execSync('id -u ' + user));
		var group = parseInt(execSync('id -g ' + user));
		fs.chownSync(cwd, id, group);
		console.log("Created desk directory for user " + user);
	}

	var logFile = cwd + 'log.txt';
	var settings = {
		"name"       : user,
		"script"     : __dirname + "/deskSU.js",
		"cwd"        : cwd,
		"error_file" : logFile,
		"out_file"   : logFile,
		"merge_logs" : true,
		"env": {
			"DESK_USER" : user,
			"DESK_MEMORY_RATIO" : "0.1",
			"PORT" : config.ports[ user ],
			"DESK_CMD" : "node "	+ path.join(__dirname, '../desk.js --multi')
		}
	};

	var userConfig = path.join('/home/', user, 'desk/config.json');
	if ( fs.existsSync( userConfig ) ) {
		try {
			var boot = JSON.parse( fs.readFileSync( userConfig ) ).boot;
			if ( boot ) {
				console.log( "using custom command : " + boot );
				settings.env.DESK_CMD = "node " + boot;
			}
		} catch ( err ) {
			console.log( '\nerror while reading ' + userConfig );
			console.log( err );
			settings = null;
		}
	}

	if ( settings ) {
		pm2.start( settings, callback );
	} else {
		callback();
	}
}

function remove( user, callback ) {
	var app = apps.find( app => ( app.name === user ) );
	if ( config.users.indexOf( user ) >= 0 ) {
		config.users = config.users.filter( u => u.name !== user );
	}

	if ( config.ports[ user ] ) {
		delete config.ports[user];
	}

	if ( app ) {
		pm2.delete( user, function ( err ) {
			console.log( 'app stopped for user ' + user );
			callback();
		});
	} else {
		console.log( 'no app found for user ' + user );
		callback();
	}
}

function init() {
	var users = config.users;
	config.users = [];
	config.ports = {};

	async.each( users, addUser, function ( err ) {
		exportConfig();
		console.log("All apps launched");

		if ( apps.find( app => ( app.name === proxyApp ) ) ) {
			console.log( 'Proxy already started');
			process.exit();
		}

		// add proxy cluster app
		var cwd = '/home/' + proxyUser + '/desk/';
		var logFile = cwd + 'log.txt';
		var proxy = {
			"name"       : proxyApp,
			"script"     : __dirname + "/proxy.js",
			"error_file" : logFile,
			"out_file"   : logFile,
			"merge_logs" : true,
			"exec_mode"  : 'cluster_mode',
			"instances"  : 4
		};
		pm2.start( proxy, function ( err ) {
			console.log("Proxy started");
			if ( err ) {
				console.log( err )
			}
			process.exit();
		} );
	});
}

const args = process.argv;
var action = args[ 2 ];
var user = args[ 3 ];

var apps;
pm2.list( function ( err, res ) {
	apps = res;
	switch ( action ) {
		case undefined :
			init();
			break;
		case "add" :
			if ( !user ) {
				console.log( "Error : no user specified" );
				process.exit( 1 );
			}
			addUser ( user, function ( err ) {
				if ( err ) {
					process.exit(1);
				}
				exportConfig();
				process.exit();
			} );
			break;
		case "remove" :
			if ( !user ) {
				console.log( "Error : no user specified" );
				process.exit( 1 );
			}
			remove ( user, function ( err ) {
				if ( err ) {
					process.exit(1);
				}
				exportConfig();
				process.exit();
			} );
			break;
	}
});

'use strict';

const actions    = require( 'desk-base' ),
      auth       = require( 'basic-auth' ),
      compress   = require( 'compression' ),
      crypto     = require( 'crypto' ),
      directory  = require( 'serve-index' ),
      express    = require( 'express' ),
      formidable = require( 'formidable' ),
      fs         = require( 'fs-extra' ),
      http       = require( 'http' ),
      https      = require( 'https' ),
      path       = require( 'path' ),
      pty        = require( 'node-pty' ),
      socketIO   = require( 'socket.io' );
const { test } = require('shelljs');

const certificateFile = path.join( __dirname, "certificate.pem" ),
      deskDir         = actions.getRootDir(),
      homeURL         = process.env.DESK_PREFIX ? ( "/" + process.env.DESK_PREFIX + "/" ) : '/',
      port            = process.env.PORT || 8080,
      passwordFile    = path.join( deskDir, "password.json" ),
      privateKeyFile  = path.join( __dirname, "privatekey.pem" ),
      uploadDir       = path.join( deskDir, 'upload' ) + '/';

process.title = "desk";
let id = { username : process.env.USER, password : "password" };
fs.mkdirsSync( deskDir );
fs.mkdirsSync( uploadDir );
actions.include( __dirname + '/extensions' );

function authenticate ( user, pass ) {

	if ( id.username === undefined ) return true;
	const pass256 = pass; 
	const shasum256 = crypto.createHash( 'sha256' ); 
	shasum256.update(pass256);
	const sha256 = shasum256.digest( 'hex' ); 

	//If the hash of the password is calculated with SHA-1 then we change it
	if ( id.sha) {
		const pass1 = pass; 
    	const shasum1  = crypto.createHash( 'sha1' );
		shasum1.update( pass1 );
		const sha1 = shasum1.digest( 'hex' ); 
 	    if ( !user || !pass ||  user !== id.username ||  sha1 !== id.sha ) { throw new Error( 'bad auth' );} 
		// We verify that the logins are correct before deleting and addind the hash 256
		else if (user && pass && user == id.username && sha1 == id.sha) {  
			delete id.sha; 
			id.sha256 = sha256;
			fs.writeFileSync( passwordFile, JSON.stringify( id ) );
		};
	//	
	} else { 
		if ( !user || !pass ||  user !== id.username ||  sha256 !== id.sha256 )  { throw new Error( 'bad auth' )};
	}
 
 
}

const app = express()
	.use( ( req, res, next ) => {

		if ( publicDirs[ req.path.slice( homeURL.length ).split( '/' )[ 0 ] ] ) {

			return next();

		}

		try {

			const user = auth( req ) || {};
			authenticate( user.name, user.pass );
			res.cookie( 'homeURL', homeURL );
			return next();

		} catch ( e ) {

			res.setHeader( 'WWW-Authenticate', 'Basic realm="Identity?"' );
			res.sendStatus( 401 );

		}

	} )
	.use( compress() )
	.set( 'trust proxy', true )
	.use( express.urlencoded( { limit : '10mb', extended : true } ) )
	.post( path.join( homeURL, '/upload' ), ( req, res ) => {

		if ( !actions.getSettings().permissions ) return;
		let outputDir;
		const files = [];
		const form = new formidable.IncomingForm( {
			uploadDir, maxFileSize : 200 * 1024 * 1024 * 1024 } );

		form.parse( req, function( err, fields, files ) {

			outputDir = path.join(deskDir, unescape(fields.uploadDir));

		} );

		form.on( 'file', ( name, file ) => files.push( file ) );

		form.on( 'error', ( err ) => log( "upload error : " + err ) );

		form.on( 'end', async () => {

			const length = files.length;

			while ( files.length ) {

				const file = files.pop();
				log( "file : " + file.filepath.toString() );
				const fullName = path.join( outputDir, file.originalFilename );
				let newFile, index = 0;

				do {

					newFile = fullName + ( index > 0 ? "." + index : "" );
					index++

				} while ( await fs.exists( newFile ) )

				await fs.move( file.filepath.toString(), newFile );
				log( "uploaded to " +  newFile );

			}

			if ( length ) res.send( 'file(s) uploaded successfully' );

		} );

	} )
	.use( homeURL, express.static( __dirname + '/node_modules/desk-ui/compiled/dist' ),
		express.static( deskDir ), directory( deskDir ) );

let server, baseURL = "http://";

if ( fs.existsSync( privateKeyFile ) && fs.existsSync( certificateFile ) ) {

	server = https.createServer( {

		key: fs.readFileSync( privateKeyFile ),
		cert: fs.readFileSync( certificateFile )

	}, app );

	baseURL = "https://";

} else {

	server = http.createServer( app );

}

const io = socketIO( server, { path : path.join( homeURL, 'socket.io' ),
	maxHttpBufferSize : 1e8 } );

function log ( message ) {

	console.log( message );
	if ( io ) io.emit( "log", message );

}

log( "Start : " + new Date().toLocaleString() );

let publicDirs = {};

function updatePublicDirs () {

	const dirs = actions.getSettings().dataDirs;
	publicDirs = {};

	for ( let [ dir, props ] of Object.entries( dirs ) ) {

		if ( props.public ) publicDirs[ dir ] = true;

	}

	if ( Object.keys ( publicDirs ).length ) {

		log( "public data : " + Object.keys( publicDirs ).join(', ') );

	}

}

actions.on( 'actions updated', updatePublicDirs );
updatePublicDirs();

function updatePassword() {

	try { id = JSON.parse( fs.readFileSync( passwordFile ) ); }
	catch ( e ) {

		log( "error while reading password file : " );
		log( e );

	}

	if ( id.password ) {

		// convert to secure format
		const shasum = crypto.createHash( 'sha256' );
		shasum.update( id.password );
		id.sha256 = shasum.digest( 'hex' );
		delete id.password;
		fs.writeFileSync( passwordFile, JSON.stringify( id ) );

	}

}

updatePassword();
fs.watchFile( passwordFile, updatePassword );

actions.oldEmit = actions.emit;
actions.emit = ( e, d ) => { io.emit( e, d ); return actions.oldEmit( e, d ) };

io.on( 'connection', socket => {

	try {

		const auth = ( socket.request.headers.authorization || "" ).slice( 6 );
		const id = ( '' + Buffer.from( auth, 'base64' ) ).split( ':' );
		authenticate( ...id );

	} catch ( e ) { return socket.disconnect(); }

	const ip = ( socket.client.conn.request.headers[ 'x-forwarded-for' ]
		|| socket.handshake.address ).split( ":" ).pop();

	log( new Date().toString() + ': connect : ' + ip );
	socket.emit( "actions updated", actions.getSettings() );

	socket.on( 'disconnect', () => log( new Date().toString() + ': disconnect : ' + ip ) )
		.on( 'action', action => actions.execute( action ) )
		.on( 'setEmitLog', log => actions.setEmitLog( log ) )
		.on( 'password', password => {

			const shasum = crypto.createHash( 'sha256' );
			shasum.update( password );
			id.sha256 = shasum.digest( 'hex' );
			fs.writeFileSync( passwordFile, JSON.stringify( id ) );

		} );

} );

const terms = {};

if ( actions.getSettings().permissions ) io.of( '/xterm' ).on( 'connection', socket => {

	try {

		const auth = ( socket.request.headers.authorization || "" ).slice( 6 );
		const id = ( '' + Buffer.from( auth, 'base64' ) ).split( ':' );
		authenticate( ...id );

	} catch ( e ) { return socket.disconnect(); }

	socket.on( 'newTerminal', function( options, cb ) {

		if ( terms[ options.name ] ) return;
		log( "new terminal : " + options.name );
		io.of( '/xterm' + options.name ).on( 'connection', socket => {

			const term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {

				name: 'xterm-color',
				cols: 80,
				rows: 24,
				cwd: process.env.HOME,
				env: process.env

			} );

			term.on('data', data => {

				try { socket.send( data ); }
				catch ( ex ) { console.warn( ex ); }

			} );

			terms[ options.name ] = true;

			socket.on( 'resize', size => term.resize( size.nCols, size.nRows ) )
				.on( 'message', msg => term.write(msg) )
				.on( 'disconnect', async () => {

					term.kill();
					const name = '/xterm' + options.name;
					io.of( name ).removeAllListeners();
					io._nsps.delete( name );// Remove from the server namespaces
					log( "namespaces : " + Array.from( io._nsps.keys() ).join( ',' ) );
					delete terms[ options.name ];

				} );

		} );

		if ( cb ) cb();

	} );

} );

server.listen( port );
log ( "server running : " + baseURL + "localhost:" + port + homeURL );

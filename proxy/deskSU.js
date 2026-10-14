const path = require( 'path' ),
      { execSync } = require( 'child_process' );

const user = process.env.DESK_USER;

if ( !user ) {

	console.error( 'deskSU: DESK_USER environment variable is required' );
	process.exit( 1 );

}

if ( typeof process.getuid !== 'function' || process.getuid() !== 0 ) {

	console.error( 'deskSU: must be started as root to drop privileges to user ' + user );
	process.exit( 1 );

}

try {

	execSync( 'id -u ' + user, { stdio : 'ignore' } );

} catch ( err ) {

	console.error( 'deskSU: system user ' + user + ' does not exist' );
	process.exit( 1 );

}

process.initgroups( user, user );
process.setgid( user );
process.setuid( user );
process.title = 'desk';

const script = process.env.DESK_STARTUP || path.join(__dirname, '../desk.js' );
console.log( 'executing ' + script + ' as user ' + user );
require( script );

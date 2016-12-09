const path = require( 'path' );

var user = process.env.DESK_USER;
process.initgroups( user, user );
process.setgid( user );
process.setuid( user );

const script = process.env.DESK_STARTUP || path.join(__dirname, '../desk.js' );
console.log( 'executing ' + script + ' as user ' + user );
require( script );

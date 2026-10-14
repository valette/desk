// Pure CLI argument parser for manage.mjs. Kept side-effect free so it can be
// unit tested directly. Supports: [action] [user] [--config <file>] [--https]
// [--help|-h].
export function parseArgs ( argv ) {

	// returns { action, user, config, https, help }
	let action = undefined,
	    user   = undefined,
	    config = undefined,
	    https  = false,
	    help   = false;

	for ( let i = 0 ; i < argv.length ; i++ ) {

		const arg = argv[ i ];

		if ( arg === '--config' ) config = argv[ ++i ];
		else if ( arg === '--https' ) https = true;
		else if ( arg === '--help' || arg === '-h' ) help = true;
		else if ( !action ) action = arg;
		else if ( !user ) user = arg;
		else throw "unexpected argument : " + arg;

	}

	return { action, user, config, https, help };

}

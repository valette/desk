// Pure CLI argument parser for manage.mjs. Kept side-effect free so it can be
// unit tested directly. Supports: [action] [user] [--config <file>] [--https]
// [--subdomains <true|false>] [--help|-h].
export function parseArgs ( argv ) {

	// returns { action, user, config, https, subdomains, help }
	let action     = undefined,
	    user       = undefined,
	    config     = undefined,
	    https      = false,
	    subdomains = undefined,
	    help       = false;

	for ( let i = 0 ; i < argv.length ; i++ ) {

		const arg = argv[ i ];

		if ( arg === '--config' ) config = argv[ ++i ];
		else if ( arg === '--https' ) https = true;
		else if ( arg === '--subdomains' ) {

			const value = argv[ ++i ];
			if ( value === 'true' ) subdomains = true;
			else if ( value === 'false' ) subdomains = false;
			else throw "--subdomains expects 'true' or 'false' : " + value;

		}
		else if ( arg === '--help' || arg === '-h' ) help = true;
		else if ( !action ) action = arg;
		else if ( !user ) user = arg;
		else throw "unexpected argument : " + arg;

	}

	return { action, user, config, https, subdomains, help };

}

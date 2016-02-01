var	execSync  = require('child_process').execSync,
	process   = require('process');

var user = process.env.DESK_USER;
process.initgroups(user, user);
process.setgid(user);
process.setuid(user);

var env = {};
var userEnv = {
	USER : user,
	CCACHE_DIR : "/home/" + user + "/.ccache",
	HOME : "/home/" + user,
	LOGNAME : user
};
Object.keys(process.env).forEach(key => (env[key] = process.env[key]));
Object.keys(userEnv).forEach(key => (env[key] = userEnv[key]));

console.log('executing "' + process.env.DESK_CMD + '" as user ' + user);
execSync(process.env.DESK_CMD, {
	stdio: 'inherit',
	env : env
});
process.exit(1);

var fs    = require('fs'),
    exec  = require('child_process').exec,
    async = require('async');

var users = require ('./users.json').users;
var publicDir='/public'

function makePubDir (user, callback) {
	var pubDir = publicDir + user;
	 // create user directory if it does not exist
	if (!fs.existsSync(pubDir)) {
		exec('id -u ' + user, function (err, stdout) {
			var UID = parseInt(stdout, 10);
			if (!fs.existsSync(pubDir)) {
				fs.mkdirSync(pubDir);
				// group 500 is 'creatis' group
				fs.chownSync(pubDir, UID, 500);
				exec('chmod g+s '+pubDir, function () {
					callback();
				});
			}
		});
	}

	// add user to group 'creatis'
	exec('useradd -G creatis '+user);

	// create symlink to public dir if not present
	publicLink = '/home/' + user + '/desk/data/public';
	if  (!fs.existsSync(publicLink) && 
		(fs.existsSync(publicDir))) {
		fs.symlinkSync(publicDir, publicLink);
	}
}

async.forEach(users, makePubDir);


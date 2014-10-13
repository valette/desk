var	forever   = require('forever'),
	fs        = require('fs'),
	mkdirp    = require('mkdirp'),
	path      = require('path'),
	_         = require('underscore');
	userid    = require ("userid");

var config = __dirname + '/config.json';
var defaultFile;
var uidPrefix = 'desk-';

var tasks;
var fileWatchers = {};

var separator = "#####################################################"

function updateTasks(callback) {
	console.log(separator);
	forever.list(false, function (err, result) {
		try {
			tasks = result || [];
			console.log(tasks.length + " already running forever tasks");

			var content = JSON.parse(fs.readFileSync(config))
			var users = _.uniq(content.users);
			defaultFile = path.resolve(__dirname + "/../desk.js");

			console.log(users.length + " users");
			users.forEach(update);

			console.log(separator);
			// shutdown not wanted tasks
			tasks.forEach(function (task, index) {
				if (task.uid.indexOf(uidPrefix) !== 0) {
					return;
				}
				if (!_.some(users, function (user) {
					return task.uid === getUID(user);
				})) {
					console.log("stop task " + task.uid);
					forever.stop(index);
					var user = task.uid.substr(5);
					fs.unwatchFile(getUserConfigFile(user), fileWatchers[user]);
				}
			});
		} catch (err) {
			console.log("error while updating, check" + config + " : ");
			console.log(err);
		}
	});
}

function getUserConfigFile (user) {
	return path.join('/home/', user, 'desk/config.json');
}

function getUID(user) {
	return uidPrefix + user;
}

function update (user) {
	var deskPath = path.join('/home/', user, 'desk');
	mkdirp.sync(deskPath);
	fs.chownSync(deskPath, userid.uid(user), userid.gid(user));

	var show = false;
	var message = '';
	message += "*** " + user + " ***";

	var uid  = getUID(user),
	    file = defaultFile,
	    config = getUserConfigFile(user);

	function onFileChange (curr, prev) {
		if ((curr.mtime > prev.mtime) || (curr.dev === 0)) {
			console.log(config + " modified, updating user " + user);
			update(user);
		}
	}

	if (fs.existsSync(config)) {
		try {
			file = JSON.parse(fs.readFileSync(config)).boot;
			if (file) {
				message += "\nusing custom js file : " + file;
			}
		} catch (err) {
			message += '\nerror while reading ' + config;
			file = undefined;
		}
	}

	if (fileWatchers[user] === undefined) {
		fs.watchFile(config, onFileChange);
		fileWatchers[user] = onFileChange;
	}

	var previousTask = _.find(tasks, function (task) {
		return task.uid === uid;
	});

	if (previousTask) {
		// server is already up
		if (previousTask.file === file) {
			return;
		}
		console.log(message);
		console.log("restart task for user " + user);
		forever.stop(_.indexOf(tasks, previousTask));
	} else {
		console.log(message);
		if (file) {
			console.log('start task for user ' + user);
		}
	}

	if (file === undefined) {
		console.log("no script provided : aborting start");
		return;
	}

	if (!fs.existsSync(file)) {
		console.log("error : file " + file + " does not exist");
		return;
	}

	var logFile = path.join(deskPath, 'log.txt');

	forever.startDaemon (file, {
		silent : true,
		options: ['--user=' + user],
		cwd : path.dirname(file),
		outFile : logFile,
		errFile : logFile,
		uid : uid
	});
}


// watch routes files for auto-update
fs.watchFile(config, function (curr, prev) {
	if (curr.mtime > prev.mtime) {
		console.log(new Date().toDateString() + " " + new Date().toTimeString());
		console.log(config + ' modified, updating...');
		updateTasks();
	}
});

updateTasks();
console.log('Watching file ' + config + ' for tasks');

var	forever   = require('forever'),
	fs        = require('fs'),
	mkdirp    = require('mkdirp'),
	path      = require('path'),
	_         = require('underscore');
	userid    = require ("userid");

var config = __dirname + '/config.json',
	uidPrefix = 'desk-';

var fileWatchers = {},
	start,
	tasks,
	rootUsers;

var separator = "#####################################################"

function updateTasks() {
	console.log(separator);
	forever.list(false, function (err, result) {
		try {
			tasks = result || [];
			console.log(tasks.length + " already running forever tasks");

			var content = JSON.parse(fs.readFileSync(config))
			var users = _.uniq(content.users);
			start = content.start;
			rootUsers = content.rootUsers || [];

			console.log(users.length + " users");
			users.forEach(update);

			console.log(separator);
			// shutdown not wanted tasks
			tasks.forEach(function (task, index) {
				if (task.uid.indexOf(uidPrefix) !== 0) {
					return;
				}
				if (!_.some(users, function (user) {
					return task.uid === getForeverUID(user);
				})) {
					console.log("stop task " + task.uid);
					forever.stop(index);
					var user = task.uid.substr(5);
					fs.unwatchFile(getUserConfigFile(user), onModification);
					delete fileWatchers[user];
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

function getForeverUID(user) {
	return uidPrefix + user;
}

function update (user) {
	var deskPath = path.join('/home/', user, 'desk');
	mkdirp.sync(deskPath);
	fs.chownSync(deskPath, userid.uid(user), userid.gid(user));

	var show = false,
		message = "*** " + user + " ***",
		foreverUID  = getForeverUID(user),
	    options = start.split(' '),
	    file = options.shift(),
	    userConfig = getUserConfigFile(user);

	if (fs.existsSync(userConfig)) {
		try {
			var boot = JSON.parse(fs.readFileSync(userConfig)).boot;
			options = boot.split(" ");
			file = options.shift();
			if (file) {
				message += "\nusing custom command : " + boot;
			}
		} catch (err) {
			message += '\nerror while reading ' + userConfig;
			file = undefined;
		}
	}

	if (!fileWatchers[user]) {
		fs.watchFile(userConfig, onModification);
		fileWatchers[user] = true;
	}

	var previousTask = _.find(tasks, function (task) {
		return task.uid === foreverUID;
	});

	if (previousTask) {
		// server is already up
		if (previousTask.file  + " " + previousTask.options.join(" ") === 
			file + " " + options.join(" ")) {
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
		options: options,
		cwd : path.dirname(file),
		env : {USER : user},
		outFile : logFile,
		errFile : logFile,
		logFile : logFile,
		spawnWith : _.indexOf(rootUsers, user) < 0? {uid : userid.uid(user), gid : userid.gid(user)} : {},
		uid : foreverUID
	});
}

// watch routes files for auto-update
fs.watchFile(config, onModification);

function onModification(curr, prev) {
	if (curr.mtime > prev.mtime) {
		console.log(new Date().toDateString() + " " + new Date().toTimeString());
		console.log('Updating...');
		updateTasks();
	}
}

updateTasks();
console.log('Watching file ' + config + ' for tasks');

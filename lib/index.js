var	actions      = require(__dirname + '/cl-rpc.js');
	cacheCleaner = require(__dirname + '/cacheCleaner.js');
	CronJob      = require('cron').CronJob,
	EventEmitter = require('events').EventEmitter,
	libpath      = require('path'),
	ms           = require('ms'),
	os           = require('os'),
	socket       = require(__dirname + '/cl-socket');

// base directory where all data files are (data, cache, actions, ..)
var rootDir = libpath.join(os.homedir(), 'desk') + '/';

var server;

socket.setSocketRoot(rootDir);

var maxAge = ms('30d');

exports.server = function () {

	server = true;
	cacheCleaner.on("log", function (message) {
		actions.emit("log", message)
	});

	new CronJob({
		cronTime: '0 0 ' + Math.floor(5 * Math.random()) + ' * * *',
		onTick: function () {
			cacheCleaner.cleanCache(libpath.join(rootDir, 'cache'), maxAge);
		},
		start: true
	});

	actions.setRootDir(rootDir);
	socket.serve(actions);
	return actions;

};

exports.client = function () {

	return {execute : socket.execute};

}


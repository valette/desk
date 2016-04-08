var	async      = require('async'),
	execSync   = require('child_process').execSync,
	fs         = require('fs'),
	mkdirp     = require('mkdirp'),
	path       = require('path'),
	pm2        = require('pm2');

var config = JSON.parse(fs.readFileSync(__dirname + '/config.json'));
var proxyUser = "dproxy"

pm2.connect(function(err) {
	async.each(config.users, function (user, callback) {
		console.log("Starting " + user);
		var cwd = '/home/' + user + '/desk/';
		if (!fs.existsSync(cwd)) {
			mkdirp.sync(cwd);
			var id = parseInt(execSync('id -u ' + user));
			var group = parseInt(execSync('id -g ' + user));
			fs.chownSync(cwd, id, group);
			console.log("Created desk directory for user " + user);
		}
		var logFile = cwd + 'log.txt';
		var settings = {
			"name"       : user,
			"script"     : __dirname + "/deskSU.js",
			"cwd"        : cwd,
			"error_file" : logFile,
			"out_file"   : logFile,
			"merge_logs" : true,
			"env": {
				"DESK_USER" : user,
				"DESK_MEMORY_RATIO" : "0.1",
				"PORT" : config.basePort + config.users.indexOf(user),
				"DESK_CMD" : "node "	+ path.join(__dirname, '../desk.js --multi')
			}
		};

		var userConfig = path.join('/home/', user, 'desk/config.json');
		if (fs.existsSync(userConfig)) {
			try {
				var boot = JSON.parse(fs.readFileSync(userConfig)).boot;
				if (boot) {
					console.log("using custom command : " + boot);
					settings.env.DESK_CMD = "node " + boot;
				}
			} catch (err) {
				console.log('\nerror while reading ' + userConfig);
				console.log(err);
				settings = null;
			}
		}

		if (settings) {
			pm2.start(settings, callback);
		} else {
			callback();
		}
	}, function (err) {
		var cwd = '/home/' + proxyUser + '/desk/';
		var logFile = cwd + 'log.txt';
		var proxy = {
			"name"       : "PROXY",
			"script"     : __dirname + "/proxy.js",
			"error_file" : logFile,
			"out_file"   : logFile,
			"merge_logs" : true,
			"exec_mode"  : 'cluster_mode',
			"instances"  : 4
		};
		pm2.start(proxy, function () {
			pm2.disconnect();
		});
	});
});

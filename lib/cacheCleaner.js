var	async        = require('async'),
	exec         = require('child_process').exec,
	EventEmitter = require('events').EventEmitter,
	fs           = require('fs'),
	libpath      = require('path'),
	ms           = require('ms');

exports = module.exports = new EventEmitter();

exports.cleanCache = function (dir, maxAge) {
	exports.emit('log', new Date().toLocaleString() 
		+ ' : clean cache (maxAge : '+ ms(maxAge, {long: true}) + ')'); 

	if (!fs.existsSync(dir)) {
		exports.emit('log', 'error : wrong cache directory :' + dir);
		return;
	}

	function getDirs(dir, iterator) {
		fs.readdir(dir, function (err, files) {
			async.eachSeries(files, function (file, callback) {
				var fullFile = libpath.join(dir, file);
				fs.stat(fullFile, function (err, stats) {
					if (stats.isDirectory()) {
						iterator(fullFile, stats);
					}
					callback();
				});
			});
		});
	}

	getDirs(dir, function (dir) {
		getDirs(dir, function (dir2) {
			getDirs(dir2, function (dir3, stats) {
				var time = stats.mtime.getTime();
				var currentTime = new Date().getTime();
				var age = currentTime - time;
				if (age > maxAge) {
					exports.emit('log', 'deleting cache ' + libpath.basename(dir3) +
						' (' + ms(age, { long: true }) + ' old)'); 
					deleteQueue.push(dir3);
				}
			});
		});
	});

	var deleteQueue = async.queue(function (directory, callback) {
		exec('rm -rf ' + libpath.relative(dir, directory), {cwd : dir},
			function (e) {
				if (e) {
					exports.emit('log', e);
				}
				callback();
			}
		);
	}, 1);
};

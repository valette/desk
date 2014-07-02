var	async       = require('async'),
	exec        = require('child_process').exec,
	fs          = require('fs'),
	libpath     = require('path'),
	ms          = require('ms');

exports.cleanCache = function (dir, maxAge) {
	console.log('Starting cache cleaning (delete folders older than ' +
		ms(maxAge, { long: true }) + ')'); 

	if (!fs.existsSync(dir)) {
		console.log ('error' , 'wrong cache directory :' + dir);
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
					console.log('deleting cache ' + libpath.basename(dir3) +
						' (' + ms(age, { long: true }) + ' old)'); 
					deleteQueue.push(dir3);
				}
			});
		});
	});

	var deleteQueue = async.queue(function (directory, callback) {
		exec('rm -rf ' + libpath.relative(dir, directory), {cwd : dir},
			function (e) {
				if (e) console.log(e);
				callback();
			}
		);
	}, 1);
};

var async = require('async'),
    fs    = require('fs-extra');

exports.execute = function (parameters, callback) {
	var dir = parameters.directory;

	async.waterfall([
		function (callback) {
			fs.readdir(dir, callback)
		},
		function (files, callback) {
			async.map(files, function (file, callback) {
				fs.stat(libPath.join(dir, file), function (err, stats) {
					callback(null, {name : file, size : stats.size,
							isDirectory : stats.isDirectory(),
							mtime : stats.mtime.getTime()});
				});
			}, callback);
		}],
		function (error, files) {
			callback (error, JSON.stringify(files || []));
		}
	);
};

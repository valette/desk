var fs    = require('fs-extra');

exports.execute = function (parameters, callback) {
	fs.exists(parameters.path, function (exists) {
		callback (null, JSON.stringify(exists));
	});
};

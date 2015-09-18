var fs = require('fs-extra');

exports.execute = function (parameters, callback) {
	fs.mkdirs(parameters.directory, callback);
};

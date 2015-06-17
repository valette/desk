var mkdirp = require('mkdirp');

exports.execute = function (parameters, callback) {
	console.log("here");
	console.log(parameters.directory);
	mkdirp(parameters.directory, callback);
};

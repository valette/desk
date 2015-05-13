var fs     = require('fs'),
	mkdirp = require('mkdirp');

exports.execute = function (parameters, callback) {

	var path = parameters.filesRoot + "/" + parameters.output_directory;
	mkdirp(path, function (err) {
		if ( err ) {
			callback( err.message );
			return;
		}

		var dataBuffer = new Buffer(parameters.base64data, 'base64');
		fs.writeFile(path + "/" + parameters.file_name, dataBuffer, function(err) {
			callback (err, "OK");
		});
	});
}

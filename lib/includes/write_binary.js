var fs = require('fs'),
	mkdirp = require('mkdirp');

exports.execute = function (parameters, callback) {
	mkdirp(parameters.output_directory, function (err) {
		if ( err ) {
			callback( err.message );
			return;
		}

		fs.writeFile(parameters.output_directory + "/" + parameters.file_name,
			new Buffer(parameters.base64data, 'base64'), function(err) {
				callback (err, "OK");
		});
	});
};

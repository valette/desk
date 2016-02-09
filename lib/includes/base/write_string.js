var fs = require('fs-extra');

exports.execute = function (parameters, callback) {
	fs.mkdirs(parameters.output_directory, function (err) {
		if ( err ) {
			callback( err.message );
			return;
		}

		fs.writeFile(parameters.output_directory + "/" + parameters.file_name,
			parameters.data, function(err) {
				callback (err, "OK");
		});
	});
};

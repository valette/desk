var fs = require('fs');

exports.execute=function (parameters, callback) {
	fs.writeFile(parameters.filesRoot+"/"+parameters.output_directory+
		"/"+parameters.file_name, parameters.data, function(err) {
		callback (err, "OK");
	});
}

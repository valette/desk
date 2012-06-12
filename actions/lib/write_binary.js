var fs = require('fs');

exports.execute=function (parameters, callback) {
	var dataBuffer = new Buffer(parameters.base64data, 'base64');
	fs.writeFile(parameters.filesRoot+"/"+parameters.output_directory+
		"/"+parameters.file_name, dataBuffer, function(err) {
		callback (err, "OK");
	});
}

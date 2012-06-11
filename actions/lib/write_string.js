var exec = require('fs');

exports.execute=function (parameters, callback) {
	fs.writeFile(parameters.file_name, parameters.data), function (err) {
		callback (err, "OK");
	}
}

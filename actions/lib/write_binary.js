var exec = require('fs');

exports.execute=function (parameters, callback) {
	var dataBuffer = new Buffer(parameters.base64Data, 'base64');
	fs.writeFile(parameters.file_name, dataBuffer, function(err) {
		callback (err, "OK");
	});
}

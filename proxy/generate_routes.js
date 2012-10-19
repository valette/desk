var fs    = require('fs'),
    exec  = require('child_process').exec,
    os    = require('os'),
    async = require('async');

var users = require ('./users.json').users;

var router = {};

function fillRouter(user, callback) {
	exec('id -u ' + user, function (err, stdout) {
		var UID = parseInt(stdout, 10);
		router['desk.creatis.insa-lyon.fr/'+user] =
             	   'desk.creatis.insa-lyon.fr:' + UID + '/' + user;
		callback();
	});
}

async.forEachSeries(users, fillRouter, function () {
	fs.writeFileSync('routes.json', JSON.stringify({router : router}, null, '\t'));
});

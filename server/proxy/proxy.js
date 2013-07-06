var fs = require('fs'),
    http = require('http'),
    httpProxy = require('http-proxy'),
    exec  = require('child_process').exec,
    async = require('async');

var usersFile = __dirname + '/users.json';

var options = {
	https: {
		key: fs.readFileSync(__dirname+'/privatekey.pem', 'utf8'),
		cert: fs.readFileSync(__dirname+'/certificate.pem', 'utf8')
	},
	router: {}
};

var proxyServer = httpProxy.createServer(options);
var port = 8081;
console.log('desk-proxy service listening on port ' + port);
proxyServer.listen(port);

var server = http.createServer(function (req, res) {
	res.writeHead(301,
		{Location: 'https://desk.creatis.insa-lyon.fr' + req.url});
	res.end();
});
server.listen(8080);
console.log('desk-http2https service listening on port 8080');

var routes;
fs.watchFile(usersFile, updateRoutes);

function updateRoutes() {
	console.log(new Date());
	console.log(usersFile + ' modified, updating routes...');
	var users = JSON.parse(fs.readFileSync(usersFile)).users;
	routes = {};

	async.forEachSeries(users, addUser, function () {
		proxyServer.proxy.proxyTable.setRoutes(routes);
		console.log('... done! Routes:');
		console.log(routes);
	});
}

console.log('Watching file ' + usersFile + ' for routes');

function addUser(user, callback) {
        exec('id -u ' + user, function (err, stdout) {
                var UID = parseInt(stdout, 10);
                routes['desk.creatis.insa-lyon.fr/' + user] =
                   'desk.creatis.insa-lyon.fr:' + UID + '/' + user;
                callback();
        });
}

updateRoutes();


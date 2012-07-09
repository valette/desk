var fs      = require('fs'),
    express = require("express"),
    qs      = require('querystring'),
   	exec    = require('child_process').exec;

var app;

var privateKeyFile="privatekey.pem";
var certificateFile="certificate.pem";

var URLBase;

if (fs.existsSync(privateKeyFile) && fs.existsSync(certificateFile)) {
	var privateKey = fs.readFileSync(privateKeyFile).toString();
	var certificate = fs.readFileSync(certificateFile).toString();
    app = express.createServer({key: privateKey, cert: certificate});
    console.log("using secure https mode");
    URLBase="https://";
}
else {
    app = express.createServer();
    console.log("no certificate and/or private keys provided, using non secure mode");
    URLBase="http://";
}


var actions=require('./actions');

var path = "trunk/";
var dataRoot=path+"ext/php/";
var port = 1337;

path=fs.realpathSync(path)+"/";
dataRoot=fs.realpathSync(dataRoot)+"/";

app.post('/ext/php/listDir.php', function(req, res){
	var body = '';
	req.on('data', function (data) {
		body += data;
	});
	req.on('end', function () {
        var POST = qs.parse(body);

		actions.listDir(POST.dir, function (message) {
			res.send(message);
		});
	});
});

app.post('/ext/php/actions.php', function(req, res){
	res.connection.setTimeout(0);
	var body = '';
	req.on('data', function (data) {
		body += data;
	});
	req.on('end', function () {
        var POST = qs.parse(body);
        actions.performAction(POST, function (message) {
			res.send(message);
		});
	});
});

app.get('/ext/php/clearcache.php', function(req, res){
	exec("rm -rf *",{cwd:dataRoot+"/cache"}, function (err) {
		res.send("cache cleared!");
	});
});

app.get('/ext/php/clearactions.php', function(req, res){
	exec("rm -rf *",{cwd:dataRoot+"/actions"}, function (err) {
		res.send("actions cleared!");
	});
});

app.configure(function(){
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(express.static(path));
  app.use(express.directory(path));
  app.use(express.errorHandler({
    dumpExceptions: true, 
    showStack: true
  }));
  app.use(app.router);
});

actions.setupActions(dataRoot, function () {
	app.listen(port);
	console.log ("server running on port "+port+", serving path "+path);
	console.log(URLBase+"localhost:"+port);
});

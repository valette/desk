var path = "trunk/";

var port = 1337;

var fs      = require('fs'),
    express = require("express");

var app;

var privateKeyFile="privatekey.pem";
var certificateFile="certificate.pem";
var separator="********************************************************************************";

var baseURL;
path=fs.realpathSync(path)+"/";

console.log(separator);

// run the server in normal or secure mode depending on provided certificate
if (fs.existsSync(privateKeyFile) && fs.existsSync(certificateFile)) {
	var privateKey = fs.readFileSync(privateKeyFile).toString();
	var certificate = fs.readFileSync(certificateFile).toString();
	app = express.createServer({key: privateKey, cert: certificate});
	console.log("using secure https mode");
	baseURL="https://";
}
else {
	app = express.createServer();
	console.log("no certificate provided, using non secure mode");
	baseURL="http://";
	console.log("you can generate a certificate with these 3 commands:");
	console.log("(1) openssl genrsa -out privatekey.pem 1024");
	console.log("(2) openssl req -new -key privatekey.pem -out certrequest.csr");
	console.log("(3) openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem");
}
console.log(separator);

//configure server : static file serving, errors
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

// setup actions
var actions=require('./actions');
actions.setup(path+"ext/php/", app, function () {
	app.listen(port);
	console.log(separator);
	console.log ("server running on port "+port+", serving path "+path);
	console.log(baseURL+"localhost:"+port);
});

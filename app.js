var path = "trunk/";

var port = 1337;

var fs      = require('fs'),
    express = require("express");

var app;

var passwordFile="./password.json";
var privateKeyFile="privatekey.pem";
var certificateFile="certificate.pem";
var separator="********************************************************************************";

var baseURL;
path=fs.realpathSync(path)+"/";

console.log(separator);

// look for password.json file.
if (fs.existsSync(passwordFile)) {
	var identity=require(passwordFile);
	console.log("Using basic authentication");
	console.log(separator);
} else {
	console.log("No password file "+passwordFile+" provided");
	console.log("see "+passwordFile+".example file for an example");
	console.log(separator);
	var identity=null;
}

function authorize(username, password) {
	if (identity) {
	    return identity.username === username & identity.password === password;
    }
    else {
    	return true;
    }
}

// run the server in normal or secure mode depending on provided certificate
if (fs.existsSync(privateKeyFile) && fs.existsSync(certificateFile)) {
	var privateKey = fs.readFileSync(privateKeyFile).toString();
	var certificate = fs.readFileSync(certificateFile).toString();
	app = express.createServer({key: privateKey, cert: certificate});
	console.log("Using secure https mode");
	baseURL="https://";
}
else {
	app = express.createServer();
	console.log("No certificate provided, using non secure mode");
	baseURL="http://";
	console.log("You can generate a certificate with these 3 commands:");
	console.log("(1) openssl genrsa -out privatekey.pem 1024");
	console.log("(2) openssl req -new -key privatekey.pem -out certrequest.csr");
	console.log("(3) openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem");
}
console.log(separator);

//configure server : static file serving, errors
app.configure(function(){
  app.use(express.basicAuth(authorize)),
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

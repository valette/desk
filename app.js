var fs      = require('fs'),
    express = require('express'),
    http    = require ('http'),
    https   = require ('https');

var path = "trunk/";
var port = 1337;

path=fs.realpathSync(path);

var passwordFile="./password.json";
var privateKeyFile="privatekey.pem";
var certificateFile="certificate.pem";
var separator="*******************************************************************************";

console.log(separator);

var user=process.env.USER;
console.log("Running as user : "+user);

console.log(separator);

//configure server : static file serving, errors
var app=express();
app.configure(function(){

	// set upload limit
	app.use(express.limit('20000mb'));

	// look for password.json file.
	// use basicAuth depending on password.json
	var identity=null;
	if (fs.existsSync(passwordFile)) {
		var identity=require(passwordFile);
		if ( (typeof identity.username !== "string") ||
			(typeof identity.password !== "string")) {
			identity=null;
		}
	}

	function authorize(username, password) {
		return identity.username === username & identity.password === password;
	}

	if (identity) {
		app.use(express.basicAuth(authorize));
		console.log("Using basic authentication");
		console.log(separator);
	} else {
		console.log("No password file "+passwordFile+" provided or incorrect file");
		console.log("see "+passwordFile+".example file for an example");
		console.log(separator);
	}

	// usual configration for express
	app.use(express.methodOverride());
	var uploadDir=path+'/ext/php/data/upload';
	if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir);
	}

	app.use(express.bodyParser({uploadDir: uploadDir }));
	app.use('/'+user,express.static(path));
	app.use('/'+user,express.directory(path));

	// handle uploads
	app.post('/'+user+'/ext/php/upload', function(req, res) {
		var files=req.files.upload;
		function dealFile(file) {
			fs.rename(file.path.toString(), uploadDir+'/'+file.name.toString(), function(err) {
				if (err) throw err;
				// delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
				fs.unlink(file.path.toString(), function() {
				    if (err) throw err;
				});
			});
		};

		if (files.path === undefined ) {
			for (var i=0;i<files.length;i++) {
				dealFile(files[i]);		
			}
		}
		else {
			dealFile(files);
		}
		res.send('files uploaded!');
	});

	app.get('/'+user+'/ext/php/upload', function(req, res){
		res.send('<form action="/'+user+'/ext/php/upload" enctype="multipart/form-data" method="post">'+
			'<input type="text" name="title"><br>'+
			'<input type="file" name="upload" multiple="multiple"><br>'+
			'<input type="submit" value="Upload">'+
			'</form>');
	});

	// handle errors
	app.use(express.errorHandler({
	dumpExceptions: true, 
	showStack: true
	}));

	// use router
	app.use(app.router);
});

var server;
var baseURL;
// run the server in normal or secure mode depending on provided certificate
if (fs.existsSync(privateKeyFile) && fs.existsSync(certificateFile)) {
	var options = {
		key: fs.readFileSync('privatekey.pem').toString(),
		cert: fs.readFileSync('certificate.pem').toString()
	};
	server = https.createServer(options, app);
	console.log("Using secure https mode");
	baseURL="https://";
}
else {
	server=http.createServer(app);
	console.log("No certificate provided, using non secure mode");
	console.log("You can generate a certificate with these 3 commands:");
	console.log("(1) openssl genrsa -out privatekey.pem 1024");
	console.log("(2) openssl req -new -key privatekey.pem -out certrequest.csr");
	console.log("(3) openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem");
	baseURL="http://";
}
console.log(separator);

// setup actions
var actions=require('./actions');
actions.setup("/"+user, path+"/ext/php/", app, function () {
	server.listen(port);
	console.log(separator);
	console.log ("server running on port "+port+", serving path "+path);
	console.log(baseURL+"localhost:"+port+'/'+user);
});

var	actions      = require(__dirname + '/lib/cl-rpc');
	argv         = require('yargs').argv,
	auth         = require('basic-auth'),
	bodyParser   = require('body-parser'),
	browserify   = require('browserify-middleware'),
	compress     = require('compression'),
	crypto       = require('crypto'),
	directory    = require('serve-index'),
	express      = require('express'),
	formidable   = require('formidable'),
    fs           = require('fs'),
	http         = require('http'),
	https        = require('https'),
	libPath      = require('path'),
	mkdirp       = require('mkdirp'),
	mv           = require('mv'),
	os           = require('os'),
	socketIO     = require('socket.io');

var homeURL = '/',
	port = 8080,
	user = process.env.USER;

if (argv.multi) {
	homeURL = '/' + user + '/';
	port = process.getuid();
}

// hijack console.log
var oldConsolelog = console.log;
console.log = function (message) {
	if (io) {io.emit("log", message);}
	oldConsolelog(message);
}

var separator = "*******************************************************************************";
console.log(separator);
console.log(separator);

// user parameters
var clientPath = fs.realpathSync(__dirname + '/../client/') + '/';

// configure express server
var app = express();
app.use(compress());
app.set('trust proxy', true);

// transmit homeURL cookie
app.use (function (req, res, next) {
	res.cookie('homeURL', homeURL);
	next();
});

var	homeDir = process.platform === "darwin" ? '/Users' : '/home',
	deskDir = libPath.join(homeDir, user, 'desk') + '/',
	uploadDir = libPath.join(deskDir, 'upload') + '/',
	extensionsDir = libPath.join(deskDir, 'extensions') + '/';

// make desk and upload directories if not existent
mkdirp.sync(deskDir);
mkdirp.sync(uploadDir);

// certificate default file names
var passwordFile = libPath.join(deskDir, "password.json"),
	privateKeyFile = "privatekey.pem",
	certificateFile = "certificate.pem";

console.log('Welcome to Desk');
console.log('Running as user : ' + user);
console.log(separator);

var id = {username : user, password : "password"};
// look for correctly formated password.json file.
if (fs.existsSync(passwordFile)) {
	id = require(passwordFile);
}

if (id.password) {
	// convert to more secure format
	var shasum = crypto.createHash('sha1');
	shasum.update(id.password);
	id.sha = shasum.digest('hex');
	delete id.password;
	fs.writeFileSync(passwordFile, JSON.stringify(id));
}

if (id.username && id.sha) {
	app.use(function(req, res, next) {
		var user = auth(req) || {};
		var shasum = crypto.createHash('sha1');
		shasum.update(user.pass || '');
		if (user && user.name === id.username && shasum.digest('hex') === id.sha) {
			next();
			return;
		}
		res.statusCode = 401;
		res.setHeader('WWW-Authenticate', 'Basic realm="' +
			"please enter your login/password" + '"');
		res.end('Unauthorized');
	});
	console.log("Using basic authentication");
} else {
	console.log("No password file " + passwordFile + " provided or incorrect file");
	console.log("see " + passwordFile + ".example file for an example");
}

// handle body parsing
app.use(bodyParser.urlencoded({limit : '10mb', extended : true}));

var router = express.Router();
app.use(homeURL, router);

var rpc = express.Router();
router.use('/rpc', rpc);

var rootPath = libPath.join(clientPath, 'default');
if (!fs.existsSync(rootPath)) {
	rootPath = libPath.join(clientPath, 'application/release');
	console.log('serving default folder application/release/');
} else {
	console.log('serving custom default folder');
}
router.use('/', express.static(rootPath))
.use('/files', express.static(deskDir))
.use('/files', directory(deskDir))
.use('/', express.static(clientPath))
.use('/', directory(clientPath));

// handle third part js libraries compilation
var cacheExists,
	browserGet,
	jsFiles = libPath.join(__dirname, 'cache', 'browserified.js'),
	serveCache = express.static(libPath.join(__dirname, 'cache'));

function testCache() {
	cacheExists = fs.existsSync(jsFiles);
	if (!cacheExists && !browserGet) {
		browserGet = browserify(__dirname + '/browserify.js', 
			browserify.settings[argv.debug ? 'debug' : 'production']);
	}
}

testCache();
fs.watchFile(jsFiles, testCache);
router.use('/js', function (req, res, next) {
	(cacheExists ? serveCache : browserGet) (req, res, next);
});

rpc.post('/upload', function(req, res) {
	var form = new formidable.IncomingForm();
	form.uploadDir = uploadDir;
	form.parse(req, function(err, fields, files) {
		var file = files.file;
		var outputDir = fields.uploadDir.toString().replace(/%2F/g,'/') || 'upload';
		outputDir = libPath.join(deskDir, outputDir);
		console.log("file : " + file.path.toString());
		var fullName = libPath.join(outputDir, file.name.toString());
		console.log("uploaded to " +  fullName);
		mv(file.path.toString(), fullName, function(err) {
			if (err) throw err;
			res.send('file ' + file.name + ' uploaded successfully');
		});
	});
})
.post('/password', function(req, res){
	if (!req.body.password) {
		res.json({error : 'no password entered!'});
		return;
	}
	if (req.body.password.length > 4) {
		var shasum = crypto.createHash('sha1');
		shasum.update(req.body.password);
		id.sha = shasum.digest('hex');
		fs.writeFileSync(passwordFile, JSON.stringify(id));
		res.json({status : "password changed"});
	} else {
		res.json({error : 'password too short!'});
	}
})
.get('/exists', function (req, res) {
	var path = req.query.path;
	fs.exists(libPath.join(deskDir, path), function (exists) {
		console.log('exists : ' + path	+ ' : ' + exists);
		res.json({exists : exists});
	});
})
.get('/ls', function (req, res) {
	var path = libPath.normalize(req.query.path) + '/';
	actions.validatePath(path, function (error) {
		if (error) {
			res.json({error : error});
			return;
		}
		actions.getDirectoryContent(path, function (message) {
			res.send(message);
		});
	});
})
.get('/download', function (req, res) {
	var file = req.query.file;
	actions.validatePath(file, function (error) {
		if (error) {
			res.send(error);
			return;
		}
		res.download(libPath.join(deskDir, file));
	});
});

console.log(separator);

var server;
var baseURL;

// run the server in normal or secure mode depending on provided certificate
if (fs.existsSync(privateKeyFile) && fs.existsSync(certificateFile)) {
	server = https.createServer({
		key: fs.readFileSync(privateKeyFile),
		cert: fs.readFileSync(certificateFile)
	}, app);
	console.log("Using secure https mode");
	baseURL = "https://";
} else {
	server = http.createServer(app);
	console.log("No certificate provided, using non secure mode");
	console.log("You can generate a certificate with these 3 commands:");
	console.log("(1) openssl genrsa -out privatekey.pem 1024");
	console.log("(2) openssl req -new -key privatekey.pem -out certrequest.csr");
	console.log("(3) openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem");
	baseURL = "http://";
}
console.log(separator);

// make extensions directory if not present
mkdirp.sync(extensionsDir);
actions.setRoot(deskDir);

actions.addDirectory(libPath.join(__dirname, 'includes'));
actions.addDirectory(extensionsDir);
var dns = require("dns");
var io = socketIO(server, {path : libPath.join(homeURL, "socket/socket.io")});
io.on('connection', function(socket) {
	var client;
	dns.reverse(socket.client.conn.request.headers['x-forwarded-for'] 
			|| socket.handshake.address, function (err, domains) {
		client = domains.join(" ");
		console.log('a user connected : ' + client);
	});
	socket.on('disconnect', function(){
		console.log('user ' + client + ' disconnected');
	});
	socket.on('action', function(parameters){
		actions.performAction(parameters, function (response) {
			io.emit("action finished", response);
		});
	});
});

actions.on("actionsUpdated", function () {io.emit("actions updated");});
actions.on("log", function (message) {io.emit("log", message);});

server.listen(port);
console.log(separator);
console.log(new Date().toLocaleString());
console.log ("server running on port " + port);
console.log(baseURL + "localhost:" + port + homeURL);
if (id) {
	console.log('login as : user : ' + id.username);
}

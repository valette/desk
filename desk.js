var	actions      = require(__dirname + '/lib/cl-rpc');
	argv         = require('yargs').argv,
	async        = require('async'),
	auth         = require('basic-auth'),
	bodyParser   = require('body-parser'),
	browserify   = require('browserify-middleware'),
	compress     = require('compression'),
	crypto       = require('crypto'),
	directory    = require('serve-index'),
	dns          = require("dns"),
	express      = require('express'),
	formidable   = require('formidable'),
    fs           = require('fs'),
	http         = require('http'),
	https        = require('https'),
	libPath      = require('path'),
	mkdirp       = require('mkdirp'),
	mv           = require('mv'),
	os           = require('os'),
	osenv        = require('osenv'),
	socketIO     = require('socket.io'),
	validator    = require('validator');

var homeURL         = argv.multi ? '/' + osenv.user() + '/' : '/',
	port            = argv.multi ? process.getuid() : 8080,
	clientPath      = libPath.join(__dirname, 'client') + '/',
	privateKeyFile  = libPath.join(__dirname, "privatekey.pem"),
	certificateFile = libPath.join(__dirname, "certificate.pem"),
	deskDir         = libPath.join(osenv.home(), 'desk') + '/',
	passwordFile    = libPath.join(deskDir, "password.json"),
	uploadDir       = libPath.join(deskDir, 'upload') + '/',
	extensionsDir   = libPath.join(deskDir, 'extensions') + '/',
	emitLog         = false;
	id              = {username : osenv.user(), password : "password"};

function log (message) {
	console.log(message);
	if (io && emitLog) {
		io.emit("log", message);
	}
};

// configure express server
var app = express();
app.use(compress());
app.set('trust proxy', true);

// transmit homeURL cookie
app.use (function (req, res, next) {
	res.cookie('homeURL', homeURL);
	next();
});

mkdirp.sync(deskDir);
mkdirp.sync(uploadDir);

fs.watchFile(passwordFile, updatePassword);
function updatePassword() {
	log("load " + passwordFile);
	if (fs.existsSync(passwordFile)) {
		try {
			id = JSON.parse(fs.readFileSync(passwordFile));
		}
		catch (e) {
			log("error while reading password file : ");
			log(e);
			id = {};
		}
	}

	if (id.password) {
		// convert to secure format
		var shasum = crypto.createHash('sha1');
		shasum.update(id.password);
		id.sha = shasum.digest('hex');
		delete id.password;
		fs.writeFileSync(passwordFile, JSON.stringify(id));
	}
}
updatePassword();

app.use(function(req, res, next) {
	var user = auth(req) || {};
	var shasum = crypto.createHash('sha1');
	shasum.update(user.pass || '');
	if ((id.username === undefined) || (id.sha === undefined)
		|| (user && user.name === id.username && shasum.digest('hex') === id.sha)) {
			next();
			return;
	}
	res.setHeader('WWW-Authenticate', 'Basic realm="login/password?"');
	res.sendStatus(401);
});

app.use(bodyParser.urlencoded({limit : '10mb', extended : true}));

var router = express.Router();
app.use(homeURL, router);

var rpc = express.Router();
router.use('/rpc', rpc);

router.use('/', express.static(libPath.join(clientPath, 'application/build')))
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
	cacheExists = fs.existsSync(jsFiles) && !argv.debug;
	if (!cacheExists && !browserGet) {
		browserify.settings('transform', ['cssify']);
		browserify.settings.mode = argv.debug ? 'development' : 'production';
		browserGet = browserify(__dirname + '/lib/browserified.js');
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
		log("file : " + file.path.toString());
		var fullName = libPath.join(outputDir, file.name.toString());
		log("uploaded to " +  fullName);
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
		res.json(exists);
	});
})
.get('/ls', function (req, res) {
	var path = libPath.normalize(req.query.path);
	var realDir = libPath.join(deskDir, path);
	async.waterfall([
		function (callback) {
			actions.validatePath(path, callback);
		},

		function (callback) {
			fs.readdir(realDir, callback)
		},

		function (files, callback) {
			async.map(files, function (file, callback) {
				fs.stat(libPath.join(realDir, file), function (err, stats) {
					callback(null, {name : file, size : stats.size,
							isDirectory : stats.isDirectory(),
							mtime : stats.mtime.getTime()});
				});
			}, callback);
		}],
		function (error, files) {
			res.send(files);
		}
	);
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

var server;
var baseURL;
if (fs.existsSync(privateKeyFile) && fs.existsSync(certificateFile)) {
	server = https.createServer({
		key: fs.readFileSync(privateKeyFile),
		cert: fs.readFileSync(certificateFile)
	}, app);
	log("Using secure https mode");
	baseURL = "https://";
} else {
	server = http.createServer(app);
	log("No certificate provided, using non secure mode");
	baseURL = "http://";
}

var io = socketIO(server, {path : libPath.join(homeURL, "socket/socket.io")});
io.on('connection', function (socket) {
	var client;
	var ip = (socket.client.conn.request.headers['x-forwarded-for']
		|| socket.handshake.address).split(":").pop();

	if (validator.isIP(ip)) {
		dns.reverse(ip, function (err, domains) {
			client = (domains || ["no_domain"]).join(" ");
			log('connect : ' + ip + ' ('  + client + ')');
		});
	} else {
		log('connect : ' + ip);
	}

	socket.on('disconnect', function() {
			log('disconnect : ' + ip + ' (' + client + ')');
		})
		.on('action', function(parameters) {
			actions.performAction(parameters, function (response) {
				io.emit("action finished", response);
			});
		})
		.on('setLog', function(value) {
			emitLog = value;
		});
});

mkdirp.sync(extensionsDir);

actions.on("actionsUpdated", function () {
		io.emit("actions updated");
	})
	.on("log", log)
	.setRoot(deskDir)
	.includeDirectory(extensionsDir);

server.listen(port);
log(new Date().toLocaleString());
log ("server running on port " + port);
log(baseURL + "localhost:" + port + homeURL);

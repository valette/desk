'use strict';

const actions    = require('desk-base'),
      argv       = require('yargs').argv,
      auth       = require('basic-auth'),
      bodyParser = require('body-parser'),
      compress   = require('compression'),
      crypto     = require('crypto'),
      directory  = require('serve-index'),
      express    = require('express'),
      formidable = require('formidable'),
      fs         = require('fs-extra'),
      fwd        = require('fwd'),
      http       = require('http'),
      https      = require('https'),
      path       = require('path'),
      os         = require('os'),
      process    = require('process'),
      socketIO   = require('socket.io');

const certificateFile = path.join(__dirname, "certificate.pem"),
      deskDir         = actions.getRootDir(),
      homeURL         = argv.multi ? '/' + process.env.USER + '/' : '/',
      port            = argv.multi ? process.env.PORT : 8080,
      passwordFile    = path.join(deskDir, "password.json"),
      privateKeyFile  = path.join(__dirname, "privatekey.pem"),
      uploadDir       = path.join(deskDir, 'upload') + '/';

let baseURL, server, io,
	id = {
		username : process.env.USER,
		password : "password"
	};

let app = express()
	.use(compress())
	.set('trust proxy', true)
	.use (function (req, res, next) {
		res.cookie('homeURL', homeURL);
		next();
	})
	.use(function(req, res, next) {
		let user = auth(req) || {};
		let shasum = crypto.createHash('sha1');
		shasum.update(user.pass || '');
		if ((id.username === undefined)
			|| (id.sha === undefined)
			|| (user && user.name === id.username && shasum.digest('hex') === id.sha)) {
				next();
				return;
		}
		res.setHeader('WWW-Authenticate', 'Basic realm="login/password?"');
		res.sendStatus(401);
	})
	.use(bodyParser.urlencoded({limit : '10mb', extended : true}));

fs.mkdirsSync(deskDir);
fs.mkdirsSync(uploadDir);

actions.include(__dirname + '/extensions');

if (fs.existsSync(privateKeyFile) && fs.existsSync(certificateFile)) {
	server = https.createServer({
		key: fs.readFileSync(privateKeyFile),
		cert: fs.readFileSync(certificateFile)
	}, app);
	baseURL = "https://";
} else {
	server = http.createServer(app);
	baseURL = "http://";
}

io = socketIO(server, {path : path.join(homeURL, 'socket.io')});

function log (message) {
	console.log(message);
	io.emit("log", message);
}

log("Start : " + new Date().toLocaleString());

fs.watchFile(passwordFile, updatePassword);
function updatePassword() {
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
		let shasum = crypto.createHash('sha1');
		shasum.update(id.password);
		id.sha = shasum.digest('hex');
		delete id.password;
		fs.writeFileSync(passwordFile, JSON.stringify(id));
	}
}
updatePassword();

function moveFile(file, outputDir) {
	log("file : " + file.path.toString());
	let fullName = path.join(outputDir, file.name);
	let index = 0;
	let newFile;

	function tryToMove() {
		newFile = fullName + ( index > 0 ? "." + index : "" );
		fs.exists(newFile, function (exists) {
			if (exists) {
				index++;
				move();
				return;
			}
			fs.move(file.path.toString(), newFile, function(err) {
				if (err) throw err;
				log("uploaded to " +  newFile);
			});
		});
	}

	tryToMove();
}

let router = express.Router()
	.post('/upload', function(req, res) {
		let form = new formidable.IncomingForm();
		let outputDir;
		let files = [];
		form.uploadDir = uploadDir;
		form.parse(req, function(err, fields, files) {
			outputDir = path.join(deskDir, unescape(fields.uploadDir));
		});

		form.on('file', (name, file) => files.push(file));
		form.on('end', function() {
			res.send('file(s) uploaded successfully');
			files.forEach(file => moveFile(file, outputDir));
		});
	})
	.post('/password', function(req, res) {
		if (!req.body.password) {
			res.json({error : 'no password entered!'});
			return;
		}
		if (req.body.password.length > 4) {
			let shasum = crypto.createHash('sha1');
			shasum.update(req.body.password);
			id.sha = shasum.digest('hex');
			fs.writeFileSync(passwordFile, JSON.stringify(id));
			res.json({status : "password changed"});
		} else {
			res.json({error : 'password too short!'});
		}
	})
	.use('/', express.static(__dirname + '/node_modules/desk-ui/build'),
		express.static(deskDir),
		directory(deskDir));

app.use(homeURL, router);

io.on('connection', function (socket) {
	let ip = (socket.client.conn.request.headers['x-forwarded-for']
		|| socket.handshake.address).split(":").pop();

	log('connect : ' + ip);
	io.emit("actions updated", actions.getSettings());

	socket.on('disconnect', () => log('disconnect : ' + ip))
		.on('action', action => actions.execute(action,
			res => io.emit("action finished", res)))
		.on('setEmitLog', log => actions.setEmitLog(log));

    fwd(actions, socket);
});

server.listen(port);
log ("server running : " + baseURL + "localhost:" + port + homeURL);

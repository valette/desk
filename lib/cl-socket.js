var ipc     = require('node-ipc');

exports.setSocketRoot = function (root) {
	ipc.config.socketRoot = root;
}
ipc.config.silent = true;

var serverId = 'socket';

var execute = 'execute';
var finished = 'action finished';

exports.serve = function (actions) {
	ipc.config.id = serverId;
	
	ipc.serve(function () {
		ipc.server.on(execute,
			function(action, socket) {
				actions.execute(action, function (response) {
					ipc.server.emit(socket, finished, response);
				});
			}
		);
	});
	ipc.server.start();
};

var callbacks = {};

var connected;
function connect (callback) {
	ipc.config.id = Math.random().toPrecision(6).toString();
	ipc.connectTo(serverId, callback);

	ipc.of[serverId].on(finished,
		function(res){
			callbacks[res.handle](res.err, res);
		}
	);
};

var connected;
exports.execute = function (action, callback) {
	if (!connected) {
		connect(function () {
			connected = true;
			exports.execute(action, callback);
		});
		return;
	}
	var handle = Math.random();
	action.handle = handle;

	callbacks[handle] = callback;
	ipc.of[serverId].emit(execute, action);
};

exports.disconnect = function () {
	ipc.disconnect(serverId);
}

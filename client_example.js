var	actions = require(__dirname + '/lib/index.js').client();

// beware : this code requires a running DESK server instance

actions.execute({action : "sleep", time_in_seconds : 2},
	function (err, res) {
		console.log("err : ");
		console.log(err);
		console.log("res : ");
		console.log(res);
		process.exit(0);
	}
);

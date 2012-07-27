var http = require('http'),
    httpProxy = require('http-proxy');
    express = require("express");

require('systemd');

// set up plain http server
var http = express.createServer();

// set up a route to redirect http to https
http.get('*',function(req,res){ 
//res.send("hello world*****\n");
    res.redirect('https://desk'+req.url)
})

// have it listen on 8080
var port = process.env.LISTEN_PID > 0 ? 'systemd' : 8080;
console.log('desk-http2https service listening on port '+port);
http.listen(port);


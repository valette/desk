var http = require('http'),
    httpProxy = require('http-proxy');
    express = require("express");

// set up plain http server
var http = express.createServer();

// set up a route to redirect http to https
http.get('*',function(req,res){ 
console.log("ici"); 
    res.redirect('https://desk'+req.url)
})

// have it listen on 8080
http.listen(8080);


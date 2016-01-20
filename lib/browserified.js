/**
 * Client dependencies injected via browserify
 */

async     = require('async');
numeric   = require('numeric');
kdTree    = require('kdt');
_         = require('lodash');
            require('../client/ext/mhdParse.js');
Heap      = require('heap');
randomJS  = require('random-js');
prettyData= require('pretty-data').pd;

THREE     =	require('three');
			require('three/examples/js/controls/TransformControls.js');
			require('../client/ext/VTKLoader.js');
			require('../client/ext/TrackballControls2.js');
			require('../client/ext/CTMLoader.js');
			require('three/examples/js/loaders/ctm/lzma.js');
			require('three/examples/js/loaders/ctm/ctm.js');

jsSHA     = require("jssha");

if (typeof importScripts == 'function') {
	// we are in a worker
	return;
}
require('operative');
operative.setBaseURL(window.location.protocol + '//' 
	+ window.location.host 
	+ (qx.bom.Cookie.get("homeURL") || window.location.pathname) 
	+ '/');

io        = require('socket.io-client');
c3        = require ('c3');
			require ('../node_modules/c3/c3.css');

var ace   = require('brace');
			require('brace/mode/c_cpp');
			require('brace/mode/html');
			require('brace/mode/javascript');
			require('brace/mode/json');
			require('brace/theme/eclipse');
			require('brace/ext/searchbox');
			require("brace/ext/language_tools");

Detector  = require('three/examples/js/Detector.js');

var work  = require('webworkify');

THREE.CTMLoader.prototype.createWorker = function () {
	return work(require('../client/ext/CTMWorker.js'));
}

THREE.VTKLoader.prototype.createWorker = function () {
	return work(require('../client/ext/VTKWorker.js'));
}

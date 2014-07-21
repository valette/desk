/**
 * Client dependencies injected via browserify
 */
var work = require('webworkify');

async    = require('async');
_        = require('underscore');
operative = require('operative');
io = require('socket.io-client');

THREE = require('./../client/ext/three.js/three.js');
require('./../client/ext/three.js/VTKLoader.js');
require('./../client/ext/three.js/TrackballControls2.js');
require('./../client/ext/three.js/ctm/CTMLoader.js');
var w = work.createURL(require('./../client/ext/three.js/ctm/CTMWorker.js'));

THREE.CTMLoader.prototype.createWorker = function () {
	return new Worker(w);
}

require('./../client/ext/kdTree.js');
require('./../client/ext/numeric-1.2.6.min');
require('./../client/ext/mhdParse.js');


var ace = require('brace');
require('brace/mode/javascript');
require('brace/mode/c_cpp');
require('brace/mode/json');
require('brace/theme/eclipse');
require('brace/ext/searchbox');

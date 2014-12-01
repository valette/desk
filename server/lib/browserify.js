/**
 * Client dependencies injected via browserify
 */

async    = require('async');
_        = require('underscore');
operative = require('operative');
io = require('socket.io-client');
numeric = require('numeric');
kdTree = require ('kdt');
c3 = require ('c3');
Heap = require('heap');

var ace = require('brace');
require('brace/mode/c_cpp');
require('brace/mode/html');
require('brace/mode/javascript');
require('brace/mode/json');
require('brace/theme/eclipse');
require('brace/ext/searchbox');
require("brace/ext/language_tools");

var work = require('webworkify');

Detector = require('../../client/ext/three.js/Detector.js');
THREE = require('../../client/ext/three.js/three.js');
require('../../client/ext/three.js/VTKLoader.js');
require('../../client/ext/three.js/TrackballControls2.js');
require('../../client/ext/three.js/ctm/CTMLoader.js');
require('../../client/ext/three.js/ctm/lzma.js');
require('../../client/ext/three.js/ctm/ctm.js');

THREE.CTMLoader.prototype.createWorker = function () {
	return work(require('../../client/ext/three.js/ctm/CTMWorker.js'));
}

THREE.VTKLoader.prototype.createWorker = function () {
	return work(require('../../client/ext/three.js/VTKWorker.js'));
}

require('../../client/ext/mhdParse.js');

/**
 * Client dependencies injected via browserify
 */

async    = require('async');
_        = require('underscore');
operative = require('operative');
io = require('socket.io-client');

THREE = require('./../client/ext/three.js/three.js');
require('./../client/ext/three.js/VTKLoader.js');
require('./../client/ext/three.js/TrackballControls2.js');
require('./../client/ext/three.js/ctm/CTMLoader.js');

require('./../client/ext/kdTree.js');
require('./../client/ext/numeric-1.2.6.min');
require('./../client/ext/mhdParse.js');



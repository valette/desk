/**
 * Client dependencies injected via browserify
 */
require ('../../client/deskUI/build/script/deskui.js')
window.qx = qx;

async    = require('async');
_        = require('underscore');

Detector = require('../../client/ext/three.js/Detector.js');
THREE = require('../../client/ext/three.js/three.js');
require('../../client/ext/three.js/VTKLoader.js');
require('../../client/ext/three.js/TrackballControls2.js');

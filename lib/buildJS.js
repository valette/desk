var browserify = require('browserify'),
	gulp       = require('gulp'),
	rename     = require('gulp-rename'),
	streamify  = require('gulp-streamify'),
	uglify     = require('gulp-uglify'),
	source     = require('vinyl-source-stream');

var input = __dirname + '/browserified.js';

var modules = [
	'async',
	'heap',
	'lodash',
	'operative'
];

console.log("Compressing client code...");

browserify(input, { require : [modules]})
	.bundle()
	.pipe(source(input))
	.pipe(streamify(uglify({output : {ascii_only : true}})))
	.pipe(rename('browserified.js'))
	.pipe(gulp.dest(__dirname + '/../cache'));

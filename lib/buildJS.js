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
	'operative',
	{file : __dirname + '/desk-client.js', expose: 'desk-client'}
];

console.log("Compressing client code...");

var appRoot = __dirname + '/../client/application/'

browserify(input, { require : [modules]})
	.bundle()
	.pipe(source(input))
	.pipe(rename('bundle.js'))
	.pipe(gulp.dest(appRoot + 'source/script'))
	.pipe(streamify(uglify({output : {ascii_only : true}})))
	.pipe(gulp.dest(appRoot + 'build/script'));

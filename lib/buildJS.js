var browserify = require('browserify'),
	gulp       = require('gulp'),
	rename     = require('gulp-rename'),
	streamify  = require('gulp-streamify'),
	uglify     = require('gulp-uglify'),
	source     = require('vinyl-source-stream');

var input = __dirname + '/browserified.js';

console.log("Compressing client code...");

browserify(input)
	.bundle()
	.pipe(source(input))
	.pipe(streamify(uglify({output : {ascii_only : true}})))
	.pipe(rename('browserified.js'))
	.pipe(gulp.dest(__dirname + '/../cache'));

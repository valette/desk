var browserify = require('browserify'),
	gulp       = require('gulp'),
	rename     = require('gulp-rename'),
	source     = require('vinyl-source-stream'),
	streamify  = require('gulp-streamify'),
	uglify     = require('gulp-uglify');
 
gulp.task('default', function() {
	browserify(__dirname + '/lib/browserified.js').bundle()
		.pipe(source(__dirname + '/lib/browserified.js'))
		.pipe(streamify(uglify()))
		.pipe(rename('browserified.js'))
		.pipe(gulp.dest(__dirname + '/cache'));
});

var browserify = require('browserify'),
    gulp       = require('gulp'),
    transform  = require('vinyl-transform'),
    uglify     = require('gulp-uglify');
    
gulp.task('default', function () {
	var browserified = transform(
		function(filename) {
			return browserify(filename).bundle();
		});

	return gulp.src([__dirname + '/lib/browserified.js'])
		.pipe(browserified)
		.pipe(uglify())
		.pipe(gulp.dest(__dirname + '/cache'));
});

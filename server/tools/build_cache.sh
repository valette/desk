mkdir cache
browserify lib/browserify.js | uglifyjs > cache/browserified.js

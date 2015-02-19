mkdir cache
browserify -t cssify lib/browserify.js | uglifyjs > cache/browserified.js

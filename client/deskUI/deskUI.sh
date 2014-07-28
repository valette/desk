./generate.py build
cd ../../server
browserify deskUI.js |  uglifyjs -o ../client/deskUI/build/script/deskUI.js
cd ../client/deskUI

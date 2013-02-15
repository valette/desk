desk
====

#### Remote desktop for medical imaging ####

The aim of the project is to create a remote desktop for visualization and processing of medical images. Only works under linux, but patches are welcome!

### License ###
CeCILL-B (BSD-compatible)


### Dependencies ###
To install desk on your computer, you need:
	 * node.js
	 * vtk+ headers
	 * cmake

### Installation ###

	git checkout https://github.com/valette/desk.git
	cd desk/server
	npm install
	./build.sh

### Usage ###

	cd desk/server
	node desk.js

then point your browser to localhost:8080
login as user : your username, pass : password


### Change log ###

2013 02 15 - initial release


DESK Exposing Server Kit
========================

#### Remote desktop ####

DESK  is a remote desktop, originally for visualization and processing of medical images. It currently only works under linux or Mac OS, but patches are welcome!

This repository contains the node.js code to run the server.
There are also two local versions available (run locally on your computer) : 
* [desk-electron](https://github.com/valette/desk-electron)
* [desk-nw](https://github.com/valette/desk-nw)

#### Goals ####

The goal is to be able to use efficient visualisation tools such as THREE.js and qooxdoo on top of already existing commandline programs.

each program as registered as an 'action', provided by a .json file. As an example, you can have a look at the ACVD.json config file on the [ACVD repository](https://github.com/valette/ACVD)

### Infos and live demo ###

a live demo is visible here: [https://desk.creatis.insa-lyon.fr/demo/](https://desk.creatis.insa-lyon.fr/demo/)

more infos? Click here [http://www.creatis.insa-lyon.fr/site/fr/desk](http://www.creatis.insa-lyon.fr/site/fr/desk)

### License ###
CeCILL-B (BSD-compatible), if you use this code for academic purposes, please cite this article:

[Link to PDF](http://hal.archives-ouvertes.fr/hal-00732335) H. Jacinto, R. Kéchichan, M. Desvignes, R. Prost, and S. Valette, "A Web Interface for 3D Visualization and Interactive Segmentation of Medical Images", 17th International Conference on 3D Web Technology (Web 3D 2012), Los-Angeles, USA, pp. 51-58, 2012

Copyright (c) CNRS, INSA-Lyon, UCBL, INSERM

### Dependencies ###
To install desk on your computer, you need:
* git
* node.js

to visualize 3D data (meshes, volumes) you also need;

* vtk + headers (versions 5 or 6)
* cmake

### Installation ###
	git clone http://github.com/valette/desk.git
	cd desk
	npm install

to install binary addons for 3D data visualization (needs vtk and cmake):

	npm run buildAddons

### Usage ###

	node desk.js

then point your browser to [localhost:8080](http://localhost:8080)

login as:
- user : your linux username
- password : "password"

The desk API is visible here :  [http://localhost:8080/ui/api](http://localhost:8080/ui/api)

### Debug ###
Building the debug version is done as follows : 

	cd node_modules/desk-ui
	npm install		// takes some time
	npm run build	// also takes some time

Afterwards, the debug version is here : [http://localhost:8080/ui/source](http://localhost:8080/ui/source)

### Acknowledgements ###

This software benefits from several open-source contributions:
* [VTK](http://www.vtk.org/)
* [node.js](http://www.nodejs.org/)
* [three.js](http://www.threejs.org/)
* [qooxdoo](http://www.qooxdoo.org/)
* [OpenCTM](http://openctm.sourceforge.net/)
* [ACVD](http://github.com/valette/ACVD.git)

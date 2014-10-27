desk
====

#### Remote desktop for medical imaging ####

The aim of the project is to create a remote desktop for visualization and processing of medical images. Only works under linux or Mac OS, but patches are welcome!

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
* vtk + headers
* cmake

### Installation ###

	git clone http://github.com/valette/desk.git
	cd desk/server
	npm install

to install binary addons for 3D data visualization :

	tools/build.sh

### Usage ###

	node desk.js

then point your browser to [localhost:8080](http://localhost:8080)

login as:
- user : your linux username
- password : "password"

### Acknowledgements ###

This software benefits from several open-source contributions:
* [VTK](http://www.vtk.org/)
* [node.js](http://www.nodejs.org/)
* [three.js](http://www.threejs.org/)
* [qooxdoo](http://www.qooxdoo.org/)
* [OpenCTM](http://openctm.sourceforge.net/)
* [ACVD](http://github.com/valette/ACVD.git)



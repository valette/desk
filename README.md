DESK Exposing Server Kit
========================

<p align="center">
  <img src="https://www.creatis.insa-lyon.fr/~valette/public/project/desk/featured_hub9df65f39462830ba627a3faff4f1e76_507899_720x2500_fit_q75_h2_lanczos_3.webp">
</p>

DESK  is a remote desktop, originally for visualization and processing of medical images. It currently only works under linux or Mac OS, but patches are welcome!

This repository contains the node.js code to run the server. The source code for the UI is available here: [https://github.com/valette/desk-ui](https://github.com/valette/desk-ui)

There are also two local versions available (run locally on your computer) : 
* [desk-electron](https://github.com/valette/desk-electron)
* [desk-nw](https://github.com/valette/desk-nw)

#### Goals ####

The goal is to be able to use efficient visualisation tools such as THREE.js and qooxdoo on top of already existing server-side commandline programs.

Each server-side program is registered as an 'action', provided by a .json file. As an example, you can have a look at the ACVD.json file from the [ACVD repository](https://github.com/valette/ACVD)

DESK can also help to generate static content suited to release on the web. An example of static content served by a classic apache server is visible here : [http://www.creatis.insa-lyon.fr/~valette/200]([http://www.creatis.insa-lyon.fr/~valette/200])

### Infos and live demo ###

a live demo is visible here: [https://desk.creatis.insa-lyon.fr/demo/](https://desk.creatis.insa-lyon.fr/demo/)

more infos? Click here [http://www.creatis.insa-lyon.fr/~valette/desk.html](http://www.creatis.insa-lyon.fr/~valette/desk.html)

### License ###
CeCILL-B (BSD-compatible), if you use this code for academic purposes, please cite this article:

[Link to PDF](http://hal.archives-ouvertes.fr/hal-00732335) H. Jacinto, R. Kéchichan, M. Desvignes, R. Prost, and S. Valette, "A Web Interface for 3D Visualization and Interactive Segmentation of Medical Images", 17th International Conference on 3D Web Technology (Web 3D 2012), Los-Angeles, USA, pp. 51-58, 2012

Copyright (c) CNRS, INSA-Lyon, UCBL, INSERM

### Dependencies ###
To install desk on your computer, you need:
* git
* node.js

to visualize 3D data (meshes, volumes) you also need;

* vtk + headers
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
	git clone https://github.com/qooxdoo/qooxdoo
	npm install
	npm run build

Afterwards, the debug version is here : [http://localhost:8080/ui/source](http://localhost:8080/ui/source)

### Acknowledgements ###

This software benefits from several open-source contributions:
* [VTK](http://www.vtk.org/)
* [node.js](http://www.nodejs.org/)
* [three.js](http://www.threejs.org/)
* [qooxdoo](http://www.qooxdoo.org/)
* [OpenCTM](http://openctm.sourceforge.net/)
* [ACVD](http://github.com/valette/ACVD.git)

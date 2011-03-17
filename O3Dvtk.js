

o3djs.provide('o3djs.renderscene');

/**
 * A Module for user control of the camera / view matrix.
 * @namespace
 */
o3djs.renderscene = o3djs.renderScene || {};

o3djs.renderscene.createRenderScene = function(clientElement) {
  return new o3djs.renderscene.RenderScene(clientElement);
};

o3djs.renderscene.RenderScene = function(clientElement)
{
	this.o3dElement=clientElement;
	this.client = this.o3dElement.client;

	// Create a pack to manage the objects created.
	this.pack = this.client.createPack();

	// Create the render graph for a view.
	this.viewInfo = o3djs.rendergraph.createBasicView(
	  this.pack,
	  this.client.root,
	  this.client.renderGraphRoot,
	  [1, 1, 1, 1]); //background color

	// Create a new transform and parent the Shape under it.
	this.transform = this.pack.createObject('Transform');
	this.transform.parent = this.client.root;

	this.cameracontroller=o3djs.cameracontroller.createCameraController(
	[150,150,150],//centerPos,
	500,//backpedal,
	100,//heightAngle,
	100,//rotationAngle,
   0.8//fieldOfViewAngle,
   )//opt_onChange)

    this.client.renderMode = this.o3dElement.o3d.Client.RENDERMODE_ON_DEMAND;
	this.client.root.localMatrix=this.cameracontroller.calculateViewMatrix();

	o3djs.event.addEventListener(this.o3dElement, 'mousedown', startDragging);
	o3djs.event.addEventListener(this.o3dElement, 'mousemove', drag);
	o3djs.event.addEventListener(this.o3dElement, 'mouseup', stopDragging);
	o3djs.event.addEventListener(this.o3dElement, 'wheel', scrollMe); 

	this.o3dWidth = -1;
	this.o3dHeight = -1;
};

o3djs.renderscene.RenderScene.prototype.addMeshes = function(xmlFile) 
{
	var xmlhttp=new XMLHttpRequest();
	xmlhttp.open("GET",xmlFile+"?nocache=" + Math.random(),false);
//	xmlhttp.open("GET",xmlFile,false);
	xmlhttp.send();
	var readString=xmlhttp.responseXML;

	var meshes=readString.getElementsByTagName("mesh");
	var globalFlipSwitch=readString.getElementsByTagName("flip");
	var globalFlip=false;
	if (globalFlipSwitch.length!=0)
		globalFlip=true;

	var slashIndex=xmlFile.lastIndexOf("/");

	var path="";
	if (slashIndex>0)
		path=xmlFile.substring(0,slashIndex);

	var meshIndex=0;
	var numberOfMeshes=meshes.length;
	var scene=this;

	function loadOneMoreMesh()
	{
		if (meshIndex==numberOfMeshes)
		{
			meshIndex++;
			scene.client.render();
			return;
		}
		if (meshIndex>numberOfMeshes)
		{
			return;
		}

		var flip=0;
		var mesh=meshes[meshIndex];
		var file=mesh.getAttribute("Mesh");
		var Label=mesh.getAttribute("Label");
		var color=[1.0,1.0,1.0,1.0];
		if (mesh.hasAttribute("flip")||globalFlip)
			flip=1;
		if (mesh.hasAttribute("color"))
		{
			var colorstring=mesh.getAttribute("color");
			var colors=colorstring.split(" ");
			for (var j=0;j<4;j++)
				color[j]=parseFloat(colors[j]);
		}

		if ((meshIndex==Math.floor(numberOfMeshes/4))||(meshIndex==Math.floor(numberOfMeshes/2))
		||(meshIndex==Math.floor(numberOfMeshes*3/4)))
				updateClient();
		meshIndex++
		if (Label!="0")
		{
			createFromFile(scene, path+"/"+file,color,flip,loadOneMoreMesh);
		}
		else
			loadOneMoreMesh();
	}

	var numberOfParallelRequests=4;
	for (var n=0;n<numberOfParallelRequests;n++)
		loadOneMoreMesh();
};

function createDefaultMaterial(pack, viewInfo, color) {

	var transparency=0;
	if ((color[3]<0.99)&&(color[3]>0))
		transparency=1;

	var material=o3djs.material.createBasicMaterial(pack, viewInfo, color, transparency);

	material.getParam('lightWorldPos').value=[2000,2000,10000];
	material.getParam('emissive').value = [0.1, 0.1, 0.1 , 0.08];
	material.getParam('ambient').value = [0.1, 0.1, 0.1, 0.005];
	material.getParam('specular').value = [0.1, 0.1, 0.1, 0.01];
	material.getParam('shininess').value=0.02;
	material.getParam('specularFactor').value = 0.1;
	material.getParam('lightColor').value = [0.8, 0.8, 0.8, 0.5];
	return material;
}

function readVTKFile(filestring,vertexInfo ,positionStream , opt_flip){
	var reg2=new RegExp("[ \n]+", "gm");
	var data=filestring.split(reg2);
	
	// read point data
	var index=0;
	while (data[index]!="POINTS")
	{
		index++;
	}
	index++;
	var numberOfPoints=data[index];
	index++
	var coord=[0,0,0];
	var index2=0;
	while (1)
	{
		var number=parseFloat(data[index]);
		while (isNaN(number))
		{
			index++;
			number=parseFloat(data[index]);
		}
		coord[index2]=number;
		index2++;
		index++;
		if (index2==3)
		{
			index2=0;
			positionStream.addElement(coord[0],coord[1],coord[2]);
			numberOfPoints--;
			if (numberOfPoints==0)
			{
				break;
			}
		}
	}
	while (data[index]!="POLYGONS")
	{
		index++;
	}
	index++
	var connectivity=[0,0,0,0];
	var numberOfPolygons=data[index];
	index++;
	index++;
	index2=0;
	while (1)
	{
		var number=parseInt(data[index]);
		while (isNaN(number))
		{
			index++;
			number=parseInt(data[index]);
		}

		connectivity[index2]=number;
		index2++;
		index++;
		if (index2==connectivity[0]+1)
		{
			index2=0;
			if (!opt_flip)
			{
				vertexInfo.addTriangle(connectivity[1],connectivity[2],connectivity[3]);
				if (connectivity[0]==4)
					vertexInfo.addTriangle(connectivity[1],connectivity[3],connectivity[4]);
			}
			else
			{
				vertexInfo.addTriangle(connectivity[1],connectivity[3],connectivity[2]);
				if (connectivity[0]==4)
					vertexInfo.addTriangle(connectivity[1],connectivity[4],connectivity[3]);
			}

			numberOfPolygons--;
			if (numberOfPolygons==0)
			{
				break;
			}
		}
	}
}

function createFromFile(scene, file,color, opt_flip, opt_callback) {

	var xmlhttp=new XMLHttpRequest();
	xmlhttp.open("GET",file,true);
//	xmlhttp.open("GET",file+"?nocache=" + Math.random(),true);

	xmlhttp.onreadystatechange=handler;
	xmlhttp.send();

	function handler()
	{
		if(xmlhttp.readyState == 4)
		{
			if (xmlhttp.status!=200)
			{
				alert("Could not read file "+file+": error"+xmlhttp.status);
				return;
			}
			createFromFile2(xmlhttp, scene, file,color, opt_flip);
			if (opt_callback)
				opt_callback();
			return;
		}
	}

}

function createFromFile2(xmlhttp, scene, file,color, opt_flip) {
	var material=createDefaultMaterial(scene.pack, scene.viewInfo, color);
	if (color[3]<0)
	{
		var state = pack.createObject('State'); 
		material.state = state; 
		state.getStateParam('FillMode').value = o3dElement.o3d.State.WIREFRAME; 
	}
	var vertexInfo = o3djs.primitives.createVertexInfo();
	var positionStream = vertexInfo.addStream(
		3, o3djs.base.o3d.Stream.POSITION);
	var normalStream = vertexInfo.addStream(
		3, o3djs.base.o3d.Stream.NORMAL);

	var filename=file.split(".");
	var extension=filename[filename.length-1].toLowerCase();

	switch (extension)
	{
		case "vtk":
			var readString=xmlhttp.responseText;
			readVTKFile(readString,vertexInfo ,positionStream ,opt_flip);
			break;
		default:
		alert (extension+" file format not supported yet!");
	}

	var numberOfPoints=positionStream.numElements();
	var numberOfTriangles=vertexInfo.numTriangles();


// compute normals
	for (var i=0;i<numberOfPoints;i++)
		normalStream.addElement(0,0,0);

	for (var i=0;i<numberOfTriangles;i++)
	{
		var triangle=vertexInfo.getTriangle(i);
		var positions = [];
		for (var ii = 0; ii < 3; ++ii)
		{
			positions[ii] = positionStream.getElementVector(triangle[ii]);
		}

		var v0 = o3djs.math.normalize(o3djs.math.subVector(positions[1],positions[0]));
		var v1 = o3djs.math.normalize(o3djs.math.subVector(positions[2],positions[1]));
		var normal=o3djs.math.normalize(o3djs.math.cross(v0, v1));
		var norm=normal[0]*normal[0]+normal[1]*normal[1]+normal[2]*normal[2];
		if ((norm>0.98)&&(norm<1.01))
		{
			for (var iii=0;iii<3;iii++)
			{
				var currentPoint=triangle[iii];
				var normal2=normalStream.getElementVector(currentPoint);
				normalStream.setElementVector(currentPoint,
					o3djs.math.addVector(normal,normal2));
			}
		}
	}

	for (var i=0;i<numberOfPoints;i++)
	{
		var normal=normalStream.getElementVector(i);
		normalStream.setElementVector(i,o3djs.math.normalize(normal));
	}
	var shape=vertexInfo.createShape(scene.pack, material);
	scene.transform.addShape(shape);
}

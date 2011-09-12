o3djs.base.o3d = o3d;

o3djs.provide('o3djs.renderscene');

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
	this.meshesBoundingBox=new o3d.BoundingBox();
	this.meshesBoundingBox.minExtent=[10000,10000,10000];
	this.meshesBoundingBox.maxExtent=[-10000,-10000,-10000];

	// Create the render graph for a view.
	this.viewInfo = o3djs.rendergraph.createBasicView(
	  this.pack,
	  this.client.root,
	  this.client.renderGraphRoot,
	  [1, 1, 1, 1]); //background color
	this.viewInfo.performanceState.getStateParam('CullMode').value = 
             o3d.State.CULL_NONE;
	this.viewInfo.zOrderedState.getStateParam('CullMode').value = 
             o3d.State.CULL_NONE;


	// Create a new transform and parent the Shape under it.
	this.transform = this.pack.createObject('Transform');
	this.transform.parent = this.client.root;

	this.cameracontroller=o3djs.cameracontroller.createCameraController(
		[150,150,150],//centerPos,
		500,//backpedal,
		100,//heightAngle,
		100,//rotationAngle,
		0.3//fieldOfViewAngle,
		)//opt_onChange)

    this.client.renderMode = this.o3dElement.o3d.Client.RENDERMODE_ON_DEMAND;
	this.client.root.localMatrix=this.cameracontroller.calculateViewMatrix();

	var scene=this;
	this.dragging = false;

	function startDragging(e) {
		scene.dragging = true;
		var cameracontroller=scene.cameracontroller

		if ((e.shiftKey)||(e.button==1))
			cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.MOVE_CENTER_IN_VIEW_PLANE,e.x,e.y);
		else
		{
			if ((e.ctrlKey)||(e.button==1))
				cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.ROTATE_AROUND_Z,e.x,e.y);
			else
				cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.SPIN_ABOUT_CENTER,e.x,e.y);
		}
	}

	function drag(e) {
		if (scene.dragging==true) {
			scene.cameracontroller.mouseMoved(e.x,e.y);
			var matrix=scene.cameracontroller.calculateViewMatrix();
			scene.client.root.localMatrix=matrix;
			scene.render();
		}
	}

	function stopDragging(e) {
		scene.stopDragging();
	}

	function scrollMe(e) {
	  if (e.deltaY) {
		scene.cameracontroller.backpedal*=(e.deltaY < 0 ? 14 : 10)/12;
		scene.client.root.localMatrix=scene.cameracontroller.calculateViewMatrix();
		if (scene.cameracontroller.onChange!=null)
			scene.cameracontroller.onChange();
		scene.render();
	  }
	}

	o3djs.event.addEventListener(this.o3dElement, 'mousedown', startDragging);
	o3djs.event.addEventListener(this.o3dElement, 'mousemove', drag);
	o3djs.event.addEventListener(this.o3dElement, 'mouseup', stopDragging);
	o3djs.event.addEventListener(this.o3dElement, 'wheel', scrollMe); 

	this.o3dWidth = -1;
	this.o3dHeight = -1;
	this.resize();
};

o3djs.renderscene.RenderScene.prototype.loadMesh = function(file, callback, mtime, color) 
{
	var extension=file.substring(file.length-4, file.length);
	var scene=this;

	if (color==null)
		color=[1,1,1,1];

	switch (extension)
	{
		case ".vtk":
			createFromFile(this,file,color,callback, mtime);
			break;
		case ".xml":
			this.addMeshes(file, callback);
			break;
		default : 
			alert ("extension "+extension+" not supported!");
	}
}

o3djs.renderscene.RenderScene.prototype.bind = function(scene) 
{
	var myScene=this;
	var controller=scene.cameracontroller;
	var myController=myScene.cameracontroller;
	
	function onChange ()
	{
		myController.thisRot_=controller.thisRot_;
		myController.centerPos=controller.centerPos;
		myController.backpedal=controller.backpedal;
		myController.fieldOfViewAngle=controller.fieldOfViewAngle;
		myScene.client.root.localMatrix=myScene.cameracontroller.calculateViewMatrix();
		myScene.render();
	}
	scene.cameracontroller.onChange=onChange;
}

o3djs.renderscene.RenderScene.prototype.viewAll = function() 
{
	this.cameracontroller.viewAll(this.meshesBoundingBox,1);
	this.client.root.localMatrix=this.cameracontroller.calculateViewMatrix();
	this.render();
	if (this.cameracontroller.onChange!=null)
		this.cameracontroller.onChange();
}

o3djs.renderscene.RenderScene.prototype.resetCamera = function() 
{
	this.cameracontroller.viewAll(this.meshesBoundingBox,1);
//	this.cameracontroller.viewAll(this.transform.boundingBox,1);
//	console.log(this.transform.boundingBox);
	this.cameracontroller.thisRot_=o3djs.math.matrix4.identity();
	this.client.root.localMatrix=this.cameracontroller.calculateViewMatrix();
	this.render();
	if (this.cameracontroller.onChange!=null)
		this.cameracontroller.onChange();
}

o3djs.renderscene.RenderScene.prototype.stopDragging = function() 
{
	this.dragging = false;
	this.cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.NONE);
}

o3djs.renderscene.RenderScene.prototype.addMeshes = function(xmlFile, callback) 
{
	var xmlhttp=new XMLHttpRequest();
	xmlhttp.open("GET",xmlFile+"?nocache=" + Math.random(),false);
//	xmlhttp.open("GET",xmlFile,false);
	xmlhttp.send();
	var readString=xmlhttp.responseXML;

	var meshes=readString.getElementsByTagName("mesh");

	var slashIndex=xmlFile.lastIndexOf("/");

	var path="";
	if (slashIndex>0)
		path=xmlFile.substring(0,slashIndex);

	var meshIndex=0;
	var numberOfMeshes=meshes.length;
	var scene=this;
	var numberOfRemainingMeshes=numberOfMeshes;

	for (var n=0;n<numberOfMeshes;n++)
	{
		var mesh=meshes[n];
		var file=mesh.getAttribute("Mesh");
		var Label=mesh.getAttribute("Label");
		var color=[1.0,1.0,1.0,1.0];
		if (mesh.hasAttribute("color"))
		{
			var colorstring=mesh.getAttribute("color");
			var colors=colorstring.split(" ");
			for (var j=0;j<4;j++)
				color[j]=parseFloat(colors[j]);
		}
		
		function afterLoading()
		{
			numberOfRemainingMeshes--;
			switch (numberOfRemainingMeshes)
			{
				case Math.floor(numberOfMeshes/4):
				case Math.floor(numberOfMeshes/2):
				case Math.floor(numberOfMeshes*3/4):
				case 0:
					if (callback)
						callback();
					break;
				default:
			}
		}

		if (Label!="0")
		{
			createFromFile(scene, path+"/"+file,color, afterLoading);
		}
		else
		{
			afterLoading();
		}
	}
};

o3djs.renderscene.RenderScene.prototype.resize = function(opt_width,opt_height) 
{

	var newWidth;
	var newHeight;
	
	if ((opt_width!=null)&&(opt_height!=null))
	{
		newWidth  = opt_width;
		newHeight = opt_height;
	}
	else
	{
		newWidth  = this.client.width;
		newHeight = this.client.height;
	}
	//alert("size= "+newWidth+" "+newHeight);

	if (newWidth != this.o3dWidth || newHeight != this.o3dHeight)
	{
		this.o3dWidth = newWidth;
		this.o3dHeight = newHeight;

		// Set the perspective projection matrix
		this.viewInfo.drawContext.projection = o3djs.math.matrix4.perspective(
		o3djs.math.degToRad(45), this.o3dWidth / this.o3dHeight, 0.1, 100000);

		this.cameracontroller.setAreaSize(this.o3dWidth, this.o3dHeight);

		//o3djs.dump.dump("areaWidth: " + g_o3dWidth + "\n");
		//o3djs.dump.dump("areaHeight: " + g_o3dHeight + "\n");
	}
	this.client.render();
}

o3djs.renderscene.RenderScene.prototype.render = function()
{
	this.client.render();
}

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

function readVTKFile(text,vertexInfo ,positionStream , boundingBox){

	var httpIndex=0;
	var httpLength=text.length;
	function readNextString ()
	{
		while (1)
		{
			if (httpIndex>=httpLength)
				return ("");
			var currentString="";
			while (1)
			{
				var currentChar=text.charAt(httpIndex);
				httpIndex++;
				if ((currentChar!="\n")&&
					(currentChar!=" "))
					currentString+=currentChar;
				else
					break;
			}
			if (currentString.length>0)
				return (currentString);
		}
	}

	// read point data
	var found=false;
	while (!found)
	{
		var readString=readNextString();
		switch (readString.toUpperCase())
		{
			case "POINTS":
				found=true;
				break;
			case "":
				return (false);
			default:
		}
		
	}

	var numberOfPoints=readNextString();
	if (numberOfPoints>200000)
	{
		return ("mesh is too big : "+numberOfPoints+" vertices");
	}

	var coord=[0,0,0];
	var index2=0;
	while (1)
	{
		var number;
		while (1)
		{
			var readString=readNextString();
			if (readString=="")
				return (false);
			number=parseFloat(readString);
			if (!isNaN(number))
				break;
		}
		coord[index2]=number;
		index2++;

		if (index2==3)
		{
			index2=0;
			positionStream.addElement(coord[0],coord[1],coord[2]);
			boundingBox.addPoint(coord);

			numberOfPoints--;
			if (numberOfPoints==0)
			{
				break;
			}
		}
	}

	found=false;
	while (!found)
	{
		var readString=readNextString();
		switch (readString)
		{
			case "POLYGONS":
				found=true;
				break;
			case "":
				return (false);
			default:
		}
	}

	var connectivity=[0,0,0,0];
	var triangle=[0,0,0];
	var numberOfPolygons=readNextString();
	readNextString();

	index2=0;
	while (1)
	{
		var number;
		while (1)
		{
			var readstring=readNextString();
			if (readstring.length==0)
				return (false);
			number=parseInt(readstring);
			if (!isNaN(number))
				break;
		}

		connectivity[index2]=number;
		index2++;

		if (index2==connectivity[0]+1)
		{
			index2=0;
			var numberOfTrianglesInCell=connectivity[0]-2;
			triangle[0]=connectivity[1];
			for (var i=0;i<numberOfTrianglesInCell;i++)
			{
				triangle[1]=connectivity[i+2];
				triangle[2]=connectivity[i+3];
				vertexInfo.addTriangle(triangle[0],triangle[1],triangle[2]);
			}
			
			numberOfPolygons--;
			if (numberOfPolygons==0)
			{
				return;
			}
		}
	}
}

function readVTKFile2(text,vertexInfo ,positionStream , boundingBox){
	var reg2=new RegExp("[ \n]+", "gm");
	var data=text.split(reg2);
	var fileLength=data.length;
	
	// read point data
	var index=0;
	while (data[index]!="POINTS")
	{
		index++;
		if (index>fileLength)
			return (false);

	}
	index++;
	var numberOfPoints=data[index];
	if (numberOfPoints>200000)
	{
		return ("mesh is too big : "+numberOfPoints+" vertices");
	}
	index++
	var coord=[0,0,0];
	var index2=0;
	while (1)
	{
		var number=parseFloat(data[index]);
		while (isNaN(number))
		{
			index++;
			if (index>fileLength)
				return (false);

			number=parseFloat(data[index]);
		}
		coord[index2]=number;
		index2++;
		index++;
		if (index>fileLength)
			return (false);

		if (index2==3)
		{
			index2=0;
			positionStream.addElement(coord[0],coord[1],coord[2]);
			boundingBox.addPoint(coord);

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
		if (index>fileLength)
			return (false);

	}
	index++
	var connectivity=[0,0,0,0];
	var triangle=[0,0,0];
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
			if (index>fileLength)
				return (false);

			number=parseInt(data[index]);
		}

		connectivity[index2]=number;
		index2++;
		index++;
		if (index>fileLength)
			return (false);

		if (index2==connectivity[0]+1)
		{
			index2=0;
			var numberOfTrianglesInCell=connectivity[0]-2;
			triangle[0]=connectivity[1];
			for (var i=0;i<numberOfTrianglesInCell;i++)
			{
				triangle[1]=connectivity[i+2];
				triangle[2]=connectivity[i+3];
				vertexInfo.addTriangle(triangle[0],triangle[1],triangle[2]);
			}
			
			numberOfPolygons--;
			if (numberOfPolygons==0)
			{
				return;
			}
		}
	}
}

function createFromFile(scene, file,color, opt_callback, opt_mtime) {

	var xmlhttp=new XMLHttpRequest();
	if (opt_mtime==null)
		xmlhttp.open("GET",file,true);
	else
		xmlhttp.open("GET",file+"?nocache=" + opt_mtime,true);

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
			var shape=createFromFile2(xmlhttp, scene, file,color);
			if (opt_callback)
				opt_callback(shape);
			return;
		}
	}
}

function createFromFile2(xmlhttp, scene, file,color) {
	var material=createDefaultMaterial(scene.pack, scene.viewInfo, color);
	if (color[3]<0)
	{
		var state = scene.pack.createObject('State'); 
		material.state = state; 
		state.getStateParam('FillMode').value = scene.o3dElement.o3d.State.WIREFRAME;
	}
	else
	{
		// add polygonoffset to z coordinate to make edges display cleaner
		var state = scene.pack.createObject('State'); 
		material.state = state; 
		state.getStateParam('PolygonOffset1').value = 1;
		state.getStateParam('PolygonOffset2').value = 1;
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
			var returnValue=readVTKFile(xmlhttp.responseText,vertexInfo ,positionStream, scene.meshesBoundingBox);
			if (returnValue!=null)
			{
				alert ("error while reading "+file+" : \n"+returnValue);
				return;
			}
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

//	o3djs.shape.setBoundingBoxesAndZSortPoints(shape); // Maybe usefull to replace bounding box computing by hand
//	var shape2=o3djs.shape.duplicateShape(scene.pack, shape);

	scene.transform.addShape(shape);

	var mesh=o3djs.mesh.createMesh(file, shape, material, scene)

	return (mesh);

/*	var normalStream2 = vertexInfo.addStream(3, o3djs.base.o3d.Stream.NORMAL);
	for (var i=0;i<numberOfPoints;i++)
	{
		var normal=normalStream.getElementVector(i);
		normalStream2.addElementVector(o3djs.math.negativeVector(normal));
	}
	var shape2=vertexInfo.createShape(scene.pack, material);
	scene.transform.addShape(shape2);*/
}

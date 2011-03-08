
o3djs.base.o3d = o3d;
o3djs.require('o3djs.webgl');
o3djs.require('o3djs.math');
o3djs.require('o3djs.quaternions');
o3djs.require('o3djs.rendergraph');
o3djs.require('o3djs.pack');
o3djs.require('o3djs.arcball');
o3djs.require('o3djs.event');
o3djs.require('o3djs.cameracontroller');
o3djs.require('o3djs.primitives');

// Events
// Run the init() function once the page has finished loading.
// Run the uninit() function when the page has is unloaded.
window.onload = init;
window.onunload = uninit;

// global variables
var g_o3d;
var g_math;
var g_pack;
var g_client;

var g_o3dWidth = -1;
var g_o3dHeight = -1;

var g_viewInfo;
var g_cameracontroller;

var g_numberOfFiles;

function updateClient() {
  if (g_client.renderMode == g_o3d.Client.RENDERMODE_ON_DEMAND) {
    g_client.render();
  }
}

function renderCallback(renderEvent) {
 setClientSize();
    g_client.renderMode = g_o3d.Client.RENDERMODE_ON_DEMAND;
}


function AddMeshes(xmlFile, transform)
{
	var xmlhttp=new XMLHttpRequest();
//	xmlhttp.open("GET",xmlFile+"?nocache=" + Math.random(),false);
	xmlhttp.open("GET",xmlFile,false);
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
	g_numberOfFiles=0;

	for (var i=0;i<meshes.length;i++)
	{
		var flip=0;
		var mesh=meshes[i];
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
		if (Label!="0")
		{
			g_numberOfFiles++;
			createFromFile(transform, path+"/"+file,g_pack,color,flip);
		}
	}
}
/**
 * Creates the client area.
 */
function init() {
  o3djs.webgl.makeClients(initStep2);
}

function setClientSize() {
  var newWidth  = g_client.width;
  var newHeight = g_client.height;

  if (newWidth != g_o3dWidth || newHeight != g_o3dHeight) {
    g_o3dWidth = newWidth;
    g_o3dHeight = newHeight;

    // Set the perspective projection matrix
    g_viewInfo.drawContext.projection = g_math.matrix4.perspective(
      g_math.degToRad(45), g_o3dWidth / g_o3dHeight, 0.1, 10000);

    // Sets a new area size for arcball.
    g_cameracontroller.setAreaSize(g_o3dWidth, g_o3dHeight);

    //o3djs.dump.dump("areaWidth: " + g_o3dWidth + "\n");
    //o3djs.dump.dump("areaHeight: " + g_o3dHeight + "\n");
  }
}

var g_dragging = false;

function startDragging(e) {
	g_dragging = true;

	if ((e.shiftKey)||(e.button==1))
		g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.MOVE_CENTER_IN_VIEW_PLANE,e.x,e.y);
	else
	{
		if ((e.ctrlKey)||(e.button==1))
			g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.ROTATE_AROUND_Z,e.x,e.y);
		else
			g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.SPIN_ABOUT_CENTER,e.x,e.y);
	}
}

function drag(e) {
	if (g_dragging) {
		g_cameracontroller.mouseMoved(e.x,e.y);
		var matrix=g_cameracontroller.calculateViewMatrix();
		g_client.root.localMatrix=matrix;
		updateClient();
	}
}

function stopDragging(e) {
	g_dragging = false;
	g_cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.NONE);
}

function scrollMe(e) {
  if (e.deltaY) {
	g_cameracontroller.backpedal*=(e.deltaY < 0 ? 14 : 10)/12;
	g_client.root.localMatrix=g_cameracontroller.calculateViewMatrix();
	updateClient();
  }
}

/**
 * Initializes O3D, creates the object and sets up the transform and
 * render graphs.
 * @param {Array} clientElements Array of o3d object elements.
 */
function initStep2(clientElements) {
	// Initializes global variables and libraries.
	var o3dElement = clientElements[0];
	g_client = o3dElement.client;
	g_o3d = o3dElement.o3d;
	g_math = o3djs.math;

	g_lastRot = g_math.matrix4.identity();
	g_thisRot = g_math.matrix4.identity();

	// Create a pack to manage the objects created.
	g_pack = g_client.createPack();

	// Create the render graph for a view.
	g_viewInfo = o3djs.rendergraph.createBasicView(
	  g_pack,
	  g_client.root,
	  g_client.renderGraphRoot,
	  [1, 1, 1, 1]); //background color

//	g_viewInfo.performanceState.getStateParam('CullMode').value=g_o3d.State.CULL_NONE; 

	// Create a new transform and parent the Shape under it.
	var Transform = g_pack.createObject('Transform');
	// Create the Shape for the mesh

	Transform.parent = g_client.root;

//	AddMeshes("http://www.creatis.insa-lyon.fr/~valette/meshView/coeurThorax/coeurthorax.xml", Transform);
//	AddMeshes("data/output.xml", Transform);
	AddMeshes("test/output.xml", Transform);
//	AddMeshes("data/coeur.xml", Transform);
//	createFromFile(Transform,"data/heart.vtk",g_pack,[1,1,1,0.6]);
//	createFromFile(Transform,"data/skull.xml",g_pack,[1,1,1,0.6]));

//	alert("OK!");

	g_cameracontroller=o3djs.cameracontroller.createCameraController(
	[150,150,150],//centerPos,
	500,//backpedal,
	100,//heightAngle,
	100,//rotationAngle,
   0.8//fieldOfViewAngle,
   )//opt_onChange)


	setClientSize();
//	var t=setTimeout("g_client.render()",500);
	g_client.render();

//	g_cameracontroller.viewAll(o3djs.util.getBoundingBoxOfTree(g_client.root),1);
	g_client.root.localMatrix=g_cameracontroller.calculateViewMatrix();

	o3djs.event.addEventListener(o3dElement, 'mousedown', startDragging);
	o3djs.event.addEventListener(o3dElement, 'mousemove', drag);
	o3djs.event.addEventListener(o3dElement, 'mouseup', stopDragging);
	o3djs.event.addEventListener(o3dElement, 'wheel', scrollMe); 


	function setBoundingBox()
	{
		var primitives;
		var primitives=g_pack.getObjectsByClassName('Primitive');
//		alert(primitives.length);
	};
//	var t=setTimeout(setBoundingBox,5000);

//	g_client.render();
	// Set our render callback for animation.
	// This sets a function to be executed every time a frame is rendered.
	g_client.setRenderCallback(renderCallback);
	window.onresize = updateClient;
}

/**
 * Removes any callbacks so they don't get called after the page has unloaded.
 */
function uninit() {
  if (g_client) {
    g_client.cleanup();
  }
}


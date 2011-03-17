
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
//window.onload = init;
//window.onunload = uninit;

// global variables

var g_scene;

function updateClient() {
    g_scene.client.render();
}

/**
 * Creates the client area.
 */
function init() {
  o3djs.webgl.makeClients(initStep2);
}

function setClientSize() {
  var newWidth  = g_scene.client.width;
  var newHeight = g_scene.client.height;

  if (newWidth != g_scene.o3dWidth || newHeight != g_scene.o3dHeight) {
    g_scene.o3dWidth = newWidth;
    g_scene.o3dHeight = newHeight;

    // Set the perspective projection matrix
    g_scene.viewInfo.drawContext.projection = o3djs.math.matrix4.perspective(
      o3djs.math.degToRad(45), g_scene.o3dWidth / g_scene.o3dHeight, 0.1, 10000);

    // Sets a new area size for arcball.
    g_scene.cameracontroller.setAreaSize(g_scene.o3dWidth, g_scene.o3dHeight);

    //o3djs.dump.dump("areaWidth: " + g_o3dWidth + "\n");
    //o3djs.dump.dump("areaHeight: " + g_o3dHeight + "\n");
  }
  g_scene.client.render();
}

var g_dragging = false;

function startDragging(e) {
	g_dragging = true;
	var cameracontroller=g_scene.cameracontroller

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
	if (g_dragging) {
		g_scene.cameracontroller.mouseMoved(e.x,e.y);
		var matrix=g_scene.cameracontroller.calculateViewMatrix();
		g_scene.client.root.localMatrix=matrix;
		updateClient();
	}
}

function stopDragging(e) {
	g_dragging = false;
	g_scene.cameracontroller.setDragMode(o3djs.cameracontroller.DragMode.NONE);
}

function scrollMe(e) {
  if (e.deltaY) {
	g_scene.cameracontroller.backpedal*=(e.deltaY < 0 ? 14 : 10)/12;
	g_scene.client.root.localMatrix=g_scene.cameracontroller.calculateViewMatrix();
	updateClient();
  }
}

/**
 * Initializes O3D, creates the object and sets up the transform and
 * render graphs.
 * @param {Array} clientElements Array of o3d object elements.
 */
function initStep2(clientElements) {

	g_scene=o3djs.renderscene.createRenderScene(clientElements[0]);
//	function setBoundingBox()
//	{
//		var primitives;
//		var primitives=g_pack.getObjectsByClassName('Primitive');
//		alert(primitives.length);
//	};
//	var t=setTimeout(setBoundingBox,5000);

   	setClientSize();
	window.onresize = setClientSize;
//	g_scene.addMeshes("http://www.creatis.insa-lyon.fr/~valette/meshView/coeurThorax/coeurthorax.xml");
//	AddMeshes("data/output.xml", Transform);
	g_scene.addMeshes("test/output_full.xml");
//	AddMeshes("data/coeur.xml", Transform);
//	createFromFile(g_scene,"data/heart.vtk",[1,1,1,0.6]);
//	createFromFile(g_scene,"data/skull.vtk",[1,1,1,0.6]);
//	createFromFile(g_scene,"coeurThorax/poumonDroit.vtk",[1,1,1,1]);
}

/**
 * Removes any callbacks so they don't get called after the page has unloaded.
 */
function uninit() {
  if (g_scene.client) {
    g_scene.client.cleanup();
  }
}


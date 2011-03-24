
o3djs.base.o3d = o3d;

// Events
// Run the init() function once the page has finished loading.
// Run the uninit() function when the page has is unloaded.
//window.onload = init;
//window.onunload = uninit;

// global variables

var g_scene;

function updateClient() {
    g_scene.render();
}

/**
 * Creates the client area.
 */
function init() {
  o3djs.webgl.makeClients(initStep2);
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

   	g_scene.render();
	window.onresize = updateClient;
	g_scene.addMeshes("http://www.creatis.insa-lyon.fr/~valette/meshView/coeurThorax/coeurthorax.xml");
//	g_scene.addMeshes("test/output_full.xml");
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


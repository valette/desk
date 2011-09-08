o3djs.base.o3d = o3d;

o3djs.provide('o3djs.mesh');

o3djs.mesh = o3djs.mesh || {};

o3djs.mesh.createMesh = function(fileName, shape, material, scene) {
  return new o3djs.mesh.Mesh(fileName, shape, material, scene);
};

o3djs.mesh.Mesh = function(fileName, shape, material, scene)
{
	this.shape=shape;
	this.material=material;
	this.scene=scene;
	this.fileName=fileName;
};

o3djs.mesh.Mesh.prototype.setColor = function(color) 
{
	this.material.getParam('diffuse').value = 
		[color[0], color[1], color[2], color[3]];

	if (color[3]<1)
		this.material.drawList=this.scene.viewInfo.zOrderedDrawList;
	else
		this.material.drawList=this.scene.viewInfo.performanceDrawList;
}

o3djs.mesh.Mesh.prototype.getColor = function() 
{
	return (this.material.getParam('diffuse').value);
}

o3djs.mesh.Mesh.prototype.getSimpleName = function() 
{
	var lastSlashIndex=this.fileName.lastIndexOf("\/");
	console.log (this.fileName);
	console.log (lastSlashIndex);
	if (lastSlashIndex<0)
		return (this.fileName);
	else
		return (this.fileName.substring(lastSlashIndex, this.fileName.length));
}

o3djs.mesh.Mesh.prototype.setRepresentationToWireframe = function(bool) 
{
	if (bool)
		this.material.state.getStateParam('FillMode').value = this.scene.o3dElement.o3d.State.WIREFRAME;
	else
		this.material.state.getStateParam('FillMode').value = this.scene.o3dElement.o3d.State.SOLID;
}

o3djs.mesh.Mesh.prototype.isRepresentationWireframe = function()
{
	if (this.material.state.getStateParam('FillMode').value == this.scene.o3dElement.o3d.State.WIREFRAME)
		return (true);
	else
		return (false);
}

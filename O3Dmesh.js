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

	// the list of meshes bound to this one
	this.linkedMeshes=[];

	// the mesh to which one this mesh is bound
	this.bound=null;
};

o3djs.mesh.Mesh.prototype.bind = function(mesh) 
{
	if (this.bound!=null)
	{
		var bindings=this.bound.linkedMeshes;
		var index= bindings.indexOf(this);
		bindings.splice(index, 1);
	}
	mesh.linkedMeshes.push(this);
	this.bound=mesh;
}

o3djs.mesh.Mesh.prototype.setColor = function(color) 
{
	this.__setColor(color);
	for each (var mesh in this.linkedMeshes)
	{
		mesh.__setColor(color);
	}
}

o3djs.mesh.Mesh.prototype.__setColor = function(color) 
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
	if (lastSlashIndex<0)
		return (this.fileName);
	else
		return (this.fileName.substring(lastSlashIndex+1, this.fileName.length));
}

o3djs.mesh.Mesh.prototype.setRepresentationToWireframe = function(bool) 
{
	this.__setRepresentationToWireframe(bool);
	for each (var mesh in this.linkedMeshes)
	{
		mesh.__setRepresentationToWireframe(bool);
	}
}

o3djs.mesh.Mesh.prototype.__setRepresentationToWireframe = function(bool) 
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

o3djs.mesh.Mesh.prototype.hide = function() 
{
	if (!this.hidden)
		this.scene.transform.removeShape(this.shape);

	this.hidden=true;
}

o3djs.mesh.Mesh.prototype.show = function()
{
	if (this.hidden)
		this.scene.transform.addShape(this.shape);

	this.hidden=false;
}

o3djs.mesh.Mesh.prototype.setVertexCoordinates = function(Id,x,y,z)
{
	var primitive = this.shape.elements[0];
	var streambank = primitive.streamBank;
	var stream = streambank.getVertexStream(o3d.Stream.POSITION, 0);
	var field = stream.field;
	field.setAt(Id,[x,y,z]);
}

o3djs.mesh.createSquare = function(scene, width, height)
{
	var effect = scene.pack.createObject('Effect');
	effect.loadVertexShaderFromString("uniform mat4 worldViewProjection;attribute vec4 position;attribute vec2 texCoord0;varying vec2 texCoord;void main() {gl_Position = worldViewProjection * position;texCoord = texCoord0;}");
	effect.loadPixelShaderFromString("varying vec2 texCoord;uniform sampler2D texSampler;void main() {gl_FragColor = texture2D(texSampler, texCoord);}");

//	var material2 = o3djs.material.createMaterialFromFile(
//		scene.pack,'texture-only-glsl.shader',scene.viewInfo.zOrderedDrawList);

	var material2 = o3djs.material.createMaterialFromFile(
		scene.pack,'texture-only-glsl.shader',scene.viewInfo.performanceDrawList);

	var material = scene.pack.createObject('Material');
	material.drawList = scene.viewInfo.performanceDrawList;
	material.effect = effect;
	effect.createUniformParameters(material);


	var vertexInfo = o3djs.primitives.createVertexInfo();

	vertexInfo.addTriangle(0,1,2);
	vertexInfo.addTriangle(0,2,3);

	var positionStream = vertexInfo.addStream(
		3, o3djs.base.o3d.Stream.POSITION);

	positionStream.addElement(0,0,200);
	positionStream.addElement(200,0,200);
	positionStream.addElement(200,200,200);
	positionStream.addElement(0,200,200);

	var normalStream = vertexInfo.addStream(
		3, o3djs.base.o3d.Stream.NORMAL);

	normalStream.addElement(0,0,1);
	normalStream.addElement(0,0,1);
	normalStream.addElement(0,0,1);
	normalStream.addElement(0,0,1);

	var texCoordStream = vertexInfo.addStream(
		2, o3djs.base.o3d.Stream.TEXCOORD, 0);
	texCoordStream.addElement(0, 0);
	texCoordStream.addElement(1, 0);
	texCoordStream.addElement(1, 1);
	texCoordStream.addElement(0, 1);

	var filename="slices";

	var shape=vertexInfo.createShape(scene.pack, material2);
//////////////////////////////
    var samplerParam = scene.transform.createParam('texSampler0', 'ParamSampler');
    var sampler = scene.pack.createObject('Sampler');
    samplerParam.value = sampler;
    sampler.addressModeU = scene.o3dElement.o3d.Sampler.CLAMP;
    sampler.addressModeV = scene.o3dElement.o3d.Sampler.CLAMP;
	sampler.minFilter = scene.o3dElement.o3d.Sampler.ANISOTROPIC;
	sampler.maxAnisotropy = 4;

	var pixels = [];
	for (var y = 0; y < height; ++y) {
		for (var x = 0; x < width; ++x) {
		var offset = (y * width + x) * 4;  // rgba
		var u = x / width * Math.PI * 0.5;
		var v = y / height * Math.PI * 0.5;
		pixels[offset + 0] = 0;//Math.cos(v);  // red
		pixels[offset + 1] = 1.0;//Math.sin(u);  // green
		pixels[offset + 2] = 0;//Math.sin(v);  // blue
		pixels[offset + 3] = 1.0;//Math.abs(Math.sin(u * 8));  // alpha
		}
	}

	var texture = scene.pack.createTexture2D(width, height, scene.o3dElement.o3d.Texture.ARGB8, 1, false);
	texture.set(0, pixels);

/*	var img = new Image();
	img.src = 'test.jpg';
	img.onload=function(){
	var newCanvas = document.createElement('canvas');
	newCanvas.height=""+height;
	newCanvas.width=""+width;
	var context = newCanvas.getContext('2d');
	context.drawImage(img, 0, 0);
	var data = context.getImageData(0, 0, width, height).data;
	var numPixels=height*width*4;
	for (var p = 0; p < numPixels; p++)
		pixels[p]=data[p]/255;
	texture.set(0, pixels);
	}
*/
	sampler.texture = texture;

//////////////////////////////////////////
	scene.transform.addShape(shape);

	var mesh=o3djs.mesh.createMesh(filename, shape, material, scene)
	mesh.texture=texture;
	mesh.pixels=pixels;
	return (mesh);
}

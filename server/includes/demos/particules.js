var vertexShader = [
    'uniform float amplitude;',
	'attribute float size;',
	'attribute vec3 customColor;',
	'varying vec3 vColor;',
	'void main() {',
		'vColor = customColor;',
		'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
        'gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );',
        'gl_Position = projectionMatrix * mvPosition;',
	'}'].join('\n');

var fragmentShader = [
	'uniform vec3 color;',
	'uniform sampler2D texture;',
	'varying vec3 vColor;',
	'void main() {',
    '	gl_FragColor = vec4( color * vColor, 1.0 );',
	'	gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );',
	'}'].join('\n');

var viewer = new desk.MeshViewer();
var scene = viewer.getScene();

var attributes = {
	size: {	type: 'f', value: [] },
	customColor: { type: 'c', value: [] }
};

var textureURL = desk.FileSystem.getFileURL('demos/spark1.png');

var uniforms = {
	amplitude: { type: "f", value: 1.0 },
	color:     { type: "c", value: new THREE.Color( 0xffffff ) },
	texture:   { type: "t", slot: 0, value: THREE.ImageUtils.loadTexture(textureURL)}
};

var shaderMaterial = new THREE.ShaderMaterial( {
    uniforms : uniforms,
	attributes :     attributes,
	vertexShader :   vertexShader,
	fragmentShader : fragmentShader,
	depthTest: false,
    transparent:	true
});


var radius = 200;
var geometry = new THREE.Geometry();
var vector;
for (var i = 0; i < 10000; i++ ) {
	vector = new THREE.Vector3( Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1 );
	vector.multiplyScalar( radius );
	geometry.vertices.push( vector );
}

var vertices = geometry.vertices;
var values_size = attributes.size.value;
var values_color = attributes.customColor.value;

for( var v = 0; v < vertices.length; v++ ) {
	values_size[ v ] = 10;
	values_color[ v ] = new THREE.Color( 0xffaa00 );

	if ( vertices[ v ].x < 0 )
		values_color[ v ].setHSL( 0.5 + 0.1 * ( v / vertices.length ), 0.7, 0.5 );
	else
		values_color[ v ].setHSL( 0.0 + 0.1 * ( v / vertices.length ), 0.9, 0.5 );
}
var system = new THREE.ParticleSystem( geometry, shaderMaterial );
system.dynamic = true;
system.sortParticles = true;

viewer.addMesh(system);
viewer.viewAll();
viewer.render();

viewer.addListener("render", animation);

function animation() {
    var numberOfParticules = attributes.size.value.length;
    var values = attributes.size.value;
    var time = new Date().getTime() * 0.005;
	system.rotation.z = 0.01 * time;
	for(var i = 0; i < numberOfParticules; i++) {
		values[ i ] = 14 + 13 * Math.sin( 0.001 * i + time );
	}
    viewer.render();
}

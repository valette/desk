var nSegments = 2000;

var geometry = new THREE.BufferGeometry();
var material = new THREE.LineBasicMaterial({ vertexColors: true });

var positions = new Float32Array(nSegments *  3);
var colors = new Float32Array(nSegments * 3);

geometry.addAttribute( 'position', new THREE.BufferAttribute(positions, 3));
geometry.addAttribute( 'color', new THREE.BufferAttribute(colors, 3));

for ( var i = 0; i < nSegments; i ++ ) {

    var x = Math.random();
    var y = Math.random();
    var z = Math.random();
    
    // positions
    positions[ i * 3 ] = x;
    positions[ i * 3 + 1 ] = y;
    positions[ i * 3 + 2 ] = z;
    
    // colors
    colors[ i * 3 ] = x;
    colors[ i * 3 + 1 ] = y;
    colors[ i * 3 + 2 ] = z;

}

mesh = new THREE.LineSegments( geometry, material, THREE.LineSegments );

var scene = new desk.MeshViewer();
scene.addMesh( mesh );

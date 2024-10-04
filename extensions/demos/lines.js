const nSegments = 2000;

const geometry = new THREE.BufferGeometry();
const material = new THREE.LineBasicMaterial({ vertexColors: true });

const positions = new Float32Array(nSegments *  3);
const colors = new Float32Array(nSegments * 3);

geometry.setAttribute( 'position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute( 'color', new THREE.BufferAttribute(colors, 3));

for ( let i = 0; i < nSegments; i ++ ) {

    const x = Math.random();
    const y = Math.random();
    const z = Math.random();
    
    // positions
    positions[ i * 3 ] = x;
    positions[ i * 3 + 1 ] = y;
    positions[ i * 3 + 2 ] = z;
    
    // colors
    colors[ i * 3 ] = x;
    colors[ i * 3 + 1 ] = y;
    colors[ i * 3 + 2 ] = z;

}

const mesh = new THREE.LineSegments( geometry, material, THREE.LineSegments );
const viewer = new desk.THREE.Viewer();
viewer.addMesh( mesh );

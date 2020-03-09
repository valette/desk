 
const viewer = new desk.MeshViewer();

const geometry = new THREE.BoxGeometry( 200, 200, 200 );
const mesh = viewer.addGeometry( geometry , {label : "my cube"});
viewer.getWindow().setCaption("my cube!");

const edgeGeometry = new THREE.WireframeGeometry( geometry );
const edges = new THREE.LineSegments( edgeGeometry );
edges.material.color.setRGB(0,0,0);
viewer.addMesh(  edges );

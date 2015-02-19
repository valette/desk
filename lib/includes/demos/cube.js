 
var view = new desk.MeshViewer();

var geometry = new THREE.BoxGeometry( 200, 200, 200 );

var mesh = view.addGeometry( geometry , {label : "my cube"});
view.getWindow().setCaption("my cube!");

var edges = new THREE.WireframeHelper(mesh);
edges.material.color.setRGB(0,0,0);
mesh.add(edges);

view.viewAll();

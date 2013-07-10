 
var view = new desk.MeshViewer();

var geometry = new THREE.CubeGeometry( 200, 200, 200 );

view.addGeometry( geometry , {label : "my cube"});
view.getWindow().setCaption("my cube!");
view.viewAll();

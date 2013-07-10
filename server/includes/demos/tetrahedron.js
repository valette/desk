var view = new desk.MeshViewer();

var geometry = new THREE.Geometry();
addVertex(0,0,0);
addVertex(1,0,0);
addVertex(0,1,0);
addVertex(0,0,1);

addTriangle(0,1,2);
addTriangle(1,2,3);
addTriangle(0,1,3);
addTriangle(0,2, 3);

//geometry.computeVertexNormals(true);
geometry.computeFaceNormals();
var mesh = view.addGeometry( geometry , {label : "my tetrahedron", color : [0,0,1,1, 0]});

//var geometry2 = new THREE.CubeGeometry( 0.5, 0.5, 0.5 );
//view.addGeometry( geometry2 , {label : "my cube", color : [1,0,0,1, 0]});

view.getWindow().setCaption("my tetrahedron!");
view.viewAll();
console.log(mesh);

function addVertex (x,y,z) {
    geometry.vertices.push (new THREE.Vector3(x,y,z));
}

function addTriangle (v1, v2, v3) {
    geometry.faces.push (new THREE.Face3(v1, v2, v3));
}

function addQuad (v1, v2, v3, v4) {
    geometry.faces.push (new THREE.Face4(v1, v2, v3, v4));
}


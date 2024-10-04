"use strict";
const { desk, THREE } = window; 

const viewer = new desk.THREE.Viewer();

const vertices = [];
const triangles = [];

addVertex(0,0,0);
addVertex(1,0,0);
addVertex(0,1,0);
addVertex(0,0,1);

addTriangle(0,1,2);
addTriangle(1,2,3);
addTriangle(0,1,3);
addTriangle(0,2, 3);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array( vertices ), 3 ) );
geometry.setIndex( triangles );
geometry.computeVertexNormals();

const mesh = viewer.addGeometry( geometry , {label : "my tetrahedron", color : [0,0,1,1, 0]});

viewer.getWindow().setCaption("my tetrahedron!");
viewer.viewAll();

function addVertex ( x,y,z ) { vertices.push ( x,y,z ) }
function addTriangle (v1, v2, v3) { triangles.push ( v1, v2, v3 ) }


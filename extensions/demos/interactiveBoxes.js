var view = new desk.MeshViewer();
var geometry = new THREE.BoxGeometry( 40, 40, 60 );

[[0, 0, 0], [200, 200, 200]].forEach(function (coords) {
    var mesh = view.addGeometry( geometry , {label : "my cube"});
    mesh.position.fromArray(coords);
    view.getWindow().setCaption("my cube!");
    
    var edges = new THREE.WireframeHelper(mesh);
    edges.material.color.setRGB(0,0,0);
    view.addMesh(edges);

    view.viewAll();
    
    var control = new THREE.TransformControls(view.getCamera(), view.getRenderer().domElement);
    
    control.addEventListener('change', function () {
        control.update();
        view.render();
    });
    
    view.addListener('render', control.update.bind(control));
    control.setMode( "translate" );
    view.getScene().add(control);
    control.attach(mesh);

    view.getWindow().addListener('close', function () {
//        control.dispose();
    });
    control.update();
    view.render();
});




 
const viewer = new desk.MeshViewer();

viewer.getWindow().setCaption("my cube!");
const size = 40;

for ( let i = 0; i < size; i++ ) {

        for ( let j = 0; j < size; j++ ) {
            const geometry = new THREE.BoxGeometry( 200, 200, 200 );
            const mesh = viewer.addGeometry( geometry , {label : "my cube"});
            const edgeGeometry = new THREE.WireframeGeometry( geometry );
            const edges = new THREE.LineSegments( edgeGeometry );
            edges.material.color.setRGB(0,0,0);
            viewer.addMesh(  edges );
            mesh.position.set( i * 400, j * 400, 0 );
            edges.position.set( i * 400, j * 400, 0 );

    }

}

viewer.resetView();
const button = new qx.ui.form.Button( "start" );
viewer.add( button, { left : 10, bottom : 50 } );
button.addListener( "execute", run );
const label = new qx.ui.basic.Label( "" );
viewer.add( label, { left : 10, bottom : 10 } );

async function run() {

    button.setEnabled( false );
    const start = performance.now();
    const n = 50;
    for ( let i = 0; i < n ; i++)
        await viewer.renderAsync();

    const stop = performance.now();
    const duration = Math.round( ( stop - start ) / n );
    label.setValue( duration + "ms per frame");
    button.setEnabled( true );

}


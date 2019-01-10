var numParticles = 100000;
var particlesSize = 10;

var loader = new THREE.TextureLoader();

loader.load(desk.FileSystem.getFileURL('demos/spark1.png'), next);

function next(img) {

    var vertexShader = [
        'uniform float amplitude;',
        'uniform float time;',
        'uniform float size;',
        'attribute vec3 customColor;',
        'attribute float id;',
        'varying vec3 vColor;',
        'void main() {',
            'vColor = customColor;',
            'highp vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',
            'gl_PointSize = size * (1.0 + sin( 0.001 * id + time )) * ( 300.0 / length( mvPosition.xyz ) );',
            'gl_Position = projectionMatrix * mvPosition;',
    '}'].join('\n');

    var fragmentShader = [
        'uniform sampler2D texture;',
        'uniform vec3 color;',
        'varying vec3 vColor;',
        'void main() {',
        '	gl_FragColor = vec4( color * vColor, 1.0 );',
        '	gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );',
    '}'].join('\n');

    var viewer = new desk.MeshViewer();
    var scene = viewer.getScene();

    var material = new THREE.ShaderMaterial( {
        uniforms : {
            color:     { type: "c", value: new THREE.Color( 0xffffff ) },
            size:     { type: "f", value: particlesSize },
            amplitude: { type: "f", value: 1.0 },
            texture:   { type: "t", slot: 0, value: img},
            time:      { type: "f", value: 1.0 }
        },
        vertexShader :   vertexShader,
        fragmentShader : fragmentShader,
        depthTest: false,
        transparent:	true
    });

    var positions = new THREE.BufferAttribute(new Float32Array( numParticles * 3), 3 );
    var colors = new THREE.BufferAttribute(new Float32Array( numParticles * 3), 3 );
    var ids = new THREE.BufferAttribute(new Float32Array( numParticles ), 1);

    var radius = 200;
    var geometry = new THREE.BufferGeometry();
    var myColor = new THREE.Color();

    for ( var i = 0; i < numParticles; i++ ) {
        positions.setXYZ(i, radius * (Math.random() * 2 - 1),
            radius * (Math.random() * 2 - 1),
            radius * (Math.random() * 2 - 1)
        );
        ids.array[i] = i;

        if ( positions.array[ 3 * i ] < 0 ) {
            myColor.setHSL(0.5 + 0.1 * ( i / numParticles ), 0.7, 0.5);
        } else {
            myColor.setHSL(0.1 * ( i / numParticles ), 0.9, 0.5);
        }
        colors.setXYZ(i, myColor.r, myColor.g, myColor.b);
    }

    geometry.addAttribute( 'position', positions);
    geometry.addAttribute( 'id', ids );
    geometry.addAttribute( 'customColor', colors);

    var points = new THREE.Points( geometry, material );

    viewer.addMesh(points);
    viewer.viewAll();
    viewer.render();

    viewer.addListener("render", animation);

    var begin = new Date().getTime();
    function animation() {
        var time = (new Date().getTime()  - begin) * 0.005;
        points.rotation.z = 0.01 * time;
        material.uniforms.time.value = time;
        viewer.render();
    }

}

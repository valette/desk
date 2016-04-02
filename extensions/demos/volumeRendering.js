var file = "data/POPI.mhd";

var viewer;
var win;

var lutContainer;
var preLUTSlider;
var brightnessSlider;
var cutSlider;
var cutButton;
var cutDirectionButton;
var loadLabel;
var canvas, context, imageData;
var lastPosition;

var clicked;

var cutOrientation = -1;
var cutPositions = [];
var volumeSlice;
var canLoad;
var meshes = [];
var voxels;
var imgs = [];
var dims;
var numberOfRemainingSlices;

var histogram = new Uint32Array(256);
var lut = new Uint8Array(256*4);
var backupLut = new Uint8Array(256*4);

var lookupTable = new THREE.DataTexture(lut, 256, 1, THREE.RGBAFormat);
lookupTable.generateMipmaps = false;
lookupTable.magFilter = THREE.NearestFilter;
lookupTable.minFilter = THREE.NearestFilter;
lookupTable.needsUpdate = true;

var vertexShader = [
    'varying vec2 vUv;',
    'varying vec3 v_position;',
    'void main() {',
        'vUv = uv;',
        'v_position = (modelMatrix * vec4( position, 1.0 )).xyz;',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
	'}'].join('\n');

var fragmentShader = [
	'uniform vec3 origin;',
	'uniform vec3 direction;',
	'uniform sampler2D texture;',
    "uniform sampler2D lookupTable;",
    'uniform float preMult;',
    'uniform float amplitude;',
    'uniform float opacityOffset;',
	'varying vec2 vUv;',
    'varying vec3 v_position;',
	'void main() {',
    '	gl_FragColor = texture2D( texture, vUv );',
    '   float opacity = gl_FragColor[0];',
	'   float clampedValue = clamp(opacity * preMult, 0.0, 1.0);',
    '   vec2 colorIndex = vec2(clampedValue, 0.0);',
    '   vec4 colorFromLookupTable = texture2D(lookupTable, colorIndex);',
    '   opacity = colorFromLookupTable[3];',
    '   opacity = opacityOffset + opacity * opacity * 1.0 * amplitude;',
    '   float test = step (- 0.0001, dot (direction, v_position - origin));',
    '   gl_FragColor[3] = opacityOffset + opacity * test ;',
    '   gl_FragColor[0] = colorFromLookupTable[0];',
    '   gl_FragColor[1] = colorFromLookupTable[1];',
    '   gl_FragColor[2] = colorFromLookupTable[2];',
//    '   gl_FragColor[3] = 1.0;',
  //  '   gl_FragColor[0] = 1.0;',
    //'   gl_FragColor[1] = 1.0;',
//    '   gl_FragColor[2] = 1.0;',
	'}'].join('\n');

viewer = new desk.MeshViewer();
win = viewer.getWindow();
win.maximize();
viewer.getRenderer().setClearColor( 0x000000, 1 );
viewer.getCanvas().addListener("mousewheel", function (e) {
    var incr = 1;
    if (e.getWheelDelta() < 0) {
        incr = -1;
    }
    cutSlider.setValue(cutSlider.getValue() + incr);
});
win.setLayout(new qx.ui.layout.HBox());

var lutButton = new qx.ui.form.ToggleButton("lut").set({opacity : 0.5});
viewer.add(lutButton, {left : 30, top : 0});
lutContainer = new qx.ui.container.Composite(new qx.ui.layout.HBox()).set({visibility : "excluded"});
viewer.add(lutContainer, {left : 0, top : 30});
lutButton.addListener("changeValue", function () {
    if (lutButton.getValue()) {
        lutContainer.setVisibility("visible");
    } else {
    lutContainer.setVisibility("excluded");
    }
})

preLUTSlider = new qx.ui.form.Slider();
preLUTSlider.set({maximum : 400, minimum : 0, value : 300, orientation : "vertical", height : 300});
preLUTSlider.addListener("changeValue", function () {
    updateLut();
    updateOpacity();
});

lutContainer.add(preLUTSlider, {flex : 1});

function getOpacityFromSlider () {
    return (200 - brightnessSlider.getValue()) / 100;
}

function getPreMultFromSlider() {
    var value = (400 - preLUTSlider.getValue()) / 100;
    return value * value;
}

cutSlider = new qx.ui.form.Slider().set({
    visibility : "excluded", orientation : "vertical", maximum : 100, value : 10});
cutSlider.addListener("changeValue", updateOpacity);
viewer.add(cutSlider, {right : "5%", bottom: "40%", height : "40%"});

cutButton = new qx.ui.form.Button("cut");
viewer.add(cutButton, {right : "5%", bottom: "30%"});
cutButton.addListener("execute", function () {
    var sliceIndex = -1;
    cutOrientation++;
    switch (cutOrientation) {
        case 2 :
            sliceIndex = 1;
            break;
        case 1:
            sliceIndex = 0;
            break;
        case 0:
            sliceIndex = 2;
            break;
        case 3:
            cutOrientation = -1;
    }
    if (cutOrientation >= 0) {
        cutSlider.set({
            maximum : dims[sliceIndex] - 1,
            value : cutPositions[cutOrientation],
            visibility : "visible"});
        cutDirectionButton.setVisibility("visible");
    } else {
        cutSlider.setVisibility("excluded");
        cutDirectionButton.setVisibility("excluded");
    }
    updateOpacity();
});

cutDirectionButton = new qx.ui.form.ToggleButton("<->");
cutDirectionButton.setVisibility("excluded");
cutDirectionButton.addListener("changeValue", updateOpacity);
viewer.add(cutDirectionButton, {right : "5%", bottom: "35%"});

function updateOpacity(e) {
    var origin = new THREE.Vector3(0,0,0);
    var direction = new THREE.Vector3(0,0,0);
    
    var slice = cutSlider.getValue();
    cutPositions[cutOrientation] = slice;
    if (cutOrientation >= 0) {
        volumeSlice.setOrientation(cutOrientation);
        var coord = volumeSlice.getCornersCoordinates(slice);
        origin.x = coord[0];
        origin.y = coord[1];
        origin.z = coord[2];
        switch (cutOrientation) {
            case 0 : 
                direction.set(0, 0, 1);
                break;
            case 1 : 
                direction.set(1, 0, 0);
                break;
            case 2 : 
                direction.set(0, 1, 0);
                break;
        }
    }

    if (cutDirectionButton.getValue()) {
        direction.negate();
    }

    for (var i = 0; i != meshes.length; i++) {
        var mesh = meshes[i];
        var material = mesh.material;
        if ((mesh.slice == cutSlider.getValue()) && (mesh.orientation == cutOrientation)) {
            material.uniforms.opacityOffset.value = 1.0;
            material.depthTest = true;
            material.depthWrite = true;
            material.transparent = false;
//			material.uniforms.texture.value.magFilter = THREE.NearestFilter;
//			material.uniforms.texture.value.minFilter = THREE.NearestFilter;
        } else {
            material.uniforms.opacityOffset.value = 0.0;            
           material.depthTest = true;
           material.depthWrite = false;
            material.transparent = true;
//			material.uniforms.texture.value.magFilter = THREE.LinearFilter;
//			material.uniforms.texture.value.minFilter = THREE.LinearFilter;
        }
        material.needsUpdate = true;
//        material.uniforms.texture.value.needsUpdate = true;
        mesh.needsUpdate = true;
        material.uniforms.amplitude.value = getOpacityFromSlider();
        material.uniforms.preMult.value = getPreMultFromSlider();
        material.uniforms.origin.value.copy(origin);
        material.uniforms.direction.value.copy(direction);
    }
    viewer.render();
}


var n1 = new THREE.Vector3(0, 0, 1);
var n2 = new THREE.Vector3(1, 0, 0);
var n3 = new THREE.Vector3(0, 1, 0);

var _vector3 = new THREE.Vector3();
var _vector32 = new THREE.Vector3();
var projMatrix = new THREE.Matrix4();
var camera = viewer.getCamera();

function updateSlices(event) {
    var origin = canvas.getContentLocation();
    var x = event.getDocumentLeft() - origin.left;
    var y = event.getDocumentTop() - origin.top;
    var elementSize = canvas.getInnerSize();
    var s1 = MPR.getViewers()[0].getFirstSlice();
    var s2 = MPR2.getViewers()[0].getFirstSlice();
    s1.setSlice(Math.round(y / elementSize.height * s1.getNumberOfSlices()));
    s2.setSlice(Math.round(x / elementSize.width * s2.getNumberOfSlices()));
}

canvas = new qx.ui.embed.Canvas();
canvas.set({canvasWidth : 256, canvasHeight : 256, width : 300, height : 300,
    decorator : "main"});
lutContainer.add(canvas, {flex : 1});

context = canvas.getContext2d();
imageData = context.createImageData(256, 256);
canvas.addListener("mousedown", function (event) {
    clicked = true;
    updateLut(event);
});
canvas.addListener("mouseup", function (event) {
    clicked = false;
    updateLut(event);
    lastPosition = 0;
});

canvas.addListener("mouseout", function (event) {
    clicked = false;
    lastPosition = 0;
});
canvas.addListener("mousemove", function (event) {
    if (clicked) {
        updateLut(event);
    }
});

lastPosition = 0;

var lutBackupDone = false;

function updateLut(event) {
    var index, i, j;
    if (event) {
        var elementSize = canvas.getInnerSize();
        var origin = canvas.getContentLocation();
        var x = Math.round(256 * (event.getDocumentLeft() - origin.left) / elementSize.height);
        var y = Math.round(255 - 255 * (event.getDocumentTop() - origin.top) / elementSize.width);

        if (event.isShiftPressed() && event.isCtrlPressed()) {
            
            
        } else {
            if (event.isRightPressed() || event.isCtrlPressed()) {
                y = 0;
            }
            if (event.isShiftPressed()) {
                y = 255;
            }
            if (lastPosition !== 0) {
                var x1 = lastPosition.x;
                var y1 = lastPosition.y;
                // interpolate
                if (x > x1) {
                    for (j = x1; j < x; j++) {
                        lut[4 * j + 3] = y1 + (y - y1) * (j - x1) / (x - x1);
                    }
                } else {
                for (j = x; j < x1; j++) {
                        lut[4 * j + 3] = y1 + (y - y1) * (j - x1) / (x - x1);
                    }
                }
            } 
            lastPosition = {x : x, y : y};
            lut[4 * x + 3] = y;
        }
    }

    var data = imageData.data;
    var max = _.max(histogram);
    for (i = 0; i != 256; i++) {
        var value = Math.log(histogram[Math.round(i / getPreMultFromSlider())] / max);
        for (j = 0; j != 256; j++) {
            index = 4* (i + 256 * j);
            if ((value + 10) * 256 / 10 > 256 -j) {
                data[index] = lut[4 * i];
                data[index + 1] = lut[4 * i + 1];
                data[index + 2] = lut[4 * i + 2];
                data[index + 3] = 200;
            } else {
                data[index] = data[index + 1] = data[index + 2] = data[index + 3] = 0;
            }
        }
    }
    for (i = 0; i != 256; i++) {
        index = 4 * (i + 256 * (256 - lut[i * 4 + 3]));
        data[index] = data[index + 1] = data[index + 2] = data[index + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);

    var lutData = lookupTable.image.data;
    for (j = 0; j < 1024; j++) {
        lutData[j] = lut[j];
    }
    lookupTable.needsUpdate = true;
    viewer.render();
}

function resetLut() {
    for (var c = 0; c != 256; c++) {
        lut[4 * c] = c;
        lut[4 * c + 1] = c;
        lut[4 * c + 2] = c;
        lut[4 * c + 3] = c;

        lut[4 * c + 2] = Math.max (0, 255 - 2 * c);
        lut[4 * c + 1] = Math.max (0, 255 - 2 * Math. abs(c - 128));
        lut[4 * c + 0] = Math.max (0, 255 - 2 * (255 - c));

        lut[4 * c + 0] = Math.max (0, Math.min( 255, 2 * c));
        lut[4 * c + 1] = Math.max (0, Math.min( 255, 2 * c));
        if (c < 64) {
            lut[4 * c + 2] = Math.max (0, Math.min( 255, 255 - 4 * Math.abs(c - 32)));
        } else if (c < 128) {
            lut[4 * c + 2] = Math.max (0, Math.min( 255, 2 * c - 255));
        } else {
            lut[4 * c + 2] = 255; //Math.max (0, Math.min( 255, 2 * c - 255));
        }
    }
    loadLut("demos/lut.json");

    updateLut();
}

function resetHistogram() {
    for (var j = 0; j != 256; j++) {
        histogram [j] = 0;
    }
}

brightnessSlider = new qx.ui.form.Slider();
brightnessSlider.set({maximum : 400, minimum : -400, value : 150, orientation : "vertical", height : 300});
lutContainer.add(brightnessSlider, {flex : 1});
brightnessSlider.addListener("changeValue",updateOpacity);

loadLabel = new qx.ui.basic.Label("");
loadLabel.setTextColor("yellow");
viewer.add(loadLabel, {right : 0, top :0});

function updateVolume() {
    canLoad = undefined;
    console.log("loading " + file);
    resetHistogram();
    resetLut();
    updateOpacity();
    async.auto({
        slice : function (callback) {
            if (volumeSlice) {
                volumeSlice.dispose();
            }
            volumeSlice = new desk.VolumeSlice(file , 0, {
    //            convert_to_uchar : 1,
    //            format : 0
            }, callback);
        },
        vol1 : ['slice', function (callback) {
            addVolume(0, function () {
                loadLabel.setValue("Reconstructing...");
                callback();
            });
        }],
        vol2 : ['vol1', function (callback) {
            addVolume(1, callback);
       //callback();
        }],
        vol3 : ['vol2', function (callback) {
            addVolume(2, callback);
       //callback();
        }],
        end : ['vol3', function (callback) {
            loadLabel.setValue("");
            callback();
        }]
    });
}

updateVolume();

function onLoad () {
    var volCanvas = this.canvas;
    var ctx = volCanvas.getContext('2d');
    var width = volCanvas.width;
    var height = volCanvas.height;
    ctx.drawImage(this, 0, 0, width, height);
    var data = ctx.getImageData(0, 0, width, height).data;
    var length = width * height * 4;
    for (var j = length; j--;) {
        this.texture.image.data[j] = data[j];
    }
    var offset = this.i * width * height;
    var k = 4 * width * height - 4;
    for (j = width * height; j--;) {
        voxels[offset + j] = (data[k] + data[k + 1] + data[k + 2]) / 3;
        k -= 4;
    }
    imgs.push(this);
    this.onload = null;
    numberOfRemainingSlices--;
    if (numberOfRemainingSlices) {
        if ((numberOfRemainingSlices % 10) === 0) {
            loadLabel.setValue(numberOfRemainingSlices +" slices to load");
        }
    }
    this.material.needsUpdate = true;
    this.texture.needsUpdate = true;
    this.callback();
}

function addVolume(orientation, callback){
    var slices = volumeSlice;
    slices.setOrientation(orientation);
    dims = slices.getDimensions();
    cutPositions[0] = Math.round(dims[2] / 2);
    cutPositions[1] = Math.round(dims[0] / 2);
    cutPositions[2] = Math.round(dims[1] / 2);
    switch (canLoad) {
        case undefined :
            size = dims[0] * dims[1] * dims[2];
            if (size > 1e8) {
                if (!window.confirm("do you want to read " +
                    size.toExponential() +
                    " voxels?\nReally? That one is big and could crash your computer.")) {
                    canLoad = false;
                    return;
                }                
            }
            numberOfRemainingSlices = dims[2];
            voxels = new Uint8Array(dims[0] * dims[1] * dims[2]);
            viewer.removeAllMeshes();
            updateLut();
            meshes = [];
            canLoad = true;
            break;
        case false:
            return;
        case true:
            break;
    }
    var dimensions2D = slices.get2DDimensions();
    var width = dimensions2D[0];
    var height = dimensions2D[1];

    var qxCanvas = new qx.ui.embed.Canvas();
    var canvas = qxCanvas.getContentElement().getCanvas();

    canvas.width = width;
    canvas.height = height;

    var spacing = slices.getSpacing();
    var origin = slices.getOrigin();

    var geometry = new THREE.PlaneBufferGeometry(1,1);
    var coordinates = slices.getCornersCoordinates();
    var centroid = [0, 0, 0];
    for (var j = 0; j < 3; j++) {
        for (var k = 0; k != 4; k++) {
            centroid[j] += coordinates[k * 3 + j];
        }
        centroid[j] /= 4;
    }
    var positions = geometry.attributes.position.array;
    for (j = 0; j < 4; j++) {
        for (var k = 0; k < 3; k++) {
            positions[3 * j + k] = coordinates[3 * j + k] - centroid[k];
        }
        switch (orientation) {
            case 0 :
                positions[3 * j + 2] = 0;
                break;
            case 1 :
                positions[3 * j] = 0;
                break;
            case 2 :
                positions[3 * j + 1] = 0;
                break;
        }
    }


    var concurrency = 10;
    if (orientation !== 0) {
        concurrency = 3;
    }

    var q = async.queue(
        function (i, callback) {
            var length = width * height * 4;
			var dataColor = new Uint8Array(length);
			var texture = new THREE.DataTexture(dataColor, width, height, THREE.RGBAFormat);
			texture.generateMipmaps = false;
			texture.magFilter = THREE.NearestFilter;
			texture.minFilter = THREE.NearestFilter;

            var index, index2;
            var sliceIncr = dims[0] * dims[1] | 0;
            var lineIncr = dims[0];
            switch (orientation) {
                case 0 : 
                    var img;
                    if (imgs.length) {
                        img = imgs.shift();
                    } else {
                        img = new Image();
                    }
        
                    img.onload = onLoad;
                    img.src = slices.getSliceURL(i);
                    break;
                case 1 :
                    for (var l = 0; l != height; l++) {
                        index = 4 * l * width;
                        index2 = i  + l * lineIncr;
                        for (k = 0; k != width; k++) {
                            dataColor[index] = dataColor[index + 1] =
                                dataColor[index + 2] = voxels[index2];
                            dataColor[index + 3] = 255;
                            index += 4;
                            index2 += sliceIncr;
                        }
                    }
                    break;
                case 2 : 
                    for (l = 0; l != height; l++) {
                        index = 4 * (height - 1 -l) * width;
                        index2 = i * lineIncr + l * sliceIncr;
                        for (k = 0; k != width; k++) {
                            dataColor[index] = dataColor[index + 1] =
                                dataColor[index + 2] = voxels[index2];
                            dataColor[index + 3] = 255;
                            index += 4;
                            index2++;
                        }
                    }
                    break;
                default:
                    break;
            }

            var uniforms = {
                amplitude: { type: "f", value: getOpacityFromSlider() },
                opacityOffset: { type: "f", value: 0.0 },
                texture:  { type: "t", slot: 0, value: texture},
                lookupTable:  { type: "t", slot: 0, value: lookupTable},
                origin : { type: "v3", value: new THREE.Vector3()}, 
                direction : { type: "v3", value: new THREE.Vector3()},
                preMult : { type: "f", value: getPreMultFromSlider() }
            };

            var material = new THREE.ShaderMaterial( {
                uniforms : uniforms,
                vertexShader :   vertexShader,
                fragmentShader : fragmentShader,
                depthTest: false,
                transparent:true,
                side : THREE.DoubleSide
            });

            var mesh = new THREE.Mesh( geometry,  material);
            var coordinates = slices.getCornersCoordinates(i);
            switch (orientation) {
                case 0 :
                    mesh.position.x = centroid[0];
                    mesh.position.y = centroid[1];
                    mesh.position.z = origin[2] + i * spacing[2];
                    break;
                case 1 :
                    mesh.position.x = origin[0] + i * spacing[0];
                    mesh.position.y = centroid[1];
                    mesh.position.z = centroid[2];
                    break;
                case 2 :
                    mesh.position.x = centroid[0];
                    mesh.position.y = origin[1] + (dims[1] - 1 - i) * spacing[1];
                    mesh.position.z = centroid[2];
                    break;
            }
            mesh.slice = i;
            mesh.orientation = orientation;
            meshes.push(mesh);
            viewer.addMesh(mesh);

            if (orientation !== 0) {
                material.needsUpdate = true;
                texture.needsUpdate = true;
                setTimeout(callback, 0);
            } else {
                img.material = material;
                img.texture = texture;
                img.i = i;
                img.callback = callback;
                img.canvas = canvas;
            }

            if ((i % Math.round(slices.getNumberOfSlices() / 3) === 0)) {
                if ((i !== 0) && first && (orientation === 0)) {
                    viewer.resetView();
                    console.log("here")
                    first = false;
                }
                viewer.viewAll();
            }
        }, concurrency);

    var first = true;


    q.push(0);
    q.push(slices.getNumberOfSlices() - 1);

    for (var i = 1; i != slices.getNumberOfSlices() - 1; i++) {
        q.push(i);
    }


    q.drain = function () {
        if (orientation === 0) {
            for (j = 0; j != voxels.length; j++) {
                histogram[voxels[j]]++;
            }
            resetLut();
        }

        console.log("Orientation " + orientation + " done");
        updateOpacity();
        if (typeof callback === "function") {
            callback();
        }
    };
}

function loadLut(file) {
    desk.FileSystem.readFile(file, function (err, result){
        result = JSON.parse(result);
        preLUTSlider.setValue(result.preMult);
        brightnessSlider.setValue(result.amplitude);
        for (var i = 0; i < 1024; i++) {
            lut[i] = result.lut[i];
        }
        updateLut();
        updateOpacity();
    })
}

function saveLut(file) {
    var toSave = {preMult : preLUTSlider.getValue(),
        amplitude : brightnessSlider.getValue(),
        lut : []};
    for (var i = 0; i < 1024; i++) {
        toSave.lut[i] = lut[i];
    }
    desk.FileSystem.writeFile(file, JSON.stringify(toSave));
}

var buttonsContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox());
lutContainer.addAt(buttonsContainer, 0);

var resetButton = new qx.ui.form.Button("reset");
resetButton.addListener("execute", resetLut);
buttonsContainer.add(resetButton);

lutContainer.setDroppable(true);
lutContainer.addListener("drop", function (e) {
    e.stopPropagation();
	if (e.supportsType("fileBrowser")) {
		loadLut(e.getData("fileBrowser").getSelectedFiles()[0]);
	}
});

viewer.getWindow().addListener('close', function () {
    meshes.length = 0;
    if (volumeSlice) {
        volumeSlice.dispose();
    }
    voxels = 0;
    imgs.length = 0;

    brightnessSlider.dispose();
    cutSlider.dispose();
    cutButton.dispose();
    cutDirectionButton.dispose();
    loadLabel.dispose();
    canvas.dispose();
});
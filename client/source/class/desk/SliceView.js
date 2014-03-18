/**
* A container used to display volume slices.
* 
* @ignore(THREE.Mesh)
* @ignore(THREE.Vector2)
* @ignore(THREE.Line)
* @ignore(THREE.DataTexture)
* @ignore(THREE.RGBAFormat)
* @ignore(THREE.NearestFilter)
* @ignore(THREE.MeshBasicMaterial)
* @ignore(THREE.LineBasicMaterial)
* @ignore(THREE.Vector3)
* @ignore(THREE.Face3)
* @ignore(THREE.DoubleSide)
* @ignore(THREE.Projector)
* @ignore(THREE.Geometry)
* @ignore(Uint8Array)
* @lint ignoreDeprecated(alert)
*/

qx.Class.define("desk.SliceView", 
{
	extend : desk.ThreeContainer,
	include : desk.LinkMixin,

	construct : function(orientation, options) {
		this.base(arguments);
		this.__slices = [];
		this.__orientation = orientation || 0;
		options = options || {};
		this.__textColor = options.textColor || "yellow";
		this.__createUI();
		this.__initUndo();
		this.__setupInteractionEvents();
	},

	destruct : function(){
		this.removeVolumes(this.__slices);
		this.unlink();
		//clean the scene
		qx.util.DisposeUtil.destroyContainer(this.__rightContainer);
		
		if (this.__drawingCanvas) {
			this.__drawingCanvas.dispose();
		}

		if (this.__brushCanvas) {
			this.__brushCanvas.dispose();
		}

		this.__intersection = null;
		this.__2DCornersCoordinates = null;
		this.__volume2DDimensions = null;
		this.__volume2DSpacing = null;
		this.__volumeOrigin = null;
		this.__volumeSpacing = null;
		this.__projector = null;
	},

	properties : {
		/** current display slice */
		slice : { init : 0, check: "Number", event : "changeSlice", apply : "__applyChangeSlice"},

		/** current camera z position */
		cameraZ : { init : 1, check: "Number", event : "changeCameraZ", apply : "__applyCameraZ"},

		/** paint opacity (betwen 0 and 1) */
		paintOpacity : { init : 1, check: "Number", event : "changePaintOpacity"},
		orientPlane : { init : "", check: "String", event : "changeOrientPlane"},

		/** is the interaction mode set to paint mode*/
		paintMode : { init : false, check: "Boolean", event : "changePaintMode", apply : "__applyPaintMode"},

		/** is the interaction mode set to erase mode*/
		eraseMode : { init : false, check: "Boolean", event : "changeEraseMode", apply : "__applyEraseMode"},

		/** Should the flip and rotate operations operate on camera or orientation markers*/
		orientationChangesOperateOnCamera : { init : true, check: "Boolean"}
	},

	events : {
		"changeDrawing" : "qx.event.type.Event",
		"changeCrossPosition" : "qx.event.type.Event",
		"viewMouseDown" : "qx.event.type.Event",
		"viewMouseMove" : "qx.event.type.Event",
		"viewMouseOver" : "qx.event.type.Event",
		"viewMouseOut" : "qx.event.type.Event",
		"viewMouseUp" : "qx.event.type.Event",
		"viewMouseClick" : "qx.event.type.Event",
		"viewMouseWheel" : "qx.event.type.Event"
	},

	members : {
		isViewOn : function () {
			return this.__viewOn;
		},

		__viewOn : false,

		__applyEraseMode : function (mode) {
			this.__initDrawing();
			if (mode) {
				this.setPaintMode(false);
				this.__updateBrush();
			}
		},

		__applyPaintMode : function (mode) {
			this.__initDrawing();
			if (mode) {
				this.setEraseMode(false);
				this.__updateBrush();
			}
		},

		__orientation : 0,

		getOrientation : function () {
			return this.__orientation;
		},

		__slices : null,

		__slider : null,

		__rightContainer : null,
		__directionOverlays : null,

		__paintWidth : 5,
		// default color is red
		__paintColor : '#ff0000',

		__drawingCanvas : null,
		__drawingMesh : null,

		__brushMesh : null,

		__crossMeshes : null,
		
		__drawingCanvasModified : false,

		__textColor : null,

		projectOnSlice : function (x, y, z) {
			switch (this.__orientation) {
				case 0:
					return {x: x, y:y};
				case 1:
					return {x: z, y:y};
				case 2:
				default:
					return {x: x, y:z};
			}
		},

		getVolume2DDimensions : function() {
			return this.__volume2DDimensions;
		},
		
		getVolume2DSpacing : function() {
			return this.__volume2DSpacing;
		},
		
		get2DCornersCoordinates : function() {
			return this.__2DCornersCoordinates;
		},
		
		getRightContainer : function () {
			return this.__rightContainer;
		},

		getDrawingCanvas : function () {
			this.__initDrawing();
			return this.__drawingCanvas;
		},

        getDrawingMesh : function () {
			this.__initDrawing();
			return this.__drawingMesh;
		},

		isDrawingCanvasModified : function () {
			return this.__drawingCanvasModified;
		},

		setDrawingCanvasNotModified : function () {
			this.__drawingCanvasModified=false;
		},

		/**
		 * Returns the first slice present in the view. This slice defines
		 * the volume bounding box, spacing etc..
		 * @return {desk.VolumeSlice} first volume slice present in the view.
		 * Returns 'null' if no slice is present
		*/
		getFirstSlice : function () {
			var slices = this.__slices;
			for (var i = 0; i != slices.length; i++) {
				var slice = slices[i];
				if (!slice.getUserData('toDelete') &&
					(slice.isReady())) {
					return slice;
				}
			}
			return null;
		},

		setPaintColor : function (color) {
			this.__initDrawing();
			this.__paintColor=color;
			this.__updateBrush();
		},

		setPaintWidth : function (width) {
			this.__initDrawing();
			this.__paintWidth=width;
			this.__updateBrush();
		},

		/**
		 * Removes a volume from the view.
		 * @param slices {desk.VolumeSlice} slice to remove
		*/
		removeVolume : function (slice) {
			var mySlices = this.__slices;
			for (var j = 0; j < mySlices.length; j++) {
				if (mySlices[j] == slice) {
					var mesh = slice.getUserData("mesh");
					if (mesh) {
						this.getScene().remove(mesh);

						//release GPU memory
						mesh.material.uniforms.texture.value.dispose();
						mesh.material.dispose();
						mesh.geometry.dispose();
						this.removeListenerById(slice.getUserData("updateListener"));
						this.render();
						slice.dispose();
						mySlices.splice(j, 1);
					} else {
						// the slice has not been loaded yet, postpone deletetion
						slice.setUserData('toDelete', true);
					}
					break;
				}
			}
		},

		/**
		 * Removes volumes stored in an array from the view.
		 * @param slices {Array} array of slices to remove
		*/
		removeVolumes : function (slices) {
			for (var i = 0; i != slices.length; i++) {
				this.removeVolume(slices[i]);
			}
		},

		__reorientationContainer : null,

		rotateLeft : function () {
			this.applyToLinks(function () {
				if(this.isOrientationChangesOperateOnCamera()) {
					var camera = this.getCamera();
					var controls = this.getControls(); 
					var direction = controls.target.clone();
					direction.sub(camera.position);
					var up = camera.up;
					direction.cross(up).normalize();
					up.copy(direction);
					controls.update();
				} else {
					var overlays = this.__directionOverlays;
					var tempValue = overlays[3].getValue();
					for (var i = 3; i > 0; i--) {
						overlays[i].setValue(overlays[i - 1].getValue());
					}
					overlays[0].setValue(tempValue);
				}
				this.render();
			});
		},

		rotateRight : function () {
			this.applyToLinks(function () {
				if(this.isOrientationChangesOperateOnCamera()) {
					var camera = this.getCamera();
					var controls = this.getControls(); 
					var direction = controls.target.clone();
					direction.sub(camera.position);
					var up = camera.up;
					direction.cross(up).normalize().negate();
					up.copy(direction);
					controls.update();
				} else {
					var overlays = this.__directionOverlays;
					var tempValue = overlays[0].getValue();
					for (var i = 0; i < 3; i++) {
						overlays[i].setValue(overlays[i + 1].getValue());
					}
					overlays[3].setValue(tempValue);
				}
				this.render();
			});
		},

		flipX : function () {
			this.applyToLinks(function () {
				if(this.isOrientationChangesOperateOnCamera()) {
					this.setCameraZ( - this.getCameraZ());
				} else {
					var overlays = this.__directionOverlays;
					var tempValue = overlays[1].getValue();
					overlays[1].setValue(overlays[3].getValue());
					overlays[3].setValue(tempValue);
				}
				this.render();
			});
		},

		flipY : function () {
			this.applyToLinks(function () {
				if(this.isOrientationChangesOperateOnCamera()) {
					this.getCamera().up.negate();
					this.setCameraZ( - this.getCameraZ());
				} else {
					var overlays = this.__directionOverlays;
					var tempValue = overlays[0].getValue();
					overlays[0].setValue(overlays[2].getValue());
					overlays[2].setValue(tempValue);
				}
				this.render();
			});
		},

		getOverLays : function() {
			return this.__directionOverlays;
		},
		
		getReorientationContainer : function () {
			if (this.__reorientationContainer) {
				return this.__reorientationContainer;
			}
			
			var gridContainer = this.__reorientationContainer = new qx.ui.container.Composite();
			var gridLayout = new qx.ui.layout.Grid(3, 3);
			for (var i=0;i<2;i++) {
				gridLayout.setRowFlex(i, 1);
				gridLayout.setColumnFlex(i, 1);
			}
			gridContainer.set({layout : gridLayout,	decorator : "main"});

			var rotateLeft = new qx.ui.form.Button("Rotate left");
			rotateLeft.addListener("execute", this.rotateLeft, this);
			gridContainer.add(rotateLeft, {row: 0, column: 0});

			var rotateRight = new qx.ui.form.Button("Rotate right");
			rotateRight.addListener("execute", this.rotateRight, this);
			gridContainer.add(rotateRight, {row: 0, column: 1});

			var flipX = new qx.ui.form.Button("Flip X");
			flipX.addListener("execute", this.flipX, this);
			gridContainer.add(flipX, {row: 1, column: 0});

			var flipY = new qx.ui.form.Button("Flip Y");
			flipY.addListener("execute", this.flipY, this);
			gridContainer.add(flipY, {row: 1, column: 1});
			return gridContainer;
		},

		__propagateCameraToLinks : function () {
			this.applyToOtherLinks(function (me) {
				this.getControls().copy(me.getControls());
				this.setSlice(me.getSlice());
				this.setCameraZ(me.getCameraZ());
				this.render();
			});
		},

		__applyCameraZ : function (z) {
			this.getCamera().position.z = z;
			this.getControls().update();
			this.render();
		},

		__createCrossMeshes : function (volumeSlice) {
			var coordinates = volumeSlice.get2DCornersCoordinates();
			var material = new THREE.LineBasicMaterial({
				color : 0x4169FF,
				linewidth : 2,
				opacity : 0.5,
				transparent : true
			});

			var hGeometry = new THREE.Geometry();
			hGeometry.vertices.push(new THREE.Vector3(coordinates[0], 0, 0),
				new THREE.Vector3(coordinates[2], 0, 0));
			var hline = new THREE.Line(hGeometry, material);
			hline.renderDepth = -900;
			this.getScene().add(hline);

			var vGeometry = new THREE.Geometry();
			vGeometry.vertices.push(new THREE.Vector3(0, coordinates[1], 0),
				new THREE.Vector3(0, coordinates[5], 0));
			var vline = new THREE.Line(vGeometry, material);
			vline.renderDepth = -900;
			this.getScene().add(vline);

            var crossMeshes = this.__crossMeshes;
            if (crossMeshes) {
                for (var i = 0; i < crossMeshes.length; i++) {
					var mesh = crossMeshes[i];
                    this.getScene().remove(mesh);
                    mesh.geometry.dispose();
                }
            }
			this.__crossMeshes = crossMeshes = [];
			crossMeshes.push(hline, vline);
		},

		__coordinatesRatio : null,
		__brushCanvas : null,

		__createBrushMesh : function (volumeSlice) {
			var geometry = new THREE.Geometry();
			geometry.dynamic = true;
			var coordinates = volumeSlice.get2DCornersCoordinates();
			var dimensions = volumeSlice.get2DDimensions();

			this.__coordinatesRatio = 
				[(coordinates[2] - coordinates[0]) / dimensions[0],
				(coordinates[5] - coordinates[3]) / dimensions[1]];

			for (var i = 0; i < 4; i++) {
				geometry.vertices.push(
					new THREE.Vector3(coordinates[2 * i],
						coordinates[2 * i + 1], 0));
			}

			geometry.faces.push(new THREE.Face3(0, 1, 2));
			geometry.faces.push(new THREE.Face3(0, 2, 3));
			var uv0 = 	new THREE.Vector2(0, 0),
				uv1 = new THREE.Vector2(1, 0),
				uv2 = new THREE.Vector2(1, 1),
				uv3 = new THREE.Vector2(0, 1);
			geometry.faceVertexUvs[0].push([uv0, uv1, uv2]);
			geometry.faceVertexUvs[0].push([uv0, uv2, uv3]);

			var width = 100;
			var height = 100;

			var canvas = this.__brushCanvas;
			if (!canvas) {
				this.__brushCanvas = canvas = new qx.ui.embed.Canvas().set({
					syncDimension: true,
					canvasWidth: width,
					canvasHeight: height,
					width: width,
					height: height
				});
			}

			var texture = new THREE.DataTexture(new Uint8Array(width * height * 4),
				width, height, THREE.RGBAFormat);
			texture.generateMipmaps = false;
			texture.needsUpdate = true;
			texture.magFilter = texture.minFilter = THREE.NearestFilter;
			
			var material = new THREE.MeshBasicMaterial({map:texture, transparent: true});
			material.side = THREE.DoubleSide;

			var mesh = new THREE.Mesh(geometry,material);
			mesh.renderDepth = -1000;
			this.__brushMesh = mesh;
			this.__updateBrush();

			mesh.visible = false;
			this.getScene().add(mesh);
		},

		__updateBrush : function() {
			var canvas = this.__brushCanvas;
			var context = canvas.getContext2d();
			var width = canvas.getCanvasWidth();
			var height = canvas.getCanvasHeight();

			// recreate brush image
			if (this.isEraseMode()) {
				context.fillStyle = "white";
				context.fillRect (0, 0, width, height);
				context.fillStyle = "black";
				context.fillRect (10, 10, width-20, height-20);
			} else {
				context.clearRect (0, 0, width, height);
				context.lineWidth = 0;
				context.strokeStyle = context.fillStyle = this.__paintColor;
				context.beginPath();
				context.arc(width / 2, height / 2, width/2,
					0, 2 * Math.PI, false);
				context.closePath();
				context.fill();
			}

			// upload image to texture
			var length = width * height * 4;
			var data = context.getImageData(0, 0, width, height).data;
			var material = this.__brushMesh.material;
			var brushData = material.map.image.data;
			for (var i = length; i--;) {
				brushData[i] = data[i];
			}
			material.map.needsUpdate = true;

			// update vertices coordinates
			var radius = this.__paintWidth / 2;
			var ratio = this.__coordinatesRatio;
			var r0 = radius * ratio[0];
			var r1 = radius * ratio[1];
			var geometry = this.__brushMesh.geometry;
			geometry.vertices[0].set(-r0, -r1, 0);
			geometry.vertices[1].set(r0, -r1, 0);
			geometry.vertices[2].set(r0, r1, 0);
			geometry.vertices[3].set(-r0, r1, 0);
			geometry.verticesNeedUpdate = true;
		},

		__setDrawingMesh : function (volumeSlice) {
			var geometry = new THREE.Geometry();
			var coordinates = volumeSlice.get2DCornersCoordinates();
			for (var i = 0; i < 4; i++) {
				geometry.vertices.push(
					new THREE.Vector3(coordinates[2 * i],coordinates[2*i + 1], 0));
			}

			geometry.faces.push(new THREE.Face3(0, 1, 2));
			geometry.faces.push(new THREE.Face3(0, 2, 3));
			var uv0 = 	new THREE.Vector2(0, 0),
				uv1 = new THREE.Vector2(1, 0),
				uv2 = new THREE.Vector2(1, 1),
				uv3 = new THREE.Vector2(0, 1);
			geometry.faceVertexUvs[0].push([uv0, uv1, uv2]);
			geometry.faceVertexUvs[0].push([uv0, uv2, uv3]);

			var width = this.__volume2DDimensions[0];
			var height = this.__volume2DDimensions[1];

			this.__drawingCanvas.set({
				canvasWidth: width,
				canvasHeight: height,
				width: width,
				height: height
			});
			this.__drawingCanvas.getContext2d().clearRect(0, 0, width, height);

			var length = width * height * 4;
			var dataColor = new Uint8Array( length);

			var texture = new THREE.DataTexture(dataColor, width, height, THREE.RGBAFormat);
			texture.generateMipmaps = false;
			texture.needsUpdate = true;
			texture.magFilter = THREE.NearestFilter;
			texture.minFilter = THREE.NearestFilter;

			var material = new THREE.MeshBasicMaterial( {map:texture, transparent: true});
			material.side = THREE.DoubleSide;

			var mesh = new THREE.Mesh(geometry,material);
			mesh.renderDepth = -800;

			this.getScene().add(mesh);
			if (this.__drawingMesh) {
				this.getScene().remove(this.__drawingMesh);
				this.__drawingMesh.geometry.dispose();
				this.__drawingMesh.material.map.dispose();
				this.__drawingMesh.material.dispose();
				this.removeListenerById(this.__drawingListeners[0]);
				this.removeListenerById(this.__drawingListeners[1]);
			}
			this.__drawingMesh = mesh;

			geometry.computeCentroids();
			geometry.computeFaceNormals();
			geometry.computeVertexNormals();
			geometry.computeBoundingSphere();

			function updateTexture() {
				var data = this.__drawingCanvas.getContext2d().getImageData(
					0, 0, width, height).data;
				for (var i = length; i--;) {
					dataColor[i] = data[i];
				}
				texture.needsUpdate = true;
				this.render();
			}

			updateTexture.apply(this);

			var dl1 = this.addListener('changeDrawing', function() {
				updateTexture.apply(this);
				this.render();
			}, this);

			var dl2 = this.addListener("changePaintOpacity", function (event) {
				mesh.material.opacity = event.getData();
				this.render();
			}, this);

			this.__drawingListeners = [dl1, dl2];
		},

		// listeners Ids to get rid of when changing drawing canvas
		__drawingListeners : null,

		__addSlice : function (volumeSlice, parameters, callback) {
			var geometry = new THREE.Geometry();
			var coordinates = volumeSlice.get2DCornersCoordinates();
			for (var i = 0; i < 4; i++) {
				geometry.vertices.push(new THREE.Vector3(coordinates[2 * i],
					coordinates[2 * i + 1], 0));
			}

			geometry.faces.push(new THREE.Face3(0, 1, 2));
			geometry.faces.push(new THREE.Face3(0, 2, 3));
			var uv0 = 	new THREE.Vector2(0, 0),
				uv1 = new THREE.Vector2(1, 0),
				uv2 = new THREE.Vector2(1, 1),
				uv3 = new THREE.Vector2(0, 1);
			geometry.faceVertexUvs[0].push([uv0, uv1, uv2]);
			geometry.faceVertexUvs[0].push([uv0, uv2, uv3]);

			var listener = this.addListener("changeSlice", function (e) {
				volumeSlice.setSlice(e.getData());
			});

			volumeSlice.setUserData("updateListener", listener);

			var material = volumeSlice.getMaterial();
			material.side = THREE.DoubleSide;
			var mesh = new THREE.Mesh(geometry, material);
			mesh.renderDepth = - this.__slices.length;
			volumeSlice.setUserData("mesh", mesh);
			geometry.computeCentroids();
			geometry.computeFaceNormals();
			geometry.computeVertexNormals();
			geometry.computeBoundingSphere();

			volumeSlice.addListenerOnce('changeImage',function () {
				this.getScene().add(mesh);
				if (typeof callback === "function") {
					callback(volumeSlice);
				}
			}, this);

			volumeSlice.addListener('changeImage', function () {
				// whe need directly render to avoid race conditions
				this.render(true);
			}, this);

			volumeSlice.addListener("changeSlice", function (e) {
				this.setSlice(e.getData());
			}, this);
		},

		__initDrawingDone : false,

		__initDrawing : function () {
			if (this.__initDrawingDone) return;
			var volumeSlice = this.getFirstSlice();
			this.__setDrawingMesh(volumeSlice);
			this.__createBrushMesh(volumeSlice);
			this.__initDrawingDone = true;
		},

		__initFromVolume : function (volumeSlice) {
			this.__initDrawingDone = false;
			this.__slider.setMaximum(volumeSlice.getNumberOfSlices() - 1);
			if (volumeSlice.getNumberOfSlices() === 1) {
				this.__slider.setVisibility("hidden");
			} else {
				this.__slider.setVisibility("visible");
			}

			var camera = this.getCamera();
			var position = camera.position;
			camera.up.set(0, 1, 0);
			var coordinates = volumeSlice.get2DCornersCoordinates();

			position.set(0.5 * (coordinates[0] + coordinates[2]),
				0.5 * (coordinates[3] + coordinates[5]), 0);
			this.getControls().target.copy(position);
			position.z = volumeSlice.getBoundingBoxDiagonalLength() * 0.6;
			this.setCameraZ(volumeSlice.getBoundingBoxDiagonalLength() * 0.6);

			this.__projector = new THREE.Projector();
			this.__intersection = new THREE.Vector3();
			this.__2DCornersCoordinates = coordinates;
			this.__volume2DSpacing = volumeSlice.get2DSpacing();
			this.__volume2DDimensions = volumeSlice.get2DDimensions();
			this.__volumeOrigin = volumeSlice.getOrigin();
			this.__volumeSpacing = volumeSlice.getSpacing();

			this.__createCrossMeshes(volumeSlice);

			switch (this.__orientation)
			{
				case 0 :
					this.flipY();
					break;
				case 1 :
					this.flipX();
					this.flipY();
					break;
				default:
					break;
			}

			var dimensions = volumeSlice.getDimensions();
			for (var coordinate = 0; coordinate < 3; coordinate++) {
				if (dimensions[coordinate] === 1) {
					dimensions[coordinate] = 0;
				}
			}
			this.__positionI = undefined; // to force cross position update
			this.setCrossPosition(Math.round(dimensions[0] / 2),
				Math.round(dimensions[1] / 2),
				Math.round(dimensions[2] / 2));
		},

		/** adds a volume to the view
		 * @param file {String} : file to add
		 * @param parameters {Object} : parameters
		 * @param callback {Function} : callback when done
		 * @return {desk.VolumeSlice} : displayed volume
		 */
		addVolume : function (file, parameters, callback) {
			var firstSlice = true;
			var slices = this.__slices;
			for (var i = 0; i != slices.length; i++) {
				if (slices[i].getUserData('toDelete') !== true) {
					firstSlice = false;
				}
			}

			var volumeSlice = new desk.VolumeSlice(file,
				this.__orientation, parameters, function () {
					if (volumeSlice.getUserData('toDelete')) {
						// deletion was triggered before slice was completely loaded
						for (var i = 0; i != slices.length; i++) {
							if (slices[i] === volumeSlice) {
								slices.splice(i, 1);
							}
						}
						volumeSlice.dispose();
						return;
					}
					if (firstSlice) {
						this.__initFromVolume(volumeSlice);
					}
					volumeSlice.setSlice(this.getSlice());
					this.__addSlice(volumeSlice, parameters, callback);
			}, this);
			this.__slices.push(volumeSlice);
			return volumeSlice;
		},

		/**
		 changes the display rank of the volume. Higher rank values are
		 * rendered last
		 * @param volumeSlice {desk.volumeSlice} : volumeSlice to alter
		 * @param rank {Int} : rank to apply
		 **/
		setSliceRank : function (volumeSlice, rank) {
			var slices = this.__slices;
			for (var i = 0; i < slices.length; i++) {
                var slice = slices[i];
				if (slice === volumeSlice) {
					var mesh = slice.getUserData("mesh");
					if (mesh) {
						// the mesh may not exist if no slice has been loaded yet
						mesh.renderDepth = - rank;
					}
				}
			}
		},

		__setCrossPositionFromEvent : function (event) {
			var position = this.getPositionOnSlice(event);
			var v = [position.i, position.j];
			var dimensions = this.__volume2DDimensions;
			var i, j, k;

			for (i = 0; i < 2; i++) {
				if (v[i] < 0) {
					v[i] = 0;
				} else if (v[i] > (dimensions[i] - 1)) {
					v[i] = dimensions[i] - 1;
				}
			}
			switch (this.__orientation)
			{
			case 0 :
				i = v[0];
				j = v[1];
				k = this.getSlice();
				break;
			case 1 :
				i = this.getSlice();
				j = v[1];
				k = v[0];
				break;
			case 2 :
			default :
				i = v[0];
				j = this.getSlice();
				k = v[1];
				break;
			}

			this.setCrossPosition(i, j, k);
		},

		__positionI : null,
		__positionJ : null,
		__positionK : null,

		getCrossPosition : function () {
			return {i : this.__positionI,
					j : this.__positionJ,
					k : this.__positionK};
		},

		setCrossPosition : function (i,j,k) {
			if ((this.__positionI === i) && (this.__positionJ === j) &&
				(this.__positionK === k)) {
					return;
			}
			var slice, x, y;
			var dimensions = this.__volume2DDimensions;
			if (!dimensions) {
				// dimensions might not exist if the volume is not ready yet
				return;
			}
			switch (this.__orientation) {
			case 0 :
				x = i;
				y = dimensions[1] - 1 -j;
				slice = k;
				break;
			case 1 :
				x = k;
				y = dimensions[1]- 1 - j;
				slice = i;
				break;
			case 2 :
			default :
				x = i;
				y = dimensions[1]- 1 - k;
				slice = j;
				break;
			}

			var spacing = this.__volume2DSpacing;
			var coordinates = this.__2DCornersCoordinates;
			x = coordinates[0] + (0.5 + x) * spacing[0];
			y = coordinates[1] - (0.5 + y) * spacing[1];

			this.__positionI = i;
			this.__positionJ = j;
			this.__positionK = k;
			this.__crossMeshes[0].position.setY(y);
			this.__crossMeshes[1].position.setX(x);
			this.setSlice(slice);
			this.render();

			this.fireEvent("changeCrossPosition");
			this.applyToOtherLinks (function () {
				this.setCrossPosition(i, j, k);
			});
		},

		/**
		* interactionMode : 
		* -1 : nothing
		* 0 : left click
		* 1 : zoom
		* 2 : pan
		* 3 : paint
		* 4 : erase
		* */
		__interactionMode : -1,

		__onMouseDown : function (event) {
			this.capture();
			var controls = this.getControls();
			this.__interactionMode = 0;
			var origin, position, width;
			if (event.isRightPressed() || event.isCtrlPressed()) {
				this.__interactionMode = 1;
				origin = this.getContentLocation();
				controls.mouseDown(this.__interactionMode,
					event.getDocumentLeft() - origin.left,
					event.getDocumentTop() - origin.top);
			} else if ((event.isMiddlePressed())||(event.isShiftPressed())) {
				this.__interactionMode = 2;
				origin = this.getContentLocation();
				controls.mouseDown(this.__interactionMode,
					event.getDocumentLeft()-origin.left,
					event.getDocumentTop()-origin.top);
			} else if (this.isPaintMode()) {
				this.__interactionMode = 3;
				this.__saveDrawingToUndoStack();
				position = this.getPositionOnSlice(event);
				var context = this.__drawingCanvas.getContext2d();
				var i = position.i + 0.5;
				var j = position.j + 0.5;
				var paintColor = this.__paintColor;
				width = this.__paintWidth;
				context.lineWidth = 0;
				context.strokeStyle = paintColor;
				context.fillStyle = paintColor;
				context.beginPath();
				context.arc(i, j, width/2, 0, 2*Math.PI, false);
				context.closePath();
				context.fill();
				context.lineJoin = "round";
				context.lineWidth = width;
				context.beginPath();
				context.moveTo(i, j);
				context.closePath();
				context.stroke();
				this.__drawingCanvasModified = true;
				this.fireEvent("changeDrawing");
			} else if (this.isEraseMode()) {
				this.__interactionMode = 4;
				this.__saveDrawingToUndoStack();
				position = this.getPositionOnSlice(event);
				var x = Math.round(position.i) + 0.5;
				var y = Math.round(position.j) + 0.5;
				width = this.__paintWidth;
				var radius = width / 2;
				this.__drawingCanvas.getContext2d().clearRect(
					x - radius, y - radius, width, width);
				this.__drawingCanvasModified = true;
				this.fireEvent("changeDrawing");
			} else {
				this.__setCrossPositionFromEvent(event);
			}
			this.fireDataEvent("viewMouseDown",event);
		},

		__onMouseOut : function (event) {
			if (this.__sliderInUse) {
				return;
			}
			this.__viewOn = false;
			this.__rightContainer.setVisibility("hidden");
			this.__directionOverlays[3].setLayoutProperties({right: 1, top:"45%"});
			if (this.__brushMesh) this.__brushMesh.visible = false;
			this.render();
			this.fireDataEvent("viewMouseOut",event);
		},

		__onMouseMove : function (event) {
			this.__viewOn = true;
			var controls = this.getControls();
			if (this.__rightContainer.getVisibility() === "hidden") {
				this.__directionOverlays[3].setLayoutProperties({right: 32, top: "45%"});
				this.__rightContainer.setVisibility("visible");
			}

			var brushMesh = this.__brushMesh;
			var position;
			switch (this.__interactionMode)
			{
			case -1:
				if (this.isPaintMode() || this.isEraseMode()) {
					position = this.getPositionOnSlice(event);
					brushMesh.visible = true;
					brushMesh.position.set(position.x, position.y, 0);
					this.render();
				}
				break;
			case 0 :
				this.__setCrossPositionFromEvent(event);
				break;
			case 1 :
				if (brushMesh) brushMesh.visible = false;
				var origin = this.getContentLocation();
				controls.mouseMove(event.getDocumentLeft() - origin.left,
					event.getDocumentTop() - origin.top);

				var z = this.getCamera().position.z;
				this.setCameraZ(z);
				this.__propagateCameraToLinks();
				break;
			case 2 :
				if (brushMesh) brushMesh.visible = false;
				origin = this.getContentLocation();
				controls.mouseMove(event.getDocumentLeft() - origin.left,
						event.getDocumentTop() - origin.top);
				this.render();
				this.__propagateCameraToLinks();
				break;
			case 3 :
				position = this.getPositionOnSlice(event);
				brushMesh.visible = true;
				brushMesh.position.set(position.x, position.y, 0);
				var context = this.__drawingCanvas.getContext2d();
				context.lineTo(position.i + 0.5, position.j + 0.5);
				context.stroke();
				this.fireEvent("changeDrawing");
				this.__drawingCanvasModified = true;
				break;
			case 4 :
			default :
				position = this.getPositionOnSlice(event);
				brushMesh.visible = true;
				brushMesh.position.set(position.x, position.y, 0);
				var x = Math.round(position.i) + 0.5;
				var y = Math.round(position.j) + 0.5;
				var width = this.__paintWidth;
				var radius = width / 2;
				this.__drawingCanvas.getContext2d().clearRect(
					x - radius, y - radius, width, width);
				this.__drawingCanvasModified = true;
				this.fireEvent("changeDrawing");
				break;
			}
			event.preventDefault(); // Prevent cursor changing to "text" cursor while drawing
			this.fireDataEvent("viewMouseMove",event);
		},

		__onMouseUp : function (event)	{
			this.releaseCapture();
			this.getControls().mouseUp();
			if ((this.isPaintMode()) && (this.__interactionMode == 3)) {
				var context = this.__drawingCanvas.getContext2d();
				var position = this.getPositionOnSlice(event);

				var i = position.i + 0.5;
				var j = position.j + 0.5;

				var paintColor = this.__paintColor;
				var width = this.__paintWidth;
				context.lineWidth = 0;
				context.strokeStyle = paintColor;
				context.fillStyle = paintColor;
				context.beginPath();
				context.arc(i, j, width / 2, 0, 2 * Math.PI, false);
				context.closePath();
				context.fill();
				this.fireEvent("changeDrawing");
			}
			this.__interactionMode = -1;
			this.fireDataEvent("viewMouseUp",event);
		},

		__onMouseWheel : function (event) {
			var delta = 1;
			var slider = this.__slider;
			if (event.getWheelDelta() < 0) {
				delta = -1;
			}
			var newValue = slider.getValue() + delta;
			newValue = Math.min(newValue, slider.getMaximum());
			newValue = Math.max(newValue, slider.getMinimum());
			slider.setValue(newValue);
			this.fireDataEvent("viewMouseWheel",event);
		},

		__setupInteractionEvents : function () {
			this.addListener("mousedown", this.__onMouseDown, this);
			this.addListener("mouseout", this.__onMouseOut, this);
			this.addListener("mousemove", this.__onMouseMove, this);
			this.addListener("mouseup", this.__onMouseUp, this);
			this.addListener("mousewheel", this.__onMouseWheel, this);
		},

		__intersection : null,
		__2DCornersCoordinates : null,
		__volume2DDimensions : null,
		__volume2DSpacing : null,
		__volumeOrigin : null,
		__volumeSpacing : null,
		__projector : null,
		
		get3DPosition : function (event) {
			var coordinates = this.getPositionOnSlice(event);
			var slice = this.getSlice();
			switch (this.__orientation) {
			case 0 :
				return {
					i : coordinates.i,
					j : coordinates.j,
					k : slice,
					x : coordinates.x,
					y : coordinates.y,
					z : this.__volumeOrigin[2] + this.__volumeSpacing[2]*slice
				};
				
			case 1 :
				return {
					i : slice,
					j : coordinates.j,
					k : coordinates.i,
					x : this.__volumeOrigin[0] + this.__volumeSpacing[0]*slice,
					y : coordinates.y,
					z : coordinates.x
				};
			case 2 :
			default :
				return {
					i : coordinates.i,
					j : slice,
					k : coordinates.j,
					x : coordinates.x,
					y : this.__volumeOrigin[1] + this.__volumeSpacing[1]*slice,
					z : coordinates.y
				};
			}
		},
		
		getPositionOnSlice : function (event) {
			var origin = this.getContentLocation();
			var x = event.getDocumentLeft() - origin.left;
			var y = event.getDocumentTop() - origin.top;

			var elementSize = this.getInnerSize();
			var x2 = ( x / elementSize.width ) * 2 - 1;
			var y2 = - ( y / elementSize.height ) * 2 + 1;

			var projector = this.__projector;
			var intersection = this.__intersection.set( x2, y2, 0);
			var coordinates = this.__2DCornersCoordinates;
			var dimensions = this.__volume2DDimensions;

			var camera = this.getCamera();
			projector.unprojectVector( intersection, camera );

			var cameraPosition = camera.position;
			intersection.sub(cameraPosition).
				multiplyScalar(-cameraPosition.z/intersection.z).
				add( cameraPosition );
			var xinter = intersection.x;
			var yinter = intersection.y;

			var intxc=Math.floor((xinter-coordinates[0])*dimensions[0]/(coordinates[2]-coordinates[0]));
			var intyc=dimensions[1] - 1- Math.floor((yinter-coordinates[1])*dimensions[1]/(coordinates[5]-coordinates[1]));
			return {i :intxc, j :intyc, x:xinter, y:yinter};
		},

		__createUI : function (file) {
			this.__drawingCanvas = new qx.ui.embed.Canvas().set({
				syncDimension: true
			});

			this.getRenderer().setClearColor( 0x000000, 1 );

			var directionOverlays = this.__directionOverlays = [];
			var font = new qx.bom.Font(16, ["Arial"]);
			font.setBold(true);
            var settings = {textColor : this.__textColor,
                font : font,
                opacity : 0.5
            };
            qx.util.DisposeUtil.disposeTriggeredBy(font, this);
			var northLabel = new qx.ui.basic.Label("S").set(settings);
			this.add(northLabel, {left: "50%", top:"1%"});

			var southLabel = new qx.ui.basic.Label("I").set(settings);
			this.add(southLabel, {left: "50%", bottom:"1%"});

            var westLabel = new qx.ui.basic.Label("L").set(settings);
			this.add(westLabel, {left: "1%", top:"45%"});

            var eastLabel = new qx.ui.basic.Label("R").set(settings);
			this.add(eastLabel, {right: "1%", top:"45%"});

			directionOverlays.push(northLabel, westLabel, southLabel, eastLabel);
			switch (this.__orientation) {
			case 0 :
				northLabel.setValue("A");
				southLabel.setValue("P");
				westLabel.setValue("L");
				eastLabel.setValue("R");
				break;
			case 1 :
				northLabel.setValue("A");
				southLabel.setValue("P");
				westLabel.setValue("S");
				eastLabel.setValue("I");
				break;
			case 2 :
			default:
				northLabel.setValue("S");
				southLabel.setValue("I");
				westLabel.setValue("L");
				eastLabel.setValue("R");
				break;
			}

			var label = this.__sliceLabel = new qx.ui.basic.Label("0");
			label.set({textAlign: "center", width : 40, font : font,
				textColor : this.__textColor});
			this.add(label, {top :0, left :0});

			var slider = this.__slider = new qx.ui.form.Slider().set (
				{minimum : 0, maximum : 100, value : 0,
				width :30, opacity : 0.5, backgroundColor : "transparent",
				orientation : "vertical", zIndex : 1000
			});
			slider.addListener('mousedown', function () {
				this.__sliderInUse = true;
			}, this)
			slider.addListener('mouseup', function () {
				this.__sliderInUse = false;
			}, this)
			slider.addListener("changeValue",function(e){
				if (!this.getFirstSlice()) return;
				this.setSlice(this.getFirstSlice().getNumberOfSlices()-1-e.getData());
			}, this);

			var rightContainer = this.__rightContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox());
			rightContainer.add(slider, {flex : 1});
			rightContainer.setVisibility("hidden");
			this.add(rightContainer, {right : 0, top : 0, height : "100%"});
		},

		// this member is true only when user is manipulating the slider
		__sliderInUse : false,

		__sliceLabel : null,

		__applyChangeSlice : function (sliceId) {
			this.__sliceLabel.setValue(sliceId + "");
			// something fishy here : getNumberOfSlices should never be 0 but it is sometimes...
			var slice = this.getFirstSlice();
			if (!slice) {
				return;
			}
			var sliderValue = slice.getNumberOfSlices() - 1 - sliceId;
			sliderValue = Math.max(sliderValue, this.__slider.getMinimum());
			sliderValue = Math.min(sliderValue, this.__slider.getMaximum());
			this.__slider.setValue(sliderValue);

			var i = this.__positionI;
			var j = this.__positionJ;
			var k = this.__positionK;

			switch (this.__orientation) {
				case 0 :
					k = sliceId;
					break;
				case 1 :
					i = sliceId;
					break;
				case 2 :
				default :
					j = sliceId;
					break;
			}

			this.setCrossPosition(i, j, k);
			this.__propagateCameraToLinks();
		},

		__undoData : null,
		__redoData : null,
		__doingIndex : null,

		__onCtrlZ : function (event) {
			if(!this.__viewOn) return;
			var undoData = this.__undoData;
			var doingIndex = this.__doingIndex;
			if (!undoData.length || (doingIndex < 0)) return;
			if(doingIndex === undoData.length - 1) {
				this.__saveDrawingToUndoStack();
			}
			var canvas = this.__drawingCanvas;
			var context = canvas.getContext2d();
			var image = canvas.getContext2d().getImageData(
				0, 0, canvas.getWidth(), canvas.getHeight());
			context.clearRect(0, 0, canvas.getCanvasWidth(),
				canvas.getCanvasHeight());
			var currData = undoData[doingIndex];
			context.putImageData(currData, 0, 0);
			this.__doingIndex = doingIndex - 1;
			this.fireEvent("changeDrawing");
		},

		__onCtrlY : function (event) {
			if(! this.__viewOn) return;
			var undoData = this.__undoData;
			if(!undoData.length) return;
			this.__doingIndex++;
			if (this.__doingIndex + 1 < undoData.length) {
				var canvas = this.__drawingCanvas;
				var context = canvas.getContext2d();
				context.clearRect(0, 0,
					canvas.getCanvasWidth(),canvas.getCanvasHeight());
				var currData = undoData[this.__doingIndex + 1];
				context.putImageData(currData, 0, 0);
				if(this.__doingIndex === undoData.length-1)
					undoData.pop();
				this.fireEvent("changeDrawing");
			}
			else {
				this.__doingIndex--;
			}
		},

		__initUndo : function () {
			this.__undoData = [];
			this.__redoData = [];
			this.__doingIndex = 0;
			var undoCommand = new qx.ui.core.Command("Ctrl+Z");
			undoCommand.addListener("execute", this.__onCtrlZ, this);
			var redoCommand = new qx.ui.core.Command("Ctrl+Y");
			redoCommand.addListener("execute", this.__onCtrlY, this);
			this.addListener("changeSlice", function (event) {
				this.__undoData = [];
			}, this);
			qx.util.DisposeUtil.disposeTriggeredBy(undoCommand, this);
			qx.util.DisposeUtil.disposeTriggeredBy(redoCommand, this);
		},

		__saveDrawingToUndoStack : function () {
			var canvas = this.__drawingCanvas;
			var image = canvas.getContext2d().getImageData(
				0, 0, canvas.getWidth(), canvas.getHeight());
			var undoData = this.__undoData;
			if (undoData.length === 10) {
				undoData.shift();
			}
			undoData.push(image);
			var redos2Discard = undoData.length -2 - this.__doingIndex; // -1 because it is about indexes, -1 to have the length before the saving
			for(var i = 0; i < redos2Discard; i++) // discard unused redo data
				undoData.pop();
			this.__doingIndex = undoData.length - 1;
		}
	}
});

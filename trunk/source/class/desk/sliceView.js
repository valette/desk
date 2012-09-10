/*
#ignore(THREE.*)
#ignore(THREE)
#ignore(requestAnimationFrame)
#ignore(Detector)
#ignore(Uint8Array)
@lint ignoreGlobal(THREE)
*/

qx.Class.define("desk.sliceView", 
{
	extend : qx.ui.container.Composite,

	construct : function(fileBrowser, master, orientation)
	{
		this.base(arguments);
		this.setLayout(new qx.ui.layout.HBox());
		this.setDecorator("main");

		this.__slices=[];
		this.__fileBrowser=fileBrowser;

		if (typeof orientation=="number") {
			this.setOrientation(orientation);
		}
		else {
			this.setOrientation(0);
		}

		this.__master=master;		

		this.__createUI();

		this.__drawingCanvas = new qx.ui.embed.Canvas().set({
			syncDimension: true
		});

		this.addListener("changePaintMode", function (e) {
			if (e.getData()==true) {
				this.setEraseMode(false);
			}
		}, this);

		this.addListener("changeEraseMode", function (e) {
			if (e.getData()==true) {
				this.setPaintMode(false);
			}
		}, this);
		
		this.__initUndo();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		//~ this.add(this.getReorientationContainer());
		return (this);		
	},

	destruct : function(){
		console.log();
		this.unlink();
		//clean the scene
	},

	properties : {
		slice : { init : 0, check: "Number", event : "changeSlice"},
		paintOpacity : { init : 1, check: "Number", event : "changePaintOpacity"},
		orientation : { init : -1, check: "Number", event : "changeOrientation"},
		orientPlane : { init : "", check: "String", event : "changeOrientPlane"},
		ready : { init : false, check: "Boolean", event : "changeReady"},
		paintMode : { init : false, check: "Boolean", event : "changePaintMode"},
		eraseMode : { init : false, check: "Boolean", event : "changeEraseMode"}
	},

	events : {
		"changeDrawing" : "qx.event.type.Event",
		"viewMouseDown" : "qx.event.type.Event",
		"viewMouseMove" : "qx.event.type.Event",
		"viewMouseOver" : "qx.event.type.Event",
		"viewMouseOut" : "qx.event.type.Event",
		"viewMouseUp" : "qx.event.type.Event",
		"viewMouseClick" : "qx.event.type.Event",
		"viewMouseWheel" : "qx.event.type.Event"
	},

	members : {

		__fileBrowser : null,
		__slices : null,

		__slider : null,

		__rightContainer : null,

		__viewPort : null,
		__overlayCanvas : null,
		__directionOverlays : null,

		__paintWidth : 5,
		__paintColor : null,

		//THREE.js objects
		__scene : null,
		__camera : null,
		__renderer : null,
		__controls : null,

		__master : null,

		__drawingCanvas : null,
		__drawingMesh : null,

		__brushMesh : null,

		__crossMeshes : null,
		
		__drawingCanvasModified : false,

		__updateBrush : null,

		getScene : function() {
			return this.__scene;
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
			return this.__drawingCanvas;
		},

		isDrawingCanvasModified : function () {
			return this.__drawingCanvasModified;
		},

		setDrawingCanvasNotModified : function () {
			this.__drawingCanvasModified=false;
		},

		getVolumeSliceToPaint : function () {
			return (this.__slices[0]);
		},

		setPaintColor : function (color) {
			this.__paintColor=color;
			this.__updateBrush()
		},

		setPaintWidth : function (width) {
			this.__paintWidth=width;
			this.__updateBrush()
		},

		__renderFunction : null,
		__renderingTriggered : false,

		render : function ( ) {
			var _this=this;
//			console.log("render slice");
			if (this.__renderFunction==null) {
				this.__renderFunction=
					function () {
						_this.__controls.update();
						_this.__renderer.render( _this.__scene, _this.__camera );
						_this.__renderingTriggered = false;
				};
			}
			if (!this.__renderingTriggered) {
				this.__renderingTriggered=true;
				requestAnimationFrame(this.__renderFunction);
			}
		},

		addVolume : function (file, parameters, callback)
		{
			if (this.isReady()) {
				this.__addVolume(file, parameters, callback);
			}
			else {
				this.addListenerOnce("changeReady", function () {
					this.__addVolume(file, parameters, callback);},this);
			}
		},

		removeVolumes : function (slices) {
			var mySlices=this.__slices;
			for (var i=0;i<slices.length;i++) {
				var slice=slices[i];
				for (var j=0;j<mySlices.length;j++) {
					if (mySlices[j]==slice) {
						var mesh=slice.getUserData("mesh");
						this.__scene.remove(mesh);
						mySlices.splice(j,1);
						this.removeListenerById(slice.getUserData("updateListener"));
						this.render();
						slice.dispose();
						break;
					}
				}
			}
		},

		__reorientationContainer : null,
		__orientsButtonGroup : null,

		rotateLeft : function () {
			this.applyToLinks(function () {
				var item2orient = this.__orientsButtonGroup.getSelection()[0].getUserData("buttonID");
				if(item2orient==1)
				{
					var camera=this.__camera;
					var direction=this.__controls.target.clone();
					direction.subSelf(camera.position);
					var up=camera.up;
					direction.crossSelf(up).normalize();
					up.copy(direction);
				}
				if(item2orient==2)
				{
					var overlays=this.__directionOverlays;
					var tempValue=overlays[3].getValue();
					for (var i=3;i>0;i--) {
						overlays[i].setValue(overlays[i-1].getValue());
					}
					overlays[0].setValue(tempValue);
				}
				this.render();
			});
		},

		rotateRight : function () {
			this.applyToLinks(function () {
				var item2orient = this.__orientsButtonGroup.getSelection()[0].getUserData("buttonID");
				if(item2orient==1)
				{
					var camera=this.__camera;
					var direction=this.__controls.target.clone();
					direction.subSelf(camera.position);
					var up=camera.up;
					direction.crossSelf(up).normalize().negate();
					up.copy(direction);
				}
				if(item2orient==2)
				{
					var overlays=this.__directionOverlays;
					var tempValue=overlays[0].getValue();
					for (var i=0;i<3;i++) {
						overlays[i].setValue(overlays[i+1].getValue());
					}
					overlays[3].setValue(tempValue);
				}
				this.render();
			});
		},

		flipX : function () {
			this.applyToLinks(function () {
				var item2orient = this.__orientsButtonGroup.getSelection()[0].getUserData("buttonID");
				if(item2orient==1)
				{
					var camera=this.__camera;
					camera.position.setZ(-camera.position.z);
				}
				if(item2orient==2)
				{
					var overlays=this.__directionOverlays;
					var tempValue=overlays[1].getValue();
					overlays[1].setValue(overlays[3].getValue());
					overlays[3].setValue(tempValue);
				}
				this.render();
			});
		},

		flipY : function () {
			this.applyToLinks(function () {
				var item2orient = this.__orientsButtonGroup.getSelection()[0].getUserData("buttonID");
				if(item2orient==1)
				{
					var camera=this.__camera;
					camera.position.setZ(-camera.position.z);
					camera.up.negate();
				}
				if(item2orient==2)
				{
					var overlays=this.__directionOverlays;
					var tempValue=overlays[0].getValue();
					overlays[0].setValue(overlays[2].getValue());
					overlays[2].setValue(tempValue);
				}
				this.render();
			});
		},

		getOverLays : function()
		{
			return this.__directionOverlays;
		},
		
		getReorientationContainer : function (inOrientsButtonGroup) {
			if (this.__reorientationContainer!=null) {
				return this.__reorientationContainer;
			}
			this.__orientsButtonGroup = inOrientsButtonGroup;
			
			var gridContainer=new qx.ui.container.Composite();
			var gridLayout=new qx.ui.layout.Grid(3,3);
			for (var i=0;i<2;i++) {
				gridLayout.setRowFlex(i,1);
				gridLayout.setColumnFlex(i,1);
			}
			gridContainer.set({layout : gridLayout,
							decorator : "main"});

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
			this.__reorientationContainer=gridContainer;
			return gridContainer;
		},

		__links : null,

		linkToViewer : function (viewer) {
			if (viewer==this) {
				return;
			}

			// first merge 2 links
			var links=this.__links;
			var links2=viewer.__links;
			var found;
			var viewer2;

			if (links==null){
				if (links2==null) {
					this.__links=[];
					viewer.__links=this.__links;
				}
				else {
					this.__links=links2;
				}
			}
			else {
				if (links2==null) {
					viewer.__links=links;
				}
				else {
					//need to merge links
					links=this.__links;
					links2=viewer.__links;
					for (var i=0;i<links2.length;i++) {
						viewer2=links2[i];
						found=false;
						for (var j=0;j<links.length;j++) {
							if (links[i]==viewer2) {
								found=true;
							}
						}
						if (!found) {
							links.push(viewer2);
						}
					}
					viewer.__links=links;
				}
			}

			links=this.__links;
			found=false;
			for (var i=0;i<links.length;i++){
				viewer2=links[i];
				if (viewer2==this) {
					found=true;
					break;
				}
			}
			if (!found) {
				links.push(this);
			}

			found=false;
			for (var i=0;i<links.length;i++){
				viewer2=links[i];
				if (viewer2==viewer) {
					found=true;
					break;
				}
			}
			if (!found) {
				links.push(viewer);
			}
			viewer.__propagateCameraToLinks();
		},

		applyToLinks : function (theFunction) {
			var links=this.__links;
			if (links==null) {
				theFunction.apply(this);
			}
			else {
				for (var i=0;i<links.length;i++) {
					theFunction.apply(links[i]);
				}
			}
		},

		__propagateCameraToLinks : function () {
			var _this=this;
			this.applyToLinks( function () {
				if (this!=_this) {
					this.__controls.copy(_this.__controls);
					this.setSlice(_this.getSlice());
					this.render();
				}
			});
		},

		unLink : function () {
			var links=this.__links;
			if (links==null) {
				return;
			}
			for (var i=0;i<links.length;i++){
				if (links[i]==this) {
					links.splice(i,1);
					break;
				}
			}
			this.__links=null;
		},


		reorderMeshes : function () {
			var slices=this.__slices;
			var length=slices.length;
			for (var i=0;i<length;i++) {
				var rank=slices[i].getUserData("rank");			
				this.__slices[i].getUserData("mesh").renderDepth=3+length-rank;
			}

			this.__drawingMesh.renderDepth=2;
			this.__crossMeshes[0].renderDepth=1;
			this.__crossMeshes[1].renderDepth=1;
			this.__brushMesh.renderDepth=0;
		},

		__createCrossMeshes : function (volumeSlice)
		{
			var coordinates=volumeSlice.get2DCornersCoordinates();

			var material = new THREE.LineBasicMaterial({
				color : 0x4169FF,
				linewidth : 2,
				opacity : 0.5,
				transparent : true
			});

			var hGeometry=new THREE.Geometry();
			hGeometry.vertices.push( new THREE.Vector3(coordinates[0],0,0) );
			hGeometry.vertices.push( new THREE.Vector3(coordinates[2],0,0) );
			var hline = new THREE.Line(hGeometry, material);
			this.__scene.add(hline);

			var vGeometry=new THREE.Geometry();
			vGeometry.vertices.push( new THREE.Vector3(0,coordinates[1],0) );
			vGeometry.vertices.push( new THREE.Vector3(0,coordinates[5],0) );
			var vline = new THREE.Line(vGeometry, material);
			this.__scene.add(vline);

			this.__crossMeshes=[];
			this.__crossMeshes.push(hline);
			this.__crossMeshes.push(vline);
		},

		__createBrushMesh : function (volumeSlice)
		{
			var geometry=new THREE.Geometry();
			geometry.dynamic=true;
			var coordinates=volumeSlice.get2DCornersCoordinates();
			var dimensions=volumeSlice.get2DDimensions();

			var ratio=[];
			ratio[0]=(coordinates[2]-coordinates[0])/dimensions[0];
			ratio[1]=(coordinates[5]-coordinates[3])/dimensions[1];

			for (var i=0;i<4;i++) {
				geometry.vertices.push(
					new THREE.Vector3( coordinates[2*i],coordinates[2*i+1], 0 ) );
			}

			geometry.faces.push( new THREE.Face4( 0, 1, 2, 3 ) );
			geometry.faceVertexUvs[ 0 ].push( [
				new THREE.UV( 0, 0),
				new THREE.UV( 1, 0 ),
				new THREE.UV( 1, 1 ),
				new THREE.UV( 0, 1 )
				] );

			var width=100;
			var height=100;

			var canvas = new qx.ui.embed.Canvas().set({
				syncDimension: true,
				canvasWidth: width,
				canvasHeight: height,
				width: width,
				height: height
			});

			var context=canvas.getContext2d()
			context.clearRect(0,0,width,height);

			var length=width*height*4;
			var dataColor = new Uint8Array( length);

			var texture = new THREE.DataTexture( dataColor, width, height, THREE.RGBAFormat );
			texture.generateMipmaps=false;
			texture.needsUpdate = true;
			texture.magFilter=THREE.NearestFilter;
			texture.minFilter=THREE.NearestFilter;
			
			var material=new THREE.MeshBasicMaterial( {map:texture, transparent: true});

			var mesh=new THREE.Mesh(geometry,material);
			mesh.doubleSided=true;
	//	maybe there's a bug to submit to three.js : the following line breaks renderDepth..
	//		mesh.visible=false;
			this.__scene.add(mesh);
			this.__brushMesh=mesh;

			var _this=this;
			function updateBrush()
			{
				if (_this.isEraseMode()) {
					context.fillStyle = "white";
					context.fillRect (0, 0, width, height);
					context.fillStyle = "black";
					context.fillRect (10, 10, width-20, height-20);
				}
				else {
					context.clearRect (0, 0, width, height);
					context.lineWidth = 0;
					context.strokeStyle = _this.__paintColor;
					context.fillStyle = _this.__paintColor;
					context.beginPath()
					context.arc(width/2, height/2, width/2, 0, 2*Math.PI, false);
					context.closePath();
					context.fill()
				}
				var data=context.getImageData(0, 0,width, height).data;
				for (var i=length;i--;) {
					dataColor[i]=data[i];
				}
				texture.needsUpdate = true;
				var radius=_this.__paintWidth/2;

				mesh.geometry.vertices[0].set(-radius*ratio[0], -radius*ratio[1], 0);
				mesh.geometry.vertices[1].set(radius*ratio[0], -radius*ratio[1], 0);
				mesh.geometry.vertices[2].set(radius*ratio[0], radius*ratio[1], 0);
				mesh.geometry.vertices[3].set(-radius*ratio[0], radius*ratio[1], 0);

				geometry.verticesNeedUpdate=true;
				geometry.computeCentroids();
				geometry.computeFaceNormals();
				geometry.computeVertexNormals();
				geometry.computeBoundingSphere();
			}
			this.__updateBrush=updateBrush;

			this.addListener("changePaintMode", function (event) {
				updateBrush();
			}, this);
			this.addListener("changeEraseMode", function (event) {
				updateBrush();
			}, this);
		},

		__setDrawingMesh : function (volumeSlice)
		{
			var geometry=new THREE.Geometry();

			var coordinates=volumeSlice.get2DCornersCoordinates();
			for (var i=0;i<4;i++) {
				geometry.vertices.push(
					new THREE.Vector3( coordinates[2*i],coordinates[2*i+1], 0 ) );
			}

			geometry.faces.push( new THREE.Face4( 0, 1, 2, 3 ) );
			geometry.faceVertexUvs[ 0 ].push( [
				new THREE.UV( 0, 0),
				new THREE.UV( 1, 0 ),
				new THREE.UV( 1, 1 ),
				new THREE.UV( 0, 1 )
				] );

			var width=this.__volume2DDimensions[0];
			var height=this.__volume2DDimensions[1];

			this.__drawingCanvas.set({
				canvasWidth: width,
				canvasHeight: height,
				width: width,
				height: height
			});
			this.__drawingCanvas.getContext2d().clearRect(0,0,width,height);

			var length=width*height*4;
			var dataColor = new Uint8Array( length);

			var texture = new THREE.DataTexture( dataColor, width, height, THREE.RGBAFormat );
			texture.generateMipmaps=false;
			texture.needsUpdate = true;
			texture.magFilter=THREE.NearestFilter;
			texture.minFilter=THREE.NearestFilter;

			
			var material=new THREE.MeshBasicMaterial( {map:texture, transparent: true});

			var mesh=new THREE.Mesh(geometry,material);
			mesh.doubleSided=true;
			this.__scene.add(mesh);
			this.__drawingMesh=mesh;

			geometry.computeCentroids();
			geometry.computeFaceNormals();
			geometry.computeVertexNormals();
			geometry.computeBoundingSphere();

			var _this=this;
			function updateTexture()
			{
				var data=_this.__drawingCanvas.getContext2d().getImageData
									(0, 0,width, height).data;
				for (var i=length;i--;) {
					dataColor[i]=data[i];
				}
				texture.needsUpdate = true;
				_this.render();
			}

			updateTexture();

			this.addListener('changeDrawing',function() {
					updateTexture();
					_this.render();
				});

			this.addListener("changePaintOpacity", function (event) {
					mesh.material.opacity=event.getData();
					_this.render();
				});
		},

		__addVolume : function (file, parameters, callback) {
			var opacity=1;

			if (parameters!=null) {
				if (parameters.opacity!=null) {
					opacity=parameters.opacity;
				}
			}

			var volumeSlice=new desk.volumeSlice(file,this.__fileBrowser, this.getOrientation(), parameters);
			this.__slices.push(volumeSlice);
			var _this=this;

			if (volumeSlice.isReady()) {
				initSlice();
				}
			else
			{
				volumeSlice.addListenerOnce("changeReady",initSlice);
			}

			function initSlice () {
				var geometry=new THREE.Geometry();

				var coordinates=volumeSlice.get2DCornersCoordinates();
				for (var i=0;i<4;i++) {
					geometry.vertices.push(
						new THREE.Vector3(
								coordinates[2*i],coordinates[2*i+1],0));
				}

				geometry.faces.push( new THREE.Face4( 0, 1, 2, 3 ) );
				geometry.faceVertexUvs[ 0 ].push( [
					new THREE.UV( 0, 0),
					new THREE.UV( 1, 0 ),
					new THREE.UV( 1, 1 ),
					new THREE.UV( 0, 1 )
					] );

				var listener=_this.addListener("changeSlice", function (e) {
					volumeSlice.setSlice(e.getData());
				});

				volumeSlice.setUserData("updateListener", listener);

				if (_this.__slices.length==1) {
					_this.__slider.setMaximum(volumeSlice.getNumberOfSlices()-1);

					_this.__camera.position.set(0.5*(coordinates[0]+coordinates[2]),
												0.5*(coordinates[3]+coordinates[5]),
												0);
					_this.__controls.target.copy(_this.__camera.position);
					_this.__camera.position.setZ(_this.__camera.position.z+
									volumeSlice.getBoundingBoxDiagonalLength()*0.6);

					_this.__projector= new THREE.Projector();;
					_this.__intersection=new THREE.Vector3();
					_this.__2DCornersCoordinates=coordinates;
					_this.__volume2DSpacing=volumeSlice.get2DSpacing();
					_this.__volume2DDimensions=volumeSlice.get2DDimensions();

					_this.__setupInteractionEvents();
				}

				var material=volumeSlice.getMaterial();
				var mesh=new THREE.Mesh(geometry,material);
				mesh.doubleSided=true;

				volumeSlice.setUserData("mesh",mesh);

				geometry.computeCentroids();
				geometry.computeFaceNormals();
				geometry.computeVertexNormals();
				geometry.computeBoundingSphere();

				volumeSlice.addListenerOnce('changeImage',function () {
					_this.__scene.add(mesh);
					}, _this);
				volumeSlice.addListener('changeImage',_this.render, _this);
				volumeSlice.addListener("changeSlice", function (e) {
					_this.setSlice(e.getData());});

				if (_this.__slices.length==1) {
					_this.__setDrawingMesh(volumeSlice);
					_this.__createBrushMesh(volumeSlice);
					_this.__createCrossMeshes(volumeSlice);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
					//~ switch (this.getOrientation())
					//~ {
						//~ case 2 :
							//~ _this.flipY();
							//~ break;
						//~ case 1 :
							//~ _this.rotateLeft();
							//~ break;
						//~ default:
					//~ }
					var dimensions=volumeSlice.getDimensions();
					_this.setCrossPosition(Math.round(dimensions[0]/2),
											Math.round(dimensions[1]/2),
											Math.round(dimensions[2]/2));
				}
				else {
					volumeSlice.setSlice(_this.getSlice());
				}

				if (typeof callback=="function")
				{
					callback(volumeSlice);
				}
			}
		},

		__resizeHTML : function () {
			var elementSize=this.__overlayCanvas.getInnerSize();
			this.__viewPortSize=elementSize;
			this.__renderer.setSize(  elementSize.width , elementSize.height );
			this.__camera.aspect=elementSize.width / elementSize.height;
			this.__camera.updateProjectionMatrix();
			this.__controls.setSize( elementSize.width , elementSize.height );
			this.render();
		},

		__setCrossPositionFromEvent : function (event) {
			var position=this.getPositionOnSlice(event);
			var v=[position.i, position.j];
			var dimensions=this.__volume2DDimensions;

			for (var i=0;i<2;i++) {
				if (v[i]<0) {
					v[i]=0;
				}
				else if (v[i]>dimensions[i]-1) {
					v[i]=dimensions[i]-1;
				}
			};
			var i,j,k;
			switch (this.getOrientation())
			{
			case 0 :
				i=v[0];
				j=v[1];
				k=this.getSlice();
				break;
			case 1 :
				i=this.getSlice();
				j=v[1];
				k=v[0];
				break;
			case 2 :
				i=v[0];
				j=this.getSlice();
				k=v[1];
			}
			this.__master.applyToViewers(function () {
				this.setCrossPosition(i,j,k);
			})
		},

		__positionI : null,
		__positionJ : null,
		__positionK : null,

		setCrossPosition : function (i,j,k) {
			var slice,x,y;

			switch (this.getOrientation())
			{
			case 0 :
				x=i;
				y=j;
				slice=k;
				break;
			case 1 :
				x=k;
				y=j;
				slice=i;
				break;
			case 2 :
				x=i;
				y=k;
				slice=j;
			}

			var spacing=this.__volume2DSpacing;
			var coordinates=this.__2DCornersCoordinates;
			x=coordinates[0]+(0.5+x)*spacing[0];
			y=coordinates[1]-(0.5+y)*spacing[1];

			this.applyToLinks (function () {
				this.__positionI=i;
				this.__positionJ=j;
				this.__positionK=k;
				this.__crossMeshes[0].position.setY(y);
				this.__crossMeshes[1].position.setX(x);
				this.setSlice(slice);
				this.render();
			});
		},

		__setupInteractionEvents : function () {

			var htmlContainer=this.__viewPort;
			var controls=this.__controls;
			this.__overlayCanvas.addListener("resize",this.__resizeHTML, this);

			//-1 : nothing
			// 0 : left click
			// 1 : zoom
			// 2 : pan
			// 3 : paint
			// 4 : erase
			var interactionMode=-1;

			htmlContainer.addListener("mousedown", function (event)	{
				htmlContainer.capture();
				interactionMode=0;

				if (event.isRightPressed()) {
					interactionMode=1;
					var origin=htmlContainer.getContentLocation();
					controls.mouseDown(interactionMode,
						event.getDocumentLeft()-origin.left,
						event.getDocumentTop()-origin.top);
				}
				else if ((event.isMiddlePressed())||(event.isShiftPressed())) {
					interactionMode=2;
					var origin=htmlContainer.getContentLocation();
					controls.mouseDown(interactionMode,
						event.getDocumentLeft()-origin.left,
						event.getDocumentTop()-origin.top);
				}
				else if (this.isPaintMode()) {
					interactionMode=3;
					this.__saveDrawingToUndoStack();
					var position=this.getPositionOnSlice(event);
					var context=this.__drawingCanvas.getContext2d();
					var i=position.i+0.5;
					var j=position.j+0.5;
					var paintColor=this.__paintColor;
					var width=this.__paintWidth;
					context.lineWidth = 0;
					context.strokeStyle = paintColor;
					context.fillStyle = paintColor;
					context.beginPath()
					context.arc(i, j, width/2, 0, 2*Math.PI, false);
					context.closePath();
					context.fill()
					context.lineJoin = "round";
					context.lineWidth = width;
					context.beginPath();
					context.moveTo(i, j);
					context.closePath();
					context.stroke();
					this.fireEvent("changeDrawing");
				}
				else if (this.isEraseMode()) {
					interactionMode=4;
					this.__saveDrawingToUndoStack();
					var position=this.getPositionOnSlice(event);
					var x=Math.round(position.i)+0.5;
					var y=Math.round(position.j)+0.5;
					var width=this.__paintWidth;
					var radius=width/2;
					this.__drawingCanvas.getContext2d().clearRect(x-radius, y-radius, width, width);
					this.__drawingCanvasModified=true;
					this.fireEvent("changeDrawing");
				}
				else {
					this.__setCrossPositionFromEvent(event);
				}
				this.fireDataEvent("viewMouseDown",event);
			}, this);

			this.addListener("mouseout", function (event) {
				if (qx.ui.core.Widget.contains(this, event.getRelatedTarget()))
				{
					return;
				}
				this.__rightContainer.setVisibility("hidden");
				if (this.isPaintMode()||this.isEraseMode()) {
					this.__brushMesh.visible=false;
					this.render();
				}
				this.fireDataEvent("viewMouseOut",event);
			}, this);


			htmlContainer.addListener("mousemove", function (event)	{
				this.__rightContainer.setVisibility("visible");

				var brushMesh=this.__brushMesh;
				var position;
				switch (interactionMode)
				{
				case -1:
					if (this.isPaintMode()||this.isEraseMode()) {
						position=this.getPositionOnSlice(event);
						brushMesh.visible=true;
						brushMesh.position.set(position.x, position.y, 0);
						this.render();
					}
					break;
				case 0 :
					this.__setCrossPositionFromEvent(event);
					break;
				case 1 :
					brushMesh.visible=false;
					var origin=htmlContainer.getContentLocation();
					controls.mouseMove(event.getDocumentLeft()-origin.left
							, event.getDocumentTop()-origin.top);

					var z=this.__camera.position.z;
					this.render();
					var myViewer=this;
					this.__master.applyToViewers (function () {
						if (this!=myViewer) {
							this.__camera.position.z*=Math.abs(z/this.__camera.position.z);
							this.__propagateCameraToLinks();
							this.render();
							}
						});
					this.__propagateCameraToLinks();
					break;
				case 2 :
					brushMesh.visible=false;
					var origin=htmlContainer.getContentLocation();
					controls.mouseMove(event.getDocumentLeft()-origin.left
							, event.getDocumentTop()-origin.top);
					this.render();
					this.__propagateCameraToLinks();
					break;
				case 3 :
					position=this.getPositionOnSlice(event);
					brushMesh.visible=true;
					brushMesh.position.set(position.x, position.y, 0);
					var context=this.__drawingCanvas.getContext2d();
					context.lineTo(position.i+0.5, position.j+0.5);
					context.stroke();
					this.fireEvent("changeDrawing");
					this.__drawingCanvasModified=true;
					break;
				case 4 :
					position=this.getPositionOnSlice(event);
					brushMesh.visible=true;
					brushMesh.position.set(position.x, position.y, 0);
					var x=Math.round(position.i)+0.5;
					var y=Math.round(position.j)+0.5;
					var width=this.__paintWidth;
					var radius=width/2;
					this.__drawingCanvas.getContext2d().clearRect(x-radius, y-radius, width, width);
					this.__drawingCanvasModified=true;
					this.fireEvent("changeDrawing");
					break;
				}
				this.fireDataEvent("viewMouseMove",event);
			}, this);

			htmlContainer.addListener("mouseup", function (event)	{
				htmlContainer.releaseCapture();
				controls.mouseUp();
				if ((this.isPaintMode())&&(interactionMode==3)) {
					var context=this.__drawingCanvas.getContext2d();
					var position=this.getPositionOnSlice(event);

					var i=position.i+0.5;
					var j=position.j+0.5;

					var paintColor=this.__paintColor;
					var width=this.__paintWidth;
					context.lineWidth = 0;
					context.strokeStyle = paintColor;
					context.fillStyle = paintColor;
					context.beginPath()
					context.arc(i, j, width/2, 0, 2*Math.PI, false);
					context.closePath();
					context.fill();
					this.fireEvent("changeDrawing");
				}
				interactionMode=-1;
				this.fireDataEvent("viewMouseUp",event);
			}, this);

			htmlContainer.addListener("mousewheel", function (event) {
							var slider=this.__slider;
							var delta=Math.round(event.getWheelDelta()/2);
							var newValue=slider.getValue()+delta;
							if (newValue>slider.getMaximum()) {
								newValue=slider.getMaximum()
							}
							if (newValue<slider.getMinimum()) {
								newValue=slider.getMinimum()
							}
							slider.setValue(newValue);
							this.fireDataEvent("viewMouseWheel",event);
					}, this);
		},

		__getRenderWindow : function() {
			var htmlContainer = new qx.ui.embed.Html();
			this.__viewPort=htmlContainer;
			htmlContainer.setHtml("<div id=\"three.js"+this.toHashCode()+"\"></div>");

			htmlContainer.addListenerOnce("appear",function(e){
				// scene and camera
				var elementSize=htmlContainer.getInnerSize();
				this.__scene = new THREE.Scene();
				var camera = new THREE.PerspectiveCamera( 60, elementSize.width / elementSize.height, 1, 1e5 );
				var container = document.getElementById( "three.js"+this.toHashCode());
				var controls = new THREE.TrackballControls2( camera,container );

				camera.position.set(0,0,100);
				controls.target.set(0,0,0);
				//controls.panSpeed=1.18;
				this.__controls=controls;
				this.__camera=camera;
				this.__scene.add( camera );

				// renderer

				var renderer = new THREE.WebGLRenderer( { antialias: false } );

				this.__renderer=renderer;
				renderer.setClearColorHex( 0xffffff, 1 );
				renderer.setClearColorHex( 0x000000, 1 );
				this.__resizeHTML();

				container.appendChild( renderer.domElement );
				this.setReady(true);
			}, this);
			return (htmlContainer);
		},

		__intersection : null,
		__2DCornersCoordinates : null,
		__volume2DDimensions : null,
		__volume2DSpacing : null,
		__projector : null,
		__viewPortSize : null,

		getPositionOnSlice : function (event) {
			var viewPort=this.__viewPort;
			var origin=viewPort.getContentLocation();
			var x=event.getDocumentLeft()-origin.left;
			var y=event.getDocumentTop()-origin.top;

			var elementSize=this.__viewPortSize;
			var x2 = ( x / elementSize.width ) * 2 - 1;
			var y2 = - ( y / elementSize.height ) * 2 + 1;

			var projector = this.__projector;
			var intersection = this.__intersection.set( x2, y2, 0);
			var coordinates=this.__2DCornersCoordinates;
			var dimensions=this.__volume2DDimensions;

			var camera=this.__camera;
			projector.unprojectVector( intersection, camera );

			var cameraPosition=camera.position;
			intersection.subSelf( cameraPosition );
			intersection.multiplyScalar(-cameraPosition.z/intersection.z);
			intersection.addSelf( cameraPosition );
			var xinter=intersection.x;
			var yinter=intersection.y;

			var intxc=Math.floor((xinter-coordinates[0])*dimensions[0]/(coordinates[2]-coordinates[0]));
			var intyc=Math.floor((yinter-coordinates[1])*dimensions[1]/(coordinates[5]-coordinates[1]));
			return {i :intxc, j :intyc, x:xinter, y:yinter};
		},

		__createUI : function (file) {
			var overlayCanvas=new qx.ui.container.Composite(new qx.ui.layout.Canvas());
			this.__overlayCanvas=overlayCanvas;
			var viewPort=this.__getRenderWindow();

			overlayCanvas.add(viewPort, {width : "100%", height : "100%"});
			this.add(overlayCanvas, {flex : 1});

			var directionOverlays=[];
			this.__directionOverlays=directionOverlays;

			var font= new qx.bom.Font(16, ["Arial"]);
			font.setBold(true);
			var northLabel=new qx.ui.basic.Label("S");
			northLabel.set({textColor : "yellow",
					        font : font,
					        opacity : 0.5
					        });
			overlayCanvas.add(northLabel, {left:"50%", top:"1%"});

			var southLabel=new qx.ui.basic.Label("I");
			southLabel.set({textColor : "yellow",
					        font : font,
					        opacity : 0.5
					        });
			overlayCanvas.add(southLabel, {left:"50%", bottom:"1%"});
			var eastLabel=new qx.ui.basic.Label("L");
			eastLabel.set({textColor : "yellow",
					        font : font,
					        opacity : 0.5
					        });
			overlayCanvas.add(eastLabel, {left:"1%", top:"45%"});
			var westLabel=new qx.ui.basic.Label("R");
			westLabel.set({textColor : "yellow",
					        font : font,
					        opacity : 0.5
					        });
			overlayCanvas.add(westLabel, {right:32, top:"45%"});
			directionOverlays.push(northLabel);
			directionOverlays.push(eastLabel);
			directionOverlays.push(southLabel);
			directionOverlays.push(westLabel);
			switch (this.getOrientation())
			{
			default:
			case 0 :
				northLabel.setValue("A");
				southLabel.setValue("P");
				eastLabel.setValue("R");
				westLabel.setValue("L");
				break;
			case 1 :
				northLabel.setValue("A");
				southLabel.setValue("P");
				eastLabel.setValue("I");
				westLabel.setValue("S");
				break;
			case 2 :
				northLabel.setValue("I");
				southLabel.setValue("S");
				eastLabel.setValue("R");
				westLabel.setValue("L");
				break;
			}


			var rightContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox());
			this.__rightContainer=rightContainer;

			var label = new qx.ui.basic.Label("0");
			label.set({textAlign: "center", width : 40, font : font, textColor : "yellow"});
			rightContainer.add(label);
			overlayCanvas.add(label, {top :0, left :0});
			var slider=new qx.ui.form.Slider();
			this.__slider=slider;

			slider.set ({minimum : 0, maximum : 100, value : 0, width :30, opacity : 0.5, backgroundColor : "transparent"
					, orientation : "vertical", zIndex : 1000});
			slider.addListener("changeValue",function(e){
				this.setSlice(this.getVolumeSliceToPaint().getNumberOfSlices()-1-e.getData())
				}, this);

			this.addListener("changeSlice", function (e) {
				var sliceId=e.getData();
				label.setValue(sliceId+"");
				slider.setValue(this.getVolumeSliceToPaint().getNumberOfSlices()-1-sliceId);

				var i=this.__positionI;
				var j=this.__positionJ;
				var k=this.__positionK;
				switch (this.getOrientation())
				{
				case 0 :
					this.__positionK=sliceId
					k=sliceId;
					break;
				case 1 :
					this.__positionI=sliceId
					i=sliceId;
					break;
				case 2 :
					this.__positionJ=sliceId
					j=sliceId;
				}
				var _this=this;
				this.__master.applyToViewers (function () {
					if ((this!=_this)&&(this.__slices[0].isReady())) {
						this.setCrossPosition(i,j,k);
					}
				})
				this.__propagateCameraToLinks();
			}, this);

			rightContainer.add(slider, {flex : 1});
			rightContainer.setVisibility("hidden");
			overlayCanvas.add(rightContainer, {right : 0, top : 0, height : "100%"});
		},

		__undoData : null,

		__initUndo : function () {
			this.__undoData=[];
			this.addListener("keypress", function (event) {
				if (event.getKeyIdentifier()=="Backspace") {
					var undoData=this.__undoData;
					if (undoData.length>0) {
						var canvas=this.__drawingCanvas;
						var context=canvas.getContext2d();
						context.clearRect(0,0,canvas.getCanvasWidth(),canvas.getCanvasHeight());
						context.putImageData(undoData.pop(), 0, 0);
						this.fireEvent("changeDrawing");
					}
				}
			}, this);
			this.addListener("changeSlice", function (event) {
				this.__undoData=[];
			}, this);
		},

		__saveDrawingToUndoStack : function () {
			var canvas=this.__drawingCanvas;
			var image=canvas.getContext2d().getImageData(0,0,canvas.getWidth(), canvas.getHeight());
			var undoData=this.__undoData;
			if (undoData.length==10) {
				undoData.shift();
			}
			undoData.push(image);
		}
	}
});

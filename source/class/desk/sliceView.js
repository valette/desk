/*
#asset(three.js/*)
#ignore(THREE.*)
#ignore(THREE)
#ignore(requestAnimationFrame)
#ignore(Detector)
#ignore(Uint8Array)
#ignore(HACKSetDirtyVertices)
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

		if (typeof orientation=="number")
			this.setOrientation(orientation);
		else
			this.setOrientation(0);

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
		ready : { init : false, check: "Boolean", event : "changeReady"},
		paintMode : { init : false, check: "Boolean", event : "changePaintMode"},
		eraseMode : { init : false, check: "Boolean", event : "changeEraseMode"}
	},

	events : {
		"changeDrawing" : "qx.event.type.Event"
	},

	members : {

		__fileBrowser : null,
		__slices : null,

		__slider : null,

		__rightContainer : null,

		__viewPort : null,

		__paintWidth : 5,
		__currentColor : null,
		__currentWidth : null,

		//THREE.js objects
		__scene : null,
		__camera : null,
		__renderer : null,
		__controls : null,

		__master : null,

		__drawingCanvas : null,
		__drawingMesh : null,

		__brushMesh : null,

		__drawingCanvasModified : false,

		__updateBrush : null,

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

		__renderfunction : null,
		__renderingTriggered : false,

		render : function ( ) {
			var _this=this;

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
						break;
					}
				}
			}
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
			viewer.__propagateLinks();
		},

		__propagateLinks : function () {
			var links=this.__links;
			if (links==null) {
				return;
			}
			for (var i=0;i<links.length;i++) {
				var viewer=links[i];
				if (viewer!=this) {
					viewer.__controls.copy(this.__controls);
					viewer.setSlice(this.getSlice());
					viewer.render();
				}
			}
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
			var z_space=0.01;
			var mesh;
			var slices=this.__slices;
			var i,j;

			var length=slices.length;
			for (i=0;i<length;i++) {
				var rank=slices[i].getUserData("rank");			
				this.__slices[i].getUserData("mesh").renderDepth=2+length-rank;
/*				var sliceGeometry=this.__slices[i].getUserData("mesh").geometry;
				for (var j=0;j<sliceGeometry.length;j++) {
					sliceGeometry[j].setZ(rank*z_space);
				}
				sliceGeometry.computeCentroids();
				sliceGeometry.computeFaceNormals();
				sliceGeometry.computeVertexNormals();
				sliceGeometry.computeBoundingSphere();
				sliceGeometry.computeBoundingBox();
				HACKSetDirtyVertices(sliceGeometry);*/
			}
			this.__brushMesh.renderDepth=0;
			this.__drawingMesh.renderDepth=1;
/*
			var paintMeshGeometry=this.__drawingMesh.geometry;
			for (j=0;j<paintMeshGeometry.length;j++) {
					paintMeshGeometry[j].setZ((slices.length+3)*z_space);
				}
			paintMeshGeometry.computeCentroids();
			paintMeshGeometry.computeFaceNormals();
			paintMeshGeometry.computeVertexNormals();
			paintMeshGeometry.computeBoundingSphere();
			paintMeshGeometry.computeBoundingBox();
			HACKSetDirtyVertices(paintMeshGeometry);*/
		},

		__setBrushMesh : function (volumeSlice)
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
					new THREE.Vertex(
						new THREE.Vector3( coordinates[2*i],coordinates[2*i+1], 0 ) ) );
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
			texture.needsUpdate = true;
			texture.magFilter=THREE.NearestFilter;
			
			var material=new THREE.MeshBasicMaterial( {map:texture, transparent: true});

			var mesh=new THREE.Mesh(geometry,material);
			mesh.doubleSided=true;
			mesh.visible=false;
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

				mesh.geometry.vertices[0].position.set(-radius*ratio[0], -radius*ratio[1], 0);
				mesh.geometry.vertices[1].position.set(radius*ratio[0], -radius*ratio[1], 0);
				mesh.geometry.vertices[2].position.set(radius*ratio[0], radius*ratio[1], 0);
				mesh.geometry.vertices[3].position.set(-radius*ratio[0], radius*ratio[1], 0);

				HACKSetDirtyVertices(geometry);
				geometry.computeCentroids();
				geometry.computeFaceNormals();
				geometry.computeVertexNormals();
				geometry.computeBoundingSphere();
			}
			this.__updateBrush=updateBrush;
			this.addListener("mouseout", function (event) {
				mesh.visible=false;
				this.render();
			}, this);

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
			geometry.dynamic=true;

			var coordinates=volumeSlice.get2DCornersCoordinates();
			for (var i=0;i<4;i++) {
				geometry.vertices.push(
					new THREE.Vertex(
						new THREE.Vector3( coordinates[2*i],coordinates[2*i+1], 0 ) ) );
			}

			geometry.faces.push( new THREE.Face4( 0, 1, 2, 3 ) );
			geometry.faceVertexUvs[ 0 ].push( [
				new THREE.UV( 0, 0),
				new THREE.UV( 1, 0 ),
				new THREE.UV( 1, 1 ),
				new THREE.UV( 0, 1 )
				] );

			var canvas=volumeSlice.getImageCanvas();
			var width=canvas.getCanvasWidth();
			var height=canvas.getCanvasHeight();

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
			texture.needsUpdate = true;
			texture.magFilter=THREE.NearestFilter;
			
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
				geometry.dynamic=true;

				var coordinates=volumeSlice.get2DCornersCoordinates();
				for (var i=0;i<4;i++) {
					geometry.vertices.push(
						new THREE.Vertex(
							new THREE.Vector3(
								coordinates[2*i],coordinates[2*i+1],0)));
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
					_this.setSlice(Math.round(0.5*volumeSlice.getNumberOfSlices()));

					_this.__camera.position.set(0.5*(coordinates[0]+coordinates[2]),
												0.5*(coordinates[3]+coordinates[5]),
												0);
					_this.__controls.target.copy(_this.__camera.position);
					_this.__camera.position.setZ(_this.__camera.position.z+
									volumeSlice.getBoundingBoxDiagonalLength()*0.6);

					_this.__setupInteractionEvents();
				}
				else {
					volumeSlice.setSlice(_this.getSlice());
				}

				var canvas=volumeSlice.getImageCanvas();
		    	
				var width=canvas.getCanvasWidth();
				var height=canvas.getCanvasHeight();

				var length=width*height*4;
				var dataColor = new Uint8Array( length);
				var texture = new THREE.DataTexture(
						dataColor, width, height, THREE.RGBAFormat );
				texture.needsUpdate = true;
				texture.magFilter=THREE.NearestFilter;
				var material=new THREE.MeshBasicMaterial( 
						{map:texture, transparent: true, opacity : opacity});//, combine :THREE.MixOperation});
				var mesh=new THREE.Mesh(geometry,material);
				mesh.doubleSided=true;
				_this.__scene.add(mesh);
				volumeSlice.setUserData("mesh",mesh);

				geometry.computeCentroids();
				geometry.computeFaceNormals();
				geometry.computeVertexNormals();
				geometry.computeBoundingSphere();

				function updateTexture()
				{
					var data=canvas.getContext2d().getImageData(0, 0,width, height).data;

					for (var i=length;i--;)
						dataColor[i]=data[i];
					texture.needsUpdate = true;
					_this.render();
				}

				var listenerId=volumeSlice.addListener('changeImage',function() {
						updateTexture();
						_this.render();
					});
				updateTexture();
				_this.__window.addListener("close", function() {
					volumeSlice.removeListenerById(listenerId);
					});

				if (_this.__slices.length==1) {
					_this.__setDrawingMesh(volumeSlice);
					_this.__setBrushMesh(volumeSlice)
				}
				_this.render();

				if (typeof callback=="function")
				{
					callback(volumeSlice);
				}
			}
		},

		__resizeHTML : function () {
			var elementSize=this.__viewPort.getInnerSize();
			this.__renderer.setSize(  elementSize.width , elementSize.height );
			this.__camera.aspect=elementSize.width / elementSize.height;
			this.__camera.updateProjectionMatrix();
			this.__controls.setSize( elementSize.width , elementSize.height );
			this.render();
		},

		__setupInteractionEvents : function () {

			var htmlContainer=this.__viewPort;
			var controls=this.__controls;
			htmlContainer.addListener("resize",this.__resizeHTML, this);

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
			}, this);

			htmlContainer.addListener("mousemove", function (event)	{
				var brushMesh=this.__brushMesh;
				var position=this.getPositionOnSlice(event);
				switch (interactionMode)
				{
				case -1:
					if ((this.isPaintMode()||this.isEraseMode())) {
						brushMesh.visible=true;
						brushMesh.position.set(position.x, position.y, 0);
						this.render();
					}
					break;
				case 0 :
					break;
				case 1 :
					brushMesh.visible=false;
					var origin=htmlContainer.getContentLocation();
					controls.mouseMove(event.getDocumentLeft()-origin.left
							, event.getDocumentTop()-origin.top);

					var z=this.__camera.position.z;
					this.render();
					this.__master.applyToViewers (function (viewer) {
						if (viewer!=this) {
							viewer.__camera.position.z=z;
							viewer.__propagateLinks();
							viewer.render();
							}
						});
					this.__propagateLinks();
					break;
				case 2 :
					brushMesh.visible=false;
					var origin=htmlContainer.getContentLocation();
					controls.mouseMove(event.getDocumentLeft()-origin.left
							, event.getDocumentTop()-origin.top);
					this.render();
					this.__propagateLinks();
					break;
				case 3 :
					brushMesh.visible=true;
					brushMesh.position.set(position.x, position.y, 0);
					var context=this.__drawingCanvas.getContext2d();
					context.lineTo(position.i+0.5, position.j+0.5);
					context.stroke();
					this.fireEvent("changeDrawing");
					this.__drawingCanvasModified=true;
					break;
				case 4 :
					brushMesh.visible=true;
					brushMesh.position.set(position.x, position.y, 0);
					var x=Math.round(position.i)+0.5;
					var y=Math.round(position.j)+0.5;
					var width=this.__paintWidth;
					var radius=width/2;
					this.__drawingCanvas.getContext2d().clearRect(x-radius, y-radius, width, width);
					this.__drawingCanvasModified=true;
					this.fireEvent("changeDrawing");
				}
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
			}, this);

			htmlContainer.addListener("mousewheel", function (event) {
							var slider=this.__slider;
							var delta=Math.round(event.getWheelDelta()/2);
							var newValue=slider.getValue()+delta;
							if (newValue>slider.getMaximum())
								newValue=slider.getMaximum()
							if (newValue<slider.getMinimum())
								newValue=slider.getMinimum()
							slider.setValue(newValue);
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

				var renderer = new THREE.WebGLRenderer( { antialias: true } );

				this.__renderer=renderer;
				renderer.setClearColorHex( 0xffffff, 1 );
				this.__resizeHTML();

				container.appendChild( renderer.domElement );
				this.setReady(true);
			}, this);
			return (htmlContainer);
		},

		__intersection : null,
		__cornersCoordinates : null,
		__volumeDimensions : null,
		__projector : null,

		getPositionOnSlice : function (event) {
			var viewPort=this.__viewPort;
			var origin=viewPort.getContentLocation();
			var x=event.getDocumentLeft()-origin.left;
			var y=event.getDocumentTop()-origin.top;

			var elementSize=viewPort.getInnerSize();
			var x2 = ( x / elementSize.width ) * 2 - 1;
			var y2 = - ( y / elementSize.height ) * 2 + 1;

			if (this.__projector==null){
				var volumeSlice=this.getVolumeSliceToPaint();
				var coordinates=volumeSlice.get2DCornersCoordinates();
	/*			if (coordinates==null) {
					return {i :0, j :0, x:0, y:0};
				}*/
				var projector = new THREE.Projector();
				this.__projector=projector;
				var intersection = new THREE.Vector3( x2, y2, 0);
				this.__intersection=intersection;
				this.__cornersCoordinates=coordinates;
				var dimensions=volumeSlice.get2DDimensions();
				this.__volumeDimensions=dimensions;
			}
			else {
				var projector = this.__projector;
				var intersection = this.__intersection.set( x2, y2, 0);
				var coordinates=this.__cornersCoordinates;
				var dimensions=this.__volumeDimensions;
			}

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
			this.add(this.__getRenderWindow(), {flex : 1});
			var rightContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox());
			this.__rightContainer=rightContainer;

			var label = new qx.ui.basic.Label("0");
			label.set({textAlign: "center", width : 30, decorator : "main"});
			rightContainer.add(label);
			var slider=new qx.ui.form.Slider();
			this.__slider=slider;
			slider.set ({minimum : 0, maximum : 100, value : 0, width :30});
			slider.setOrientation("vertical");
			slider.addListener("changeValue",function(e){
				this.setSlice(this.getVolumeSliceToPaint().getNumberOfSlices()-1-e.getData())
				}, this);

			this.addListener("changeSlice", function (e) {
				var sliceId=e.getData();
				label.setValue(sliceId+"");
				slider.setValue(this.getVolumeSliceToPaint().getNumberOfSlices()-1-sliceId)
				this.__propagateLinks();
			}, this);

			rightContainer.add(slider, {flex : 1});
			this.add(rightContainer);
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

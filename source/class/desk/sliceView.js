/*
#asset(three.js/*)
#ignore(THREE.*)
#ignore(THREE)
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

/*		// drag and drop support
		this.setDraggable(true);
		this.addListener("dragstart", function(e) {
			e.addAction("copy");
			e.addType("volumeSlice");
			});

		this.addListener("droprequest", function(e) {
				var type = e.getCurrentType();
				switch (type)
				{
				case "volumeSlice":
					e.addData(type, this);
					break;
				default :
					alert ("type "+type+"not supported for drag and drop");
				}
			}, this);
*/

		return (this);		
	},

	properties : {
		slice : { init : 0, check: "Number", event : "changeSlice"},
		paintOpacity : { init : 1, check: "Number", event : "changePaintOpacity"},
		orientation : { init : -1, check: "Number", event : "changeOrientation"},
		ready : { init : false, check: "Boolean", event : "changeReady"},
		paintMode : { init : false, check: "Boolean"}
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

		__drawingCanvasModified : false,

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
		},

		setPaintWidth : function (width) {
			this.__paintWidth=width;
		},

		render : function ( ) {
			this.__controls.update();
			this.__renderer.render( this.__scene, this.__camera );			
		},

		addVolume : function (file, parameters, callback)
		{
			if (this.isReady()) {
				this.__addVolume(file, callback);
			}
			else {
				this.addListenerOnce("changeReady", function () {
					this.__addVolume(file, callback);},this);
			}
		},

		reorderMeshes : function ()
		{
			if (this.isReady()) {
				this.__reorderMeshes();
			}
			else {
				this.addListenerOnce("changeReady", function () {
					this.__reorderMeshes();},this);
			}
		},


		__reorderMeshes : function () {
			var z_space=0.01;
			var mesh;
			var slices=this.__slices;
	
			for (var i=0;i<slices.length;i++) {
				var sliceGeometry=this.__slices[i].getUserData("mesh").geometry;
				var rank=slices[i].getUserData("rank");
				for (var j=0;j<sliceGeometry.length;j++) {
					sliceGeometry[j].setZ(rank*z_space);
				}
				HACKSetDirtyVertices(sliceGeometry);
			}

			var paintMeshGeometry=this.__drawingMesh.geometry;
			for (var j=0;j<paintMeshGeometry.length;j++) {
					paintMeshGeometry[j].setZ(this.__slices.length*z_space);
				}
			HACKSetDirtyVertices(paintMeshGeometry);

			for (var i=0;i<slices.length;i++) {
				mesh=slices[i].getUserData("mesh");
				this.__scene.remove(mesh);
			}

			this.__scene.remove(this.__drawingMesh);

			for (var rank=0;rank<slices.length;rank++) {
				var index=-1;
				for (var i=0;i<slices.length;i++) {
					if (slices[i].getUserData("rank")==rank) {
						mesh=slices[i].getUserData("mesh");
						this.__scene.add(mesh);
					}
				}
			}
			this.__scene.add(this.__drawingMesh);
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

		__addVolume : function (file, callback) {
			var volumeSlice=new desk.volumeSlice(file,this.__fileBrowser, this.getOrientation());
			this.__slices.push(volumeSlice);
			var _this=this;

			if (volumeSlice.isReady()) {
				initSlice();
				}
			else
			{
				volumeSlice.addListener("changeReady",initSlice);
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
	//		console.log(_this.getOrientation());
	//		console.log(coordinates);
				geometry.faces.push( new THREE.Face4( 0, 1, 2, 3 ) );
				geometry.faceVertexUvs[ 0 ].push( [
					new THREE.UV( 0, 0),
					new THREE.UV( 1, 0 ),
					new THREE.UV( 1, 1 ),
					new THREE.UV( 0, 1 )
					] );

				

				_this.addListener("changeSlice", function (e) {
					volumeSlice.setSlice(e.getData());
				});

				if (_this.__slices.length==1) {
					_this.__slider.setMaximum(volumeSlice.getNumberOfSlices()-1);	
					_this.setSlice(Math.round(0.5*volumeSlice.getNumberOfSlices()));

					_this.__camera.position.set(0.5*(coordinates[0]+coordinates[2]),
												0.5*(coordinates[3]+coordinates[5]),
												0);
					_this.__controls.target.copy(_this.__camera.position);
					_this.__camera.position.setZ(_this.__camera.position.z+
									volumeSlice.getBoundingBoxDiagonalLength()*0.6);
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
				var material=new THREE.MeshBasicMaterial( {map:texture, transparent: true});

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
			/*	_this.__window.addListener("close", function() {
					volumeSlice.removeListenerById(listenerId);
					});*/

				_this.__setDrawingMesh(volumeSlice);
				_this.render();

				if (typeof callback=="function")
				{
					callback(volumeSlice);
				}
			}
		},

		__getRenderWindow : function() {
			var htmlContainer = new qx.ui.embed.Html();
			this.__viewPort=htmlContainer;

			var randomId=Math.random();
			htmlContainer.setHtml("<div id=\"three.js"+randomId+"\"></div>");

			var _this=this;

			htmlContainer.addListener("appear",function(e){
				// scene and camera
				var elementSize=htmlContainer.getInnerSize();
				var scene = new THREE.Scene();
				var camera = new THREE.PerspectiveCamera( 60, elementSize.width / elementSize.height, 1, 1e5 );
				var container = document.getElementById( "three.js"+randomId);
				var controls = new THREE.TrackballControls2( camera,container );

				camera.position.set(0,0,100);
				controls.target.set(0,0,0);
				this.__controls=controls;
				this.__scene=scene;
				this.__camera=camera;
				scene.add( camera );

				// renderer

				var renderer = new THREE.WebGLRenderer( { antialias: true } );

				this.__renderer=renderer;
				renderer.setClearColorHex( 0xffffff, 1 );
				resizeHTML();

				container.appendChild( renderer.domElement );
				controls.onUpdate=render;


				function render() {
					_this.fireEvent("changeViewPoint");
					controls.update();
					renderer.render( scene, camera );
				}

				htmlContainer.addListener("resize",resizeHTML);
				function resizeHTML(){
					var elementSize=htmlContainer.getInnerSize();
					renderer.setSize(  elementSize.width , elementSize.height );
					camera.aspect=elementSize.width / elementSize.height;
					camera.updateProjectionMatrix();
					controls.setSize( elementSize.width , elementSize.height );
					render();
					}

				var mouseMode=0;
				var button=0;
				htmlContainer.addListener("mousedown", function (event)	{
					htmlContainer.capture();

					button=0;
					if (event.isRightPressed())
						button=1;
					else if ((event.isMiddlePressed())||(event.isShiftPressed()))
						button=2;

					if (button!=0)
					{
						mouseMode=2;
						var origin=htmlContainer.getContentLocation();
						controls.mouseDown(button,
							event.getDocumentLeft()-origin.left,
							event.getDocumentTop()-origin.top);
					}
					else
					{
						if (_this.isPaintMode())
						{
							mouseMode=1;
							var position=_this.getPositionOnSlice(event);
							var context=_this.__drawingCanvas.getContext2d();
							context.strokeStyle = _this.__paintColor;
							context.lineJoin = "round";
							context.lineWidth = _this.__paintWidth;
							context.beginPath();
							context.moveTo(position.x, position.y);
							context.closePath();
							context.stroke();
							_this.fireEvent("changeDrawing");
						}
					}
					});

				htmlContainer.addListener("mousemove", function (event)	{
					switch (mouseMode)
					{
					case 2:
						var origin=htmlContainer.getContentLocation();
						controls.mouseMove(event.getDocumentLeft()-origin.left
								, event.getDocumentTop()-origin.top);

						//propagate zoom to other viewers
						if (button==1) {
							var z=_this.__camera.position.z;
							_this.__master.applyToViewers (function (viewer) {
								if (viewer!=_this) {
									viewer.__camera.position.z=z;
									viewer.render();
									}
								});
						}

						break;
					case 1:
						var context=_this.__drawingCanvas.getContext2d();
						var position=_this.getPositionOnSlice(event);
					     context.lineTo(position.x, position.y);
						context.stroke();
						_this.fireEvent("changeDrawing");
						_this.__drawingCanvasModified=true;
						break;
					default:
						break;
					}
					});

				htmlContainer.addListener("mouseup", function (event)	{
					htmlContainer.releaseCapture();
					mouseMode=0;
					controls.mouseUp();});

				htmlContainer.addListener("mousewheel", function (event) {
								var slider=_this.__slider;
								var delta=Math.round(event.getWheelDelta()/2);
								var newValue=slider.getValue()+delta;
								if (newValue>slider.getMaximum())
									newValue=slider.getMaximum()
								if (newValue<slider.getMinimum())
									newValue=slider.getMinimum()
								slider.setValue(newValue);
						});


				this.setReady(true);
			}, this);
			return (htmlContainer);
		},

		getPositionOnSlice : function (event) {
			var viewPort=this.__viewPort;
			var origin=viewPort.getContentLocation();
			var x=event.getDocumentLeft()-origin.left;
			var y=event.getDocumentTop()-origin.top;

			var elementSize=viewPort.getInnerSize();
			var x2 = ( x / elementSize.width ) * 2 - 1;
			var y2 = - ( y / elementSize.height ) * 2 + 1;

			var projector = new THREE.Projector();
			var vector = new THREE.Vector3( x2, y2, 0.5 );
			var camera=this.__camera;
			projector.unprojectVector( vector, camera );

			var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );
			var meshes=[];
			var volumeSlice=this.getVolumeSliceToPaint();
			meshes.push(volumeSlice.getUserData("mesh"));
			var intersects = ray.intersectObjects( meshes );

			if ( intersects.length > 0 ) {
				var xinter=intersects[0].point.x;
				var yinter=intersects[0].point.y;
				var coordinates=volumeSlice.get2DCornersCoordinates();
				var dimensions=volumeSlice.get2DDimensions();
				var intxc=Math.floor((xinter-coordinates[0])*dimensions[0]/(coordinates[2]-coordinates[0]));
				var intyc=Math.floor((yinter-coordinates[1])*dimensions[1]/(coordinates[5]-coordinates[1]));
				return {x :intxc, y :intyc};
			}
			else
			{
				return false;
			}
		},

		__createUI : function (file) {
			this.add(this.__getRenderWindow(), {flex : 1});
			var rightContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox());
			this.__rightContainer=rightContainer;

			var label = new qx.ui.basic.Label("0");
			label.setTextAlign("center");
			label.setWidth(30);
			rightContainer.add(label);
			var slider=new qx.ui.form.Slider();
			this.__slider=slider;
			slider.setMinimum(0);
			slider.setMaximum(100);
			slider.setValue(0);
			slider.setWidth(30);
			slider.setOrientation("vertical");
			slider.addListener("changeValue",function(e){
				this.setSlice(this.getVolumeSliceToPaint().getNumberOfSlices()-1-e.getData())
				}, this);

			this.addListener("changeSlice", function (e) {
				var sliceId=e.getData();
				label.setValue(sliceId+"");
				slider.setValue(this.getVolumeSliceToPaint().getNumberOfSlices()-1-sliceId)
			}, this);

			rightContainer.add(slider, {flex : 1});
			this.add(rightContainer);
		}
	}
});

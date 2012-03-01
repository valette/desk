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

		return (this);		
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

		render : function ( ) {
			this.__controls.update();
			this.__renderer.render( this.__scene, this.__camera );			
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

			var center=[];
			center[0]=0;
			center[1]=0;
			for (var i=0;i<4;i++) {
				for (var j=0;j<2;j++) {
					center[j]+=coordinates[2*i+j];
				}
			}

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
			this.__scene.add(mesh);
			this.__brushMesh=mesh;

			var _this=this;
			function updateBrush()
			{
				if (_this.isEraseMode()) {
					context.fillStyle = "black";
					context.fillRect (0, 0, width, height);
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
			//	console.log(ratio);
			//	console.log(radius);
				mesh.geometry.vertices[0].position.set(-radius*ratio[0], -radius*ratio[1], 0);
				mesh.geometry.vertices[1].position.set(radius*ratio[0], -radius*ratio[1], 0);
				mesh.geometry.vertices[2].position.set(radius*ratio[0], radius*ratio[1], 0);
				mesh.geometry.vertices[3].position.set(-radius*ratio[0], radius*ratio[1], 0);
/*				for (var i=0;i<4;i++)
				{
					console.log(geometry.vertices[i].position);
				}*/
				HACKSetDirtyVertices(geometry);
				geometry.computeCentroids();
				geometry.computeFaceNormals();
				geometry.computeVertexNormals();
				geometry.computeBoundingSphere();
			//	mesh.position.set(center[0], center[1], 10);
			}
			this.__updateBrush=updateBrush;
			
			this.addListener("mousemove", function (event) {
				var position=this.getPositionOnSlice(event);
				if ((position!=false)&&(this.isPaintMode()||this.isEraseMode())) {
					mesh.visible=true;
					mesh.position.set(position.x, position.y, 0);
					this.render();
				}
			}, this);
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
				var material=new THREE.MeshBasicMaterial( {map:texture, transparent: true, opacity : opacity});
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

		__getRenderWindow : function() {
			var htmlContainer = new qx.ui.embed.Html();
			this.__viewPort=htmlContainer;

			var randomId=Math.random();
			htmlContainer.setHtml("<div id=\"three.js"+randomId+"\"></div>");

			var _this=this;

			htmlContainer.addListenerOnce("appear",function(e){
				// scene and camera
				var elementSize=htmlContainer.getInnerSize();
				this.__scene = new THREE.Scene();
				var camera = new THREE.PerspectiveCamera( 60, elementSize.width / elementSize.height, 1, 1e5 );
				var container = document.getElementById( "three.js"+randomId);
				var controls = new THREE.TrackballControls2( camera,container );

				camera.position.set(0,0,100);
				controls.target.set(0,0,0);
				this.__controls=controls;
				this.__camera=camera;
				this.__scene.add( camera );

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
					renderer.render( _this.__scene, _this.__camera );
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
						if (this.isPaintMode())
						{
							mouseMode=1;
							var position=this.getPositionOnSlice(event);
							var context=this.__drawingCanvas.getContext2d();

							var i=position.i+0.5;
							var j=position.j+0.5;

							var paintColor=_this.__paintColor;
							var width=this.__paintWidth/2;
							context.lineWidth = 0;
							context.strokeStyle = paintColor;
							context.fillStyle = paintColor;
							context.beginPath()
							context.arc(i, j, width, 0, 2*Math.PI, false);
							context.closePath();
							context.fill()




						//	context.strokeStyle = this.__paintColor;
							context.lineJoin = "round";
							context.lineWidth = width;
							context.beginPath();
							context.moveTo(i, j);
							context.closePath();
							context.stroke();
							this.fireEvent("changeDrawing");
						}
						if (this.isEraseMode())
						{
							mouseMode=1;
							var position=this.getPositionOnSlice(event);
							var x=Math.round(position.i)+0.5;
							var y=Math.round(position.j)+0.5;
							var width=this.__paintWidth;
							var radius=width/2;
							this.__drawingCanvas.getContext2d().clearRect(x-radius, y-radius, width, width);
							this.__drawingCanvasModified=true;
							this.fireEvent("changeDrawing");
						}
					}
					}, this);

				htmlContainer.addListener("mousemove", function (event)	{
					switch (mouseMode)
					{
					case 2:
						var origin=htmlContainer.getContentLocation();
						controls.mouseMove(event.getDocumentLeft()-origin.left
								, event.getDocumentTop()-origin.top);

						//propagate zoom to other viewers
						if (button==1) {
							var z=this.__camera.position.z;
							this.__master.applyToViewers (function (viewer) {
								if (viewer!=this) {
									viewer.__camera.position.z=z;
									viewer.render();
									}
								});
						}

						break;
					case 1:
						if (this.isPaintMode())
						{
							var context=this.__drawingCanvas.getContext2d();
							var position=this.getPositionOnSlice(event);
							context.lineTo(position.i+0.5, position.j+0.5);
							context.stroke();
							this.fireEvent("changeDrawing");
							this.__drawingCanvasModified=true;
						}
						if (this.isEraseMode())
						{
							mouseMode=1;
							var position=this.getPositionOnSlice(event);
							var x=Math.round(position.i)+0.5;
							var y=Math.round(position.j)+0.5;
							var width=this.__paintWidth/2;
							var radius=width/2;
							this.__drawingCanvas.getContext2d().clearRect(x-radius, y-radius, width, width);
							this.__drawingCanvasModified=true;
							this.fireEvent("changeDrawing");
						}
						break;
					default:
						break;
					}
					}, this);

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
			var vector = new THREE.Vector3( x2, y2, 0);//0.5 );
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
				return {i :intxc, j :intyc, x:xinter, y:yinter};
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
			}, this);

			rightContainer.add(slider, {flex : 1});
			this.add(rightContainer);
		}
	}
});

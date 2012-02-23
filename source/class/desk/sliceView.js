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

	construct : function(file, fileBrowser, master, orientation, callback)
	{
		this.base(arguments);

		this.__slices=[];
		this.__fileBrowser=fileBrowser;
		this.addVolume(file, callback);

		if (typeof orientation=="number")
			this.setOrientation(orientation);
		else
			this.setOrientation(0);

		this.__master=master;		

		this.__window=new qx.ui.window.Window();

		this.__window.setLayout(new qx.ui.layout.HBox(5));
		this.__window.setShowClose(true);
		this.__window.setShowMinimize(false);
		this.__window.setResizable(true,true,true,true);
		this.__window.setUseResizeFrame(true);
		this.__window.setUseMoveFrame(true);
		this.__window.set({width : 400, height : 400});
		this.__window.setCaption(file);
		this.__createUI();

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
		this.__window.open();
		return (this);		
	},

	properties : {
		orientation : { init : -1, check: "Number", event : "changeOrientation"},
		ready : { init : false, check: "Boolean", event : "changeReady"},
		paintMode : { init : false, check: "Boolean"}
	},

	members : {

		__fileBrowser : null,
		__slices : null,

		__slider : null,

		__fileFormatBox : null,

		__mainLeftContainer : null,

		__window :null,

		__viewPort : null,

		__currentColor : null,
		__currentWidth : null,

		//THREE.js objects
		__scene : null,
		__camera : null,
		__renderer : null,
		__controls : null,

		__master : null,

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

		addVolume : function (file, callback)
		{
			if (this.isReady()) {
				this.__addVolume(file, callback);
			}
			else {
				this.addListenerOnce("changeReady", function () {
					this.__addVolume(file, callback)},this);
			}
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
				for (var i=0;i<4;i++)
					geometry.vertices.push( new THREE.Vertex( new THREE.Vector3( coordinates[2*i],
																				coordinates[2*i+1], 0 ) ) );

				geometry.faces.push( new THREE.Face4( 0, 1, 2, 3 ) );
				geometry.faceVertexUvs[ 0 ].push( [
					new THREE.UV( 0, 0),
					new THREE.UV( 1, 0 ),
					new THREE.UV( 1, 1 ),
					new THREE.UV( 0, 1 )
					] );

				
				_this.__slider.setMaximum(volumeSlice.getNumberOfSlices()-1);
				_this.__slider.setValue(Math.round(0.5*volumeSlice.getNumberOfSlices()));
				_this.__slider.bind("value", volumeSlice.getSlider(), "value");

				_this.__camera.position.set(0.5*(coordinates[0]+coordinates[2]),
											0.5*(coordinates[3]+coordinates[5]),
											0);
				_this.__controls.target.copy(_this.__camera.position);
				_this.__camera.position.setZ(_this.__camera.position.z+(coordinates[2]-coordinates[0]));

				var canvas=volumeSlice.getImageCanvas();
				var width=canvas.getCanvasWidth();
				var height=canvas.getCanvasHeight();
				var imageData=canvas.getContext2d().getImageData(0, 0, width, height);

				var length=imageData.data.length;
				var dataColor = new Uint8Array( length);

				var texture = new THREE.DataTexture( dataColor, imageData.width, imageData.height, THREE.RGBAFormat );
				texture.needsUpdate = true;
				texture.magFilter=THREE.NearestFilter;
				var material=new THREE.MeshBasicMaterial( {map:texture});

				var mesh=new THREE.Mesh(geometry,material);
				mesh.doubleSided=true;
				_this.__scene.add(mesh);
				volumeSlice.setUserData("mesh",mesh);

				function updateTexture()
				{
					geometry.computeCentroids();
					geometry.computeFaceNormals();
					geometry.computeVertexNormals();
					geometry.computeBoundingSphere();
				//	HACKSetDirtyVertices(geometry);

//					var data=volumeSlice.getSliceImageData().data;
					var data=canvas.getContext2d().getImageData(0, 0,width, height).data;
					for (var i=length;i--;)
						dataColor[i]=data[i];
					texture.needsUpdate = true;
					_this.render();
				}

				updateTexture();

				var listenerId=volumeSlice.addListener('changeSlice',function(e)
					{
						updateTexture();
						_this.render();
					});

				_this.__window.addListener("close", function() {
					volumeSlice.removeListenerById(listenerId);
					});

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

			if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

			this.__window.setDroppable(true);
			this.__window.addListener("drop", function(e) {
				if (e.supportsType("fileBrowser"))
				{
					var fileBrowser=e.getData("fileBrowser");
					var nodes=fileBrowser.getSelectedNodes();
					var numberOfMeshes=nodes.length;
					var numberOfRemainingMeshes=numberOfMeshes;
					for (var i=0;i<nodes.length;i++)
					{
						var fileNode=nodes[i];
						var fileName=fileBrowser.getNodeFile(fileNode);
						var mTime=fileBrowser.getNodeMTime(fileNode);

						var update=function()
						{
							numberOfRemainingMeshes--;
							switch (numberOfRemainingMeshes)
							{
								case Math.floor(numberOfMeshes/4):
								case Math.floor(numberOfMeshes/2):
								case Math.floor(numberOfMeshes*3/4):
								case 0:
									_this.viewAll();
									break;
								default:
							}
						}
						this.openFile(fileName, mTime);
					}
				}
				if (e.supportsType("volumeSlice"))
				{
					this.attachVolumeSlice(e.getData("volumeSlice"));
				}

				// activate the window
				var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
				windowManager.bringToFront(this.__window);
			}, this);

			this.__window.addListener("close", function(e) {
				this.dispose();
				},this);

			htmlContainer.addListener("appear",function(e){
				// scene and camera
				var elementSize=htmlContainer.getInnerSize();
				var scene = new THREE.Scene();
				var camera = new THREE.PerspectiveCamera( 60, elementSize.width / elementSize.height, 0.01, 1e10 );
				var container = document.getElementById( "three.js"+randomId);
				var controls = new THREE.TrackballControls2( camera,container );

				camera.position.set(0,0,100);
				controls.target.set(0,0,0);
				this.__controls=controls;
				this.__scene=scene;
				this.__camera=camera;

				scene.add( camera );

				// lights

				var dirLight = new THREE.DirectionalLight( 0xffffff );
				dirLight.position.set( 200, 200, 1000 ).normalize();
				camera.add( dirLight );
				camera.add( dirLight.target );
				var dirLight2 = new THREE.DirectionalLight( 0xffffff );
				dirLight2.position.set( -200, -200, -1000 ).normalize();
				camera.add( dirLight2 );
				camera.add( dirLight2.target );

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
				htmlContainer.addListener("mousedown", function (event)	{
					htmlContainer.capture();

					var button=0;
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
						mouseMode=1;
						var position=_this.getPositionOnSlice(event);
						var context=_this.__slices[0].getImageCanvas().getContext2d();
						context.strokeStyle = _this.__paintColor;
						context.lineJoin = "round";
						context.lineWidth = _this.__paintWidth;
						console.log(_this.__paintWidth);
				//		console.log(position);
					    context.beginPath();
						context.moveTo(position.x, position.y);
						context.closePath();
						context.stroke();
					     _this.__slices[0].fireEvent("changeSlice");
					}
					});

				htmlContainer.addListener("mousemove", function (event)	{
					switch (mouseMode)
					{
					case 2:
						var origin=htmlContainer.getContentLocation();
						controls.mouseMove(event.getDocumentLeft()-origin.left
								, event.getDocumentTop()-origin.top);
						break;
					case 1:
						var context=_this.__slices[0].getImageCanvas().getContext2d();
						var position=_this.getPositionOnSlice(event);
					     context.lineTo(position.x, position.y);
						context.stroke();
						_this.__slices[0].fireEvent("changeSlice");
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
			var volumeSlice=this.__slices[0];
			meshes.push(volumeSlice.getUserData("mesh"));
			var intersects = ray.intersectObjects( meshes );

			if ( intersects.length > 0 ) {
				var xinter=intersects[0].point.x;
				var yinter=intersects[0].point.y;
			//	console.log(xinter+" "+yinter);
				var coordinates=volumeSlice.get2DCornersCoordinates();
				var dimensions=volumeSlice.get2DDimensions();
				var intxc=Math.floor((xinter-coordinates[0])*dimensions[0]/(coordinates[2]-coordinates[0]));
				var intyc=Math.floor((yinter-coordinates[1])*dimensions[1]/(coordinates[5]-coordinates[1]));
		//		console.log(intxc+" "+intyc);
				return {x :intxc, y :intyc};
			}
			else
			{
				return false;
			}
		},

		getSlider : function (){
			return this.__slider;
		},


		getSeedsLists : function()
		{
this.debug("------->>>   volView.__createSeedsLists : function()   !!!!!!!");
			var volView = this;
			
			var tools = volView.__master.__tools;
			
			var theMaster = volView.__master;
			
			var volFile = volView.__file;
			
			var fileBrowser = volView.__fileBrowser;
			
			
			
			// create seeds list
			var seedsList=new qx.ui.form.List();
			seedsList.setWidth(30);
			seedsList.setScrollbarY("off");
			this.__window.add(seedsList);
			seedsList.setVisibility("excluded");
			
			
			
			// create corrections list
			var correctionsList=new qx.ui.form.List();
			correctionsList.setWidth(30);
			correctionsList.setScrollbarY("off");
			this.__window.add(correctionsList);
			correctionsList.setVisibility("excluded");
			
			
			
			seedsList.addListener("removeItem", function(event) {
//~ volView.debug("3220 : >>>>>>>  seedsList.addListener(removeItem, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if (seedsList.getChildren().length==0)
					tools.__startSegmentationButton.setEnabled(false);
				}, this);

			seedsList.addListener("addItem", function(event) {
//~ volView.debug("3226 : >>>>>>>  seedsList.addListener(addItem, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				tools.__startSegmentationButton.setEnabled(true);
				}, this);
			
			
			var keyPressHandler = function(event)
			{
//~ volView.debug("3233 : >>>>>>>  keyPressHandler = function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if(event.getKeyIdentifier()=="Delete")
				{
					var selectedChild = this.getSelection()[0];
					if (selectedChild!=null)
					{
						var sliceId = selectedChild.getUserData("slice");
					////Erase image on the server
						theMaster.__eraseFile(tools.getSessionDirectory()+"/"+volView.__getSeedFileName(sliceId));
						tools.__seedsTypeSelectBox.getSelection()[0].getUserData("seedsArray")[volView.__display.orientation][sliceId]=0;
						volView.__clearDrawingCanvas();
						this.remove(selectedChild); //  this  : the given List (see below)
						theMaster.__saveSeedsXML();
					}
				}
			};
			seedsList.addListener("keypress", keyPressHandler, seedsList);
			correctionsList.addListener("keypress", keyPressHandler, correctionsList);
			
			
			
			var createdLists = [];
			createdLists[0] = seedsList;
			createdLists[1] = correctionsList;
			
			
			return createdLists;
			
			
		},
		
		__getSeedsLists : function(key,seedsTypeListItem)
		{
//~ this.debug("------->>>   volView.__getSeedsLists : function()   !!!!!!!");

			volView = this;
			
			var seedsList = null;
			var seedsTypeSelectBox = volView.__master.__tools.__seedsTypeSelectBox;
			if(seedsTypeSelectBox!=null)
			{
				var mySeedsTypeListItem = null;
				if(seedsTypeListItem!=null)
					mySeedsTypeListItem = seedsTypeListItem;
				else
					mySeedsTypeListItem = seedsTypeSelectBox.getSelection()[0];
				if(mySeedsTypeListItem!=null)
				{
					seedsList = mySeedsTypeListItem.getUserData(key)[volView.getUserData("viewerIndex")];
				}
			}
			
			return seedsList;
		},

		__createUI : function (file) {

			var leftContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox(5));
			this.__mainLeftContainer=leftContainer;
//			var button=new qx.ui.form.ToggleButton("tools");


			var _this=this;

			if (this.__master.isToolsReady())
			{
				addtoolsButton();
			}
			else
			{
				this.__master.addListenerOnce("changeToolsReady", function () {
					addToolsButton();
					});
			}

			function addToolsButton() {
				leftContainer.add(_this.__master.getTools().getPaintPanelVisibilitySwitch());
			}
		/*	button.addListener("changeValue",function (value) {
				if (this.__master!=null)
				{
					if (value)
					{
						this.__master.getTools().open();
					}
					else
					{
						this.__master.getTools().close();
					}
				} 
			},this)*/

			this.__slider=new qx.ui.form.Slider();
			this.__slider.setMinimum(0);
			this.__slider.setMaximum(100);
			this.__slider.setValue(0);
			this.__slider.setWidth(30);
			this.__slider.setOrientation("vertical");

			
			// if there is only one slice, do not show the slider...
			leftContainer.add(this.__slider, {flex : 1});

			this.__fileFormatBox = new qx.ui.form.SelectBox();
			this.__fileFormatBox.setWidth(30);
			var SelectJPG = new qx.ui.form.ListItem("jpg");
			this.__fileFormatBox.add(SelectJPG);
//			var SelectPNG = new qx.ui.form.ListItem("png");
//			this.__fileFormatBox.add(SelectPNG);
			leftContainer.add(this.__fileFormatBox);

			this.__window.add(leftContainer);
			this.__window.add(this.__getRenderWindow(), {flex : 1});
		}
	}
});

/*
#asset(three.js/*)
#ignore(THREE.*)
#ignore(THREE)
#ignore(requestAnimationFrame)
#ignore(Detector)
#ignore(Uint8Array)
#ignore(HACKSetDirtyVertices)
*/
qx.Class.define("desk.meshView", 
{
	extend : qx.core.Object,

	construct : function(file, fileBrowser, mtime, parameters)
	{
//		this.base(arguments);

		if ( parameters != undefined )
		{
			if (parameters.convertVTK!==undefined)
				this.setConvertVTK(parameters.convertVTK);
		}

		var window=new qx.ui.window.Window();
		window.setLayout(new qx.ui.layout.VBox());
		window.setShowClose(true);
		window.setWidth(600);
		window.setHeight(400);
		window.setShowMinimize(false);
		window.setResizable(true,true,true,true);
		window.setUseResizeFrame(true);
		window.setUseMoveFrame(true);
		window.setContentPadding(2);
		window.setCaption(file);
		this.__window=window;

		var pane = new qx.ui.splitpane.Pane("horizontal")
		window.add(pane,{flex : 1});

		this.__embededHTML=this.__createRenderWindow();
		pane.add(this.__embededHTML, 5);
		window.open();

		var elementsList = new qx.ui.container.Composite;
		elementsList.setLayout(new qx.ui.layout.VBox());
		pane.add(elementsList, 1);


		var topRightContainer = new qx.ui.container.Composite();
		topRightContainer.setLayout(new qx.ui.layout.HBox());
		elementsList.add(topRightContainer);
		topRightContainer.add(this.__getDragLabel());
		topRightContainer.add(this.__getResetViewButton(), {flex : 1});
		topRightContainer.add(this.__getSnapshotButton());

		this.__shapesList=new qx.ui.treevirtual.TreeVirtual(["meshes","wireframe"],
			{initiallyHiddenColumns : [1]});
		this.__shapesList.setSelectionMode(qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);
		this.__shapesList.set({
			width  : 180,
			rowHeight: 22,
			columnVisibilityButtonVisible : false});


		var dataModel=this.__shapesList.getDataModel();
		var filterBox = new qx.ui.container.Composite;
		filterBox.setLayout(new qx.ui.layout.HBox(10));
		var filterText=new qx.ui.basic.Label("search");
		filterBox.add(filterText);

		var meshView=this;

		var filterField = new qx.ui.form.TextField();
		filterField.setValue("");
		filterField.addListener("input", function() {
			dataModel.setData();
			meshView.render();
			});
		filterBox.add(filterField);
		elementsList.add(filterBox);//, {flex:1});

		var filter = qx.lang.Function.bind(function(node)
			{
				if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					var label = node.label;
					var shape= meshView.__shapesArray[node.nodeId];
					if (label.toLowerCase().indexOf(filterField.getValue().toLowerCase()) != -1)
					{
						if (shape)
							shape.visible=meshView.__shapesVisibility[node.nodeId];
						return true;
					}
					else
					{
						if (shape)
							shape.visible=false;
						return false;
					}						
				}
				return true;
			}, this);

		var resetButton=new qx.ui.form.Button("Reset filter");
		resetButton.setAllowGrowY(false);
		resetButton.addListener("execute",function(e){
			filterField.setValue("");
			dataModel.setData();
			meshView.render();
			});
		filterBox.add(resetButton);
		dataModel.setFilter(filter);

		elementsList.add(this.__shapesList,{flex : 1});
		this.__shapesArray=[];
		this.__shapesVisibility = [];

		var menu=this.__getContextMenu();
		this.__shapesList.setContextMenu(menu);

		if (fileBrowser!=null)
		{
			this.__fileBrowser=fileBrowser;
			this.openFile(file,mtime);
		}
		else
		{
			alert("error : no file browser provided to mesh viewer");
		}
		return (this);
	},

	destruct : function(){
		console.log("destructor");
		this.unlink();
		//clean the scene
		var shapes=this.__shapesArray;
		for (var i=0;i<shapes.kength;i++)
		{
			shapes[i]=0;
		}
		this.__shapesArray=0;

		this.__shapesVisibility.length=0;
		this._disposeObjects("__embededHTML","__shapesList");
	},

	properties : {
		// the "ready" property is true when the UI is ready.
		ready : { init : false, check: "Boolean", event : "changeReady"},
		convertVTK : { init : true, check: "Boolean"}
	},

	members : {

		// the html element containing the 3D rendering
		__embededHTML : null,

		// qooxdoo window
		__window : null,

		__fileBrowser : null,

		// a treeVirtual element storing all meshes
		__shapesList : null,

		// the nodeId for meshes
		__meshesRoot : null,

		// the nodeId for slices
		__slicesRoot : null,

		// array keeping all three.js meshes
		__shapesArray : null,

		// array storing all meshes visibility
		__shapesVisibility : null,

		//THREE.js objects
		__scene : null,
		__camera : null,
		__renderer : null,
		__controls : null,

		// array containing the queue of meshes to load 
		__meshesToLoad : null,

		// number defining the maximum number of loaders
		__numberOfLoaders : 16,

		// stores the scene bounding box diagonal length, usefull for updating
		__boudingBoxDiagonalLength : 0,

		__readFile : function (file, mtime, color, update, opt_updateDataModel) {
			var label;
			var lastSlashIndex=file.lastIndexOf("\/");
			if (lastSlashIndex<0)
				label=file;
			else
				label=file.substring(lastSlashIndex+1, file.length);

			var _this=this;
			var dataModel=this.__shapesList.getDataModel();

			if (this.__meshesRoot===null)
				this.__meshesRoot=dataModel.addBranch(null,"meshes", true);

			var leaf=dataModel.addLeaf(this.__meshesRoot,label, null);
			if (opt_updateDataModel!=false)
				dataModel.setData();

			var fileBrowser=this.__fileBrowser;

			var extension=file.substring(file.length-4, file.length);

			function loadMeshIntoScene(file)
			{
			
				function callback (shape)
				{
					_this.__shapesArray[ leaf ] = shape ;	
					_this.__shapesVisibility[leaf] = true ;

					if ( update == true )
						_this.viewAll();
					else {
						if ( (update != null ) && ( update != false ) )	{
							update();
						}
					}
				}

				if ( mtime === undefined )
				{
					mtime=Math.random();
					console.log("mtime : "+mtime);
				}

				switch (extension)
				{
				case ".vtk":
					if (_this.isConvertVTK()===false)
					{
						_this.loadVTKURL(fileBrowser.getFileURL(file)+"?nocache="+mtime, callback, color);
						break;
					}
				default : 
					_this.loadCTMURL(fileBrowser.getFileURL(file)+"?nocache="+mtime, callback, color);
				}
			}


			switch (extension)
			{
			case ".vtk":
				if (this.isConvertVTK()===false)
				{
					loadMeshIntoScene(file,mtime);
					break;
				}
			case ".ply":
			case ".obj":
			case ".stl":
			case ".off":

				var parameterMap={
					"action" : "mesh2ctm",
					"input_mesh" : file,
					"output_directory" : "cache\/"};

				function getAnswer(e)
				{
					var req = e.getTarget();
					var splitResponse=req.getResponseText().split("\n");
					var outputDir=splitResponse[0];
					var mtime=splitResponse[splitResponse.length-3];
					loadMeshIntoScene(outputDir+"\/"+"mesh.ctm",mtime);
				}

				fileBrowser.getActions().launchAction(parameterMap, getAnswer);
				break;

			case ".ctm":
				loadMeshIntoScene(file);
				break;
			default : 
				alert("error : file "+file+" cannot be displayed by mesh viewer");
			}
		},

		__links : null,

		linkToMeshViewer : function (viewer) {
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
					viewer.render();
				}
			}
		},

		unlink : function () {
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

		viewAll : function ( ) {
			var max=new THREE.Vector3(-1e10,-1e10,-1e10);
			var min=new THREE.Vector3(1e10,1e10,1e10);
			var shapes=this.__shapesArray;

			for (var i=0;i<shapes.length;i++)
			{
				if (shapes[i]!=undefined)
				{
					var bbox=shapes[i].geometry.boundingBox;

					var bbmin=bbox.min;
					if (min.x>bbmin.x)
						min.setX(bbmin.x);
					if (min.y>bbmin.y)
						min.setY(bbmin.y);
					if (min.z>bbmin.z)
						min.setZ(bbmin.z);

					var bbmax=bbox.max;
					if (max.x<bbmax.x)
						max.setX(bbmax.x);
					if (max.y<bbmax.y)
						max.setY(bbmax.y);
					if (max.z<bbmax.z)
						max.setZ(bbmax.z);
				}
			}

			var center=min.clone().addSelf(max).multiplyScalar(0.5);
			var bbdiaglength=Math.sqrt(max.clone().subSelf(min).lengthSq());

			var camera=this.__camera;

			if (this.__boudingBoxDiagonalLength==0)
			{
				this.__boudingBoxDiagonalLength=bbdiaglength;
				camera.position.copy(center);
				camera.position.setZ(camera.position.z-bbdiaglength);
				this.__controls.target.copy(center);
			}
			else
			{
				var ratio=bbdiaglength/this.__boudingBoxDiagonalLength;
				this.__boudingBoxDiagonalLength=bbdiaglength;
				if (ratio>1)
				{
					var backPedal=camera.position.clone();
					backPedal.subSelf(this.__controls.target);
					backPedal.multiplyScalar(ratio);
					backPedal.addSelf(this.__controls.target);
					camera.position.copy(backPedal);
				}
			}
			this.render();
		},

		openFile : function (file, mtime) {
			var _this=this;
			if (this.isReady()) {
				load();
			}
			else
			{
				this.addListenerOnce("changeReady", load);
			}
			
			function load ()
			{
				//open the file

				var extension=file.substring(file.length-4, file.length);
				switch (extension)
				{
					case ".ply":
					case ".obj":
					case ".stl":
					case ".vtk":
					case ".ctm":
					case ".off":
						_this.__readFile (file, mtime, [1.0,1.0,1.0,1.0], true);
						break;

					case ".xml":
						var xmlhttp=new XMLHttpRequest();
						xmlhttp.open("GET",_this.__fileBrowser.getFileURL(file)+"?nocache=" + Math.random(),false);
						xmlhttp.send();
						var readString=xmlhttp.responseXML;

						var meshes=readString.getElementsByTagName("mesh");

						var slashIndex=file.lastIndexOf("/");

						var path="";
						if (slashIndex>0)
							path=file.substring(0,slashIndex);

						var numberOfMeshes=meshes.length;

						var numberOfRemainingMeshes=numberOfMeshes;

						for (var n=0;n<numberOfMeshes;n++)
						{
							var color=[1.0,1.0,1.0,1.0];
							var mesh=meshes[n];
							if (mesh.hasAttribute("color"))
							{
								var colorstring=mesh.getAttribute("color");
								var colors=colorstring.split(" ");
								for (var j=0;j<4;j++)
									color[j]=parseFloat(colors[j]);
							}

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
										_this.__shapesList.getDataModel().setData();
										break;
									default:
								}
							}

							var xmlName;
							if (mesh.hasAttribute("Mesh")) {
								xmlName=mesh.getAttribute("Mesh");
								}
							else {
								xmlName=mesh.getAttribute("mesh");
								}
							_this.__readFile(path+"/"+xmlName, mtime, color, update, false);
						}
						break;
					default : 
						alert ("error : meshviewer cannot read extension "+extension);
				}

			}
		},

		attachVolumeSlices : function (volumeSlices) {
			for (var i=0;i<volumeSlices.length;i++) {
				this.attachVolumeSlice(volumeSlices[i]);
			}
		},

		attachVolumeSlice : function (volumeSlice)
		{
			var geometry=new THREE.Geometry();
			geometry.dynamic=true;
			for (var i=0;i<4;i++)
				geometry.vertices.push( new THREE.Vertex( new THREE.Vector3( 0, 0, 0 ) ) );
			geometry.faces.push( new THREE.Face4( 0, 1, 2, 3 ) );
			geometry.faceVertexUvs[ 0 ].push( [
				new THREE.UV( 0, 0),
				new THREE.UV( 1, 0 ),
				new THREE.UV( 1, 1 ),
				new THREE.UV( 0, 1 )
				] );

			var canvas=volumeSlice.getImageCanvas();
			var imageData=canvas.getContext2d().getImageData(0,0, canvas.getCanvasWidth(), canvas.getCanvasHeight());
			var length=imageData.data.length;
			var dataColor = new Uint8Array( length);
			var texture = new THREE.DataTexture( dataColor, imageData.width, imageData.height, THREE.RGBAFormat );
			texture.needsUpdate = true;
			texture.magFilter=THREE.NearestFilter;
			var material=new THREE.MeshBasicMaterial( {map:texture});

			var mesh=new THREE.Mesh(geometry,material);
			mesh.doubleSided=true;
			this.__scene.add(mesh);

			mesh.__volumeSlice=volumeSlice;

			var dataModel=this.__shapesList.getDataModel();

			if (this.__slicesRoot===null)
				this.__slicesRoot=dataModel.addBranch(null,"slices", true);


			var leaf=dataModel.addLeaf(this.__slicesRoot,volumeSlice.getFileName(), null);
			dataModel.setData();
			this.__shapesArray[ leaf ] = mesh ;	
			this.__shapesVisibility[leaf] = true ;

			var _this=this;

			function updateTexture()
			{
				var coords=volumeSlice.getCornersCoordinates();
				for (var i=0;i<4;i++) {
					geometry.vertices[i].position.set(coords[3*i],coords[3*i+1],coords[3*i+2]);
				}

				geometry.computeCentroids();
				geometry.computeFaceNormals();
				geometry.computeVertexNormals();
				geometry.computeBoundingSphere();
				geometry.computeBoundingBox();
				HACKSetDirtyVertices(geometry);

				var data=canvas.getContext2d().getImageData(0,0, canvas.getCanvasWidth(), canvas.getCanvasHeight()).data;
				for (var i=length;i--;)
					dataColor[i]=data[i];
				texture.needsUpdate = true;
				_this.render();
			}

			updateTexture();

			var listenerId=volumeSlice.addListener('changeImage',function(e)
				{
					updateTexture();
					_this.render();
				}, this);

			this.__window.addListener("close", function() {
				volumeSlice.removeListenerById(listenerId);
				});

			_this.render();
		},

		__createRenderWindow : function(){
			var htmlContainer = new qx.ui.embed.Html();
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
				if (e.supportsType("volumeSlices"))
				{
					this.attachVolumeSlices(e.getData("volumeSlices"));
				}

				// activate the window
				var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
				windowManager.bringToFront(this.__window);
			}, this);

			this.__window.addListener("close", function(e) {
				this.dispose();
				},this);

			htmlContainer.addListenerOnce("appear",function(e){

				// scene and camera
				var elementSize=htmlContainer.getInnerSize();
				var scene = new THREE.Scene();
				var camera = new THREE.PerspectiveCamera( 60, elementSize.width / elementSize.height, 0.01, 1e10 );
				var container = document.getElementById( "three.js"+randomId);
				var controls = new THREE.TrackballControls2( camera,container );

				this.__controls=controls;
				controls.zoomSpeed = 6;
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
				var _this=this;
				resizeHTML();

				container.appendChild( renderer.domElement );
	//			controls.onUpdate=render;


			/*	function render() {
					_this.fireEvent("changeViewPoint");
					controls.update();
					renderer.render( scene, camera );
				}*/

				htmlContainer.addListener("resize",resizeHTML);
				function resizeHTML(){
					var elementSize=htmlContainer.getInnerSize();
					renderer.setSize(  elementSize.width , elementSize.height );
					camera.aspect=elementSize.width / elementSize.height;
					camera.updateProjectionMatrix();
					controls.setSize( elementSize.width , elementSize.height );
					_this.render();
					}

				var draggingInProgress=false;
				htmlContainer.addListener("mousedown", function (event)	{
					htmlContainer.capture();
					var origin=htmlContainer.getContentLocation();
					draggingInProgress=true;
					var button=0;
					if (event.isRightPressed())
						button=1;
					else if ((event.isMiddlePressed())||(event.isShiftPressed()))
						button=2;
					else if (event.isCtrlPressed())
						button=3;

					controls.mouseDown(button,
									event.getDocumentLeft()-origin.left,
									event.getDocumentTop()-origin.top);
					});

				htmlContainer.addListener("mousemove", function (event)	{
					if (draggingInProgress)
					{
						var origin=htmlContainer.getContentLocation();
						controls.mouseMove(event.getDocumentLeft()-origin.left
								, event.getDocumentTop()-origin.top);
						this.render();
						this.__propagateLinks();
					}}, this);

				htmlContainer.addListener("mouseup", function (event)	{
					htmlContainer.releaseCapture();
					draggingInProgress=false;
					controls.mouseUp();});

				htmlContainer.addListener("mousewheel", function (event)	{
					var tree=_this.__shapesList;
					var root=_this.__slicesRoot;
					if (root!==null)
					{
						var rootNode=tree.nodeGet(root);
						var children=rootNode.children;
						if (children.length!=0)
						{
							var meshes=[];
							for (var i=0;i<children.length;i++)
							{
								if (_this.__shapesVisibility[children[i]])
									meshes.push(_this.__shapesArray[children[i]]);
							}

							var origin=htmlContainer.getContentLocation();
							var x=event.getDocumentLeft()-origin.left;
							var y=event.getDocumentTop()-origin.top;

							var elementSize=htmlContainer.getInnerSize();
							var x2 = ( x / elementSize.width ) * 2 - 1;
							var y2 = - ( y / elementSize.height ) * 2 + 1;

							var projector = new THREE.Projector();
							var vector = new THREE.Vector3( x2, y2, 0.5 );
							projector.unprojectVector( vector, camera );

							var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );

							var intersects = ray.intersectObjects( meshes );

							if ( intersects.length > 0 ) {
								var volumeSlice=intersects[0].object.__volumeSlice;
								var maximum=volumeSlice.getNumberOfSlices()-1;
								var delta=Math.round(event.getWheelDelta()/2);
								var newValue=volumeSlice.getSlice()+delta;
								if (newValue>maximum) {
									newValue=maximum;
								}
								if (newValue<0) {
									newValue=0;
								}
								volumeSlice.setSlice(newValue);
							}
						}
					}
					});

				this.setReady(true);
			}, this);

	
			return (htmlContainer);
		},

/*		render : function ( ) {
			this.__controls.update();
			this.__renderer.render( this.__scene, this.__camera );			
		},*/

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


		loadVTKURL : function (url, callback, color) {

			var loader=new THREE.VTKLoader();
			var _this=this;

			loader.load (url, function(geom){
						geom.computeBoundingBox();

						var threecolor=new THREE.Color().setRGB(color[0],color[1],color[2]);
						var material =  new THREE.MeshLambertMaterial( {
							 color:threecolor.getHex(),
							 opacity: color[3]} );
						if (color[3]<0.999) material.transparent=true;
						var mesh = new THREE.Mesh(geom, material );
						mesh.doubleSided=true;

						_this.__scene.add( mesh );

						if(typeof callback == 'function') {
							callback(mesh);
							}
						_this.viewAll();
					});
		},

		loadCTMURL : function (url, callback, color) {

			if (this.__meshesToLoad==null)
				this.__meshesToLoad=new Array();

			var mesh={url : url, color : color, callback : callback};
			this.__meshesToLoad[this.__meshesToLoad.length]=mesh;
			this.__loadQueue();
		},

		__loadQueue : function ( ) {
			if (this.__meshesToLoad.length==0)
				return;

			var parameters=this.__meshesToLoad[0];
			var _this=this;
			var useWorker = true
			var useBuffers = true;

			if (this.__numberOfLoaders>0){
				this.__meshesToLoad.shift();
				this.__numberOfLoaders--;
				var loader = new THREE.CTMLoader( this.__renderer.context );
				loader.load (parameters.url,
					function(geom){
							geom.computeBoundingBox();
							var color=parameters.color;
							var threecolor=new THREE.Color().setRGB(color[0],color[1],color[2]);
							var material =  new THREE.MeshLambertMaterial( {
								 color:threecolor.getHex(),
								 opacity: color[3]} );
							if (color[3]<0.999) material.transparent=true;
							var mesh = new THREE.Mesh(geom, material );
							mesh.doubleSided=true;

							_this.__scene.add( mesh );

							if(typeof parameters.callback == 'function') {
								parameters.callback(mesh);
								}
							_this.viewAll();
							_this.__numberOfLoaders++;
							_this.__loadQueue();
						}, useWorker, useBuffers);
				this.__loadQueue();
			}
		},

		snapshot : function (factor) {
			if (factor==null)
				factor=1;

			var width=this.__window.getWidth();
			var height=this.__window.getHeight();

			if (factor==1)
			{
				this.render();
				var strData = this.__renderer.domElement.toDataURL("image/png");
				var saveData=strData.replace("image/png", "image/octet-stream");
				document.location.href = saveData;
			}
			else
			{
				this.__embededHTML.addListenerOnce("resize", function() {
					var strData = this.__renderer.domElement.toDataURL("image/png");
					var saveData=strData.replace("image/png", "image/octet-stream");
					document.location.href = saveData;
					this.__window.set({width: width, height : height});
				}, this);
				this.__window.set({width: width*factor, height : height*factor});
			}
		},

		__getSnapshotButton : function () {

			var factor=1;

			var menu = new qx.ui.menu.Menu();
			var x1button = new qx.ui.menu.Button("x1");
			x1button.addListener("execute", function (){factor=1;},this);
			menu.add(x1button);
			var x2button = new qx.ui.menu.Button("x2");
			x2button.addListener("execute", function (){factor=2;},this);
			menu.add(x2button);
			var x3button = new qx.ui.menu.Button("x3");
			x3button.addListener("execute", function (){factor=3;},this);
			menu.add(x3button);
			var x4button = new qx.ui.menu.Button("x4");
			x4button.addListener("execute", function (){factor=4;},this);
			menu.add(x4button);

			var button=new qx.ui.form.Button(null, "resource/desk/camera-photo.png");
			button.addListener("execute", function(e) {
				this.snapshot(factor);}, this);
	
			button.setContextMenu(menu);
			return button;
		},

		__getResetViewButton : function () {
			var button=new qx.ui.form.Button("reset view");
			button.addListener("execute", function(e) {
				this.__boudingBoxDiagonalLength=0;
				this.viewAll();}, this);
			return button;
		},

		__getDragLabel : function () {
			var dragLabel=new qx.ui.basic.Label("Link").set({decorator: "main"});
			// drag and drop support
			dragLabel.setDraggable(true);
			dragLabel.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("meshView");
				});

			dragLabel.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					switch (type)
					{
					case "meshView":
						e.addData(type, this);
						break;
					default :
						alert ("type "+type+"not supported for drag and drop");
					}
				}, this);

			// enable linking between viewers by drag and drop
			this.__window.setDroppable(true);
			this.__window.addListener("drop", function(e) {
				if (e.supportsType("meshView"))
				{
					var meshView=e.getData("meshView");
					this.linkToMeshViewer(meshView);
					meshView.__propagateLinks();
				}
			},this);
			return dragLabel;
		},

		__getPropertyWidget : function (parentWindow){
			var _this=this;
			var shapesTree=this.__shapesList;
			
			var mainContainer = new qx.ui.container.Composite;
			mainContainer.setLayout(new qx.ui.layout.VBox());

			var topBox = new qx.ui.container.Composite;
			topBox.setLayout(new qx.ui.layout.HBox());
			var bottomBox = new qx.ui.container.Composite;
			bottomBox.setLayout(new qx.ui.layout.HBox());
			mainContainer.add(topBox);
			mainContainer.add(bottomBox);

			var colorSelector=new qx.ui.control.ColorSelector()
			bottomBox.add(colorSelector);//, {flex:1});

/*			var wireframeCheckBox=new qx.ui.form.CheckBox("wireframe");
			topBox.add(wireframeCheckBox);
			topBox.add(new qx.ui.core.Spacer(10, 20),{flex:1});
		*/	
			if (parentWindow)
			{
				var alwaysOnTopCheckBox=new qx.ui.form.CheckBox("this window always on top");
				alwaysOnTopCheckBox.setValue(true);
				parentWindow.setAlwaysOnTop(true);
				alwaysOnTopCheckBox.addListener('changeValue',function (e){
					parentWindow.setAlwaysOnTop(alwaysOnTopCheckBox.getValue());
					});
				topBox.add(alwaysOnTopCheckBox);
			}
			var ratio=255;
			var opacitySlider=new qx.ui.form.Slider();
			opacitySlider.setMinimum(0);
			opacitySlider.setMaximum(ratio);
			opacitySlider.setWidth(30);
			opacitySlider.setOrientation("vertical");
			bottomBox.add(opacitySlider);

			var enableUpdate=true;
			var updateWidgets=function (event)
			{
				enableUpdate=false;
				var selectedNode=shapesTree.getSelectedNodes()[0];
				if (selectedNode.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
				{
					var firstSelectedShape=_this.__shapesArray[selectedNode.nodeId];
					var color=firstSelectedShape.material.color;
					colorSelector.setRed(Math.round(ratio*color.r));
					colorSelector.setGreen(Math.round(ratio*color.g));
					colorSelector.setBlue(Math.round(ratio*color.b));
					colorSelector.setPreviousColor(Math.round(ratio*color.r),
							Math.round(ratio*color.g),Math.round(ratio*color.b));
			//		wireframeCheckBox.setValue(firstSelectedShape.material.wireframe);
					opacitySlider.setValue(Math.round(firstSelectedShape.material.opacity*ratio));
					enableUpdate=true;
				}
			}
			
			updateWidgets();

			shapesTree.addListener("changeSelection",updateWidgets);

			opacitySlider.addListener("changeValue", function(event){
				if (enableUpdate)
				{
					var shapesArray=shapesTree.getSelectedNodes();
					for (var i=0;i<shapesArray.length;i++)
					{
						var shape=_this.__shapesArray[shapesArray[i].nodeId];
						shape.material.opacity=opacitySlider.getValue()/ratio;
					}
					_this.render();
				}
				});
			
			
			colorSelector.addListener("changeValue", function(event){
				if (enableUpdate)
				{
					var shapesArray=shapesTree.getSelectedNodes();
					for (var i=0;i<shapesArray.length;i++)
					{
						var shape=_this.__shapesArray[shapesArray[i].nodeId];
						shape.material.color.setRGB (colorSelector.getRed()/ratio,
									colorSelector.getGreen()/ratio,
									colorSelector.getBlue()/ratio);
					}
					_this.render();
				}
				});

/*			wireframeCheckBox.addListener('changeValue',function(event){
				if (enableUpdate)
				{
					var shapesArray=shapesTree.getSelectedNodes();
					for (var i=0;i<shapesArray.length;i++)
					{
						var shape=_this.__shapesArray[shapesArray[i].nodeId];
						shape.material.wireframe=wireframeCheckBox.getValue();
					}
					console.log(wireframeCheckBox.getValue());
					_this.render();
				}
				});*/

			return (mainContainer);
		},

		__getContextMenu : function() {
				//context menu to edit meshes appearance
			var menu = new qx.ui.menu.Menu;
			var propertiesButton = new qx.ui.menu.Button("properties");
			propertiesButton.addListener("execute", function (){
				var selectedShapeId=this.__shapesList.getSelectedNodes()[0].nodeId;
				var shape=this.__shapesArray[selectedShapeId];
				alert ("Mesh with "+shape.geometry.vertexPositionBuffer.numItems/3+" vertices and "+
						shape.geometry.vertexIndexBuffer.numItems/3+" polygons");
				},this);
			menu.add(propertiesButton);

			var appearanceButton = new qx.ui.menu.Button("appearance");
			appearanceButton.addListener("execute", function (){
				var propertyWindow=new qx.ui.window.Window();
				propertyWindow.setLayout(new qx.ui.layout.HBox());
				propertyWindow.add(this.__getPropertyWidget(propertyWindow));
				propertyWindow.open();			
				}, this);
			menu.add(appearanceButton);

			var showButton = new qx.ui.menu.Button("show");
			showButton.addListener("execute", function (){
				var shapesArray=this.__shapesList.getSelectedNodes();
				for (var i=0;i<shapesArray.length;i++)
				{
					if (shapesArray[i].type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					{
						var shapeId=shapesArray[i].nodeId;
						var shape=this.__shapesArray[shapeId];
						shape.visible=true;
						this.__shapesVisibility[shapeId]=true;
					}
				}
				this.render();		
				},this);
			menu.add(showButton);

			var hideButton = new qx.ui.menu.Button("hide");
			hideButton.addListener("execute", function (){
				var shapesArray=this.__shapesList.getSelectedNodes();
				for (var i=0;i<shapesArray.length;i++)
				{
					if (shapesArray[i].type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					{
						var shapeId=shapesArray[i].nodeId;
						var shape=this.__shapesArray[shapeId];
						shape.visible=false;
						this.__shapesVisibility[shapeId]=false;
					}
				}
				this.render();		
				},this);
			menu.add(hideButton);

			var removeButton = new qx.ui.menu.Button("remove");
			removeButton.addListener("execute", function (){
				var shapesArray=this.__shapesList.getSelectedNodes();
				for (var i=0;i<shapesArray.length;i++)
				{
					if (shapesArray[i].type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					{
						var shapeId=shapesArray[i].nodeId;
						var dataModel=this.__shapesList.getDataModel();
						dataModel.prune(shapeId, true);
						this.__scene.removeObject(this.__shapesArray[shapeId]);
						this.__shapesArray[shapeId]=0;
						dataModel.setData();
					}
				}
				this.render();		
				},this);
			menu.add(removeButton);
			return menu;
		}
	}
});


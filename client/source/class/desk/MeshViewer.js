/*
#asset(desk/camera-photo.png)
#ignore(THREE.*)
#ignore(THREE)
#ignore(requestAnimationFrame)
#ignore(Detector)
#ignore(Uint8Array)
@lint ignoreGlobal(THREE)
*/
qx.Class.define("desk.MeshViewer", 
{
	extend : qx.core.Object,
	include : desk.LinkMixin,

	construct : function(file, mtime, parameters)
	{
	//	this.base();
		if ( parameters != undefined )
		{
			if (parameters.convertVTK!==undefined) {
				this.setConvertVTK(parameters.convertVTK);
			}
		}

		var window=new qx.ui.window.Window();
		window.set({layout : new qx.ui.layout.VBox(),
			showClose : true,
			width : 600,
			height : 400,
			showMinimize : false,
			useResizeFrame : true,
			useMoveFrame : true,
			contentPadding : 2});
		window.setResizable(true,true,true,true);
		window.addListener("close", function(e) {
			this.removeAllMeshes();
			this.unlink();
			this.fireEvent("close");
		},this);
		this.__window=window;

		var pane = new qx.ui.splitpane.Pane("horizontal");
		window.add(pane, {flex : 1});
		this.__mainPane = pane;

		this.__threeCanvas = new desk.ThreeContainer();
		pane.add(this.__threeCanvas, 5);
		this.__setupInteractions();

		var elementsList = new qx.ui.container.Composite();
		elementsList.setLayout(new qx.ui.layout.VBox(3));
		pane.add(elementsList, 1);
		elementsList.setVisibility("excluded");

		var button=new qx.ui.form.Button("+").set({opacity : 0.5});
		this.__threeCanvas.add (button, {right : 3, top : 3});
		button.addListener("execute", function () {
			if (elementsList.getVisibility()=="visible") {
				elementsList.setVisibility("excluded");
				button.setLabel("+");
				this.render();
			}
			else {
				elementsList.setVisibility("visible");
				button.setLabel("-");
				this.render();
			}
		}, this);

		var topRightContainer = new qx.ui.container.Composite();
		topRightContainer.setLayout(new qx.ui.layout.HBox());
		elementsList.add(topRightContainer);
		topRightContainer.add(this.__getDragLabel());
		topRightContainer.add(this.__getResetViewButton(), {flex : 1});
		topRightContainer.add(this.__getSnapshotButton());

		this.__meshesTree=new qx.ui.treevirtual.TreeVirtual(["meshes","wireframe"],
			{initiallyHiddenColumns : [1]});
		this.__meshesTree.setSelectionMode(qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);
		this.__meshesTree.set({
			width  : 180,
			rowHeight: 22,
			columnVisibilityButtonVisible : false,
			statusBarVisible : false});

		elementsList.add(this.__meshesTree,{flex : 1});
		elementsList.add(this.__getFilterContainer());
		this.__meshes=[];
		this.__meshesVisibility = [];

		var menu=this.__getContextMenu();
		this.__meshesTree.setContextMenu(menu);

		this.__firstFile=file;
		this.__firstMTime=mtime;

		if (file) {
			this.openFile(file,mtime);
			window.setCaption(file);
		}
		this.__addDropSupport();
		window.open();
		window.center();

		return (this);
	},

	destruct : function(){
		this.removeAllMeshes();
		this.unlink();

//		this._disposeObjects("__embededHTML","__meshesTree");
	},

	properties : {
		convertVTK : { init : true, check: "Boolean"}
	},

	events : {
		"meshesLoaded" : "qx.event.type.Event",
		"close" : "qx.event.type.Event"
	},

	members : {
		__firstFile : null,

		__firstMTime : null,

		__threeCanvas : null,

		// qooxdoo window
		__window : null,
		
		__mainPane : null,

		// a treeVirtual element storing all meshes
		__meshesTree : null,

		// the nodeId for meshes
		__meshesRoot : null,

		// the nodeId for slices
		__slicesRoot : null,

		// array keeping all three.js meshes
		__meshes : null,

		// array storing all meshes visibility
		__meshesVisibility : null,

		// array containing the queue of meshes to load 
		__meshesToLoad : null,

		// number defining the maximum number of loaders
		__numberOfLoaders : 16,
		
		getMainPane : function()
		{
			this.__window.exclude();
			return this.__mainPane;
		},
		
		getScene : function() {
			return this.__threeCanvas.getScene();
		},
		
		getMeshes : function()
		{
			var meshesArray = this.__meshes;
			var meshesArrayLength = meshesArray.length;
			var meshes = {};
			for(var i=0; i<meshesArrayLength; i++)
			{
				if(typeof meshesArray[i]=="object")
					meshes[i] = meshesArray[i];
			}
			return meshes;
		},
		
		addMesh : function (mesh) {
			this.__threeCanvas.getScene().add(mesh);
		},

		getWindow : function () {
			return this.__window;
		},

		viewAll : function () {
			this.__threeCanvas.viewAll();
		},

		__getFilterContainer : function () {
			var dataModel = this.__meshesTree.getDataModel();
			var container = new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.HBox(10));
			var filterText = new qx.ui.basic.Label("search");
			container.add(filterText);

			var filterField = new qx.ui.form.TextField();
			filterField.setValue("");
			filterField.addListener("input", function() {
				dataModel.setData();
				this.render();
			}, this);
			container.add(filterField);

			var filter = qx.lang.Function.bind(function(node) {
				if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					var label = node.label;
					var mesh = this.__meshes[node.nodeId];
					if (label.toLowerCase().indexOf(filterField.getValue().toLowerCase()) != -1) {
						if (mesh) {
							mesh.visible = this.__meshesVisibility[node.nodeId];
						}
						return true;
					}
					else {
						if (mesh) {
							mesh.visible = false;
						}
						return false;
					}
				}
				return true;
			}, this);

			var resetButton = new qx.ui.form.Button("Reset filter");
			resetButton.setAllowGrowY(false);
			resetButton.addListener("execute",function(e){
				filterField.setValue("");
				dataModel.setData();
				this.render();
			}, this);

			container.add(resetButton);
			dataModel.setFilter(filter);
			return container;
		},

		__readFile : function (file, mtime, color, update, opt_updateDataModel) {
			var label;
			var lastSlashIndex=file.lastIndexOf("\/");
			if (lastSlashIndex<0) {
				label=file;
			}
			else {
				label=file.substring(lastSlashIndex+1, file.length);
			}

			var _this=this;
			var dataModel=this.__meshesTree.getDataModel();

			if (this.__meshesRoot===null) {
				this.__meshesRoot=dataModel.addBranch(null,"meshes", true);
			}

			var leaf=dataModel.addLeaf(this.__meshesRoot,label, null);
			if (opt_updateDataModel!=false) {
				dataModel.setData();
			}

			var extension=file.substring(file.length-4, file.length);

			function loadMeshIntoScene(file)
			{
			
				function callback (mesh)
				{
					_this.__meshes[ leaf ] = mesh ;	
					_this.__meshesVisibility[leaf] = true ;
					if ( update == true ) {
						_this.viewAll();
					}
					else {
						if ( (update != null ) && ( update != false ) )	{
							update();
						}
					}
				}

				if ( mtime == undefined ) {
					mtime=Math.random();
				}

				switch (extension)
				{
				case ".vtk":
					if (_this.isConvertVTK()===false) {
						_this.loadVTKURL(desk.FileSystem.getFileURL(file)+"?nocache="+mtime, callback, color);
						break;
					}
				default : 
					_this.loadCTMURL(desk.FileSystem.getFileURL(file)+"?nocache="+mtime, callback, color);
				}
			}


			switch (extension)
			{
			case ".vtk":
				if (this.isConvertVTK()===false) {
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

				function getAnswer(response) {
					var outputDir = response.outputDirectory;
					var mtime = response.MTime;
					loadMeshIntoScene(outputDir + '/mesh.ctm', mtime);
				}

				desk.Actions.getInstance().launchAction(parameterMap, getAnswer);
				break;

			case ".ctm":
				loadMeshIntoScene(file);
				break;
			default : 
				alert("error : file "+file+" cannot be displayed by mesh viewer");
			}
		},

		update : function () {
			this.removeAllMeshes();
			this.openFile(this.__firstFile, Math.random());
		},

		__propagateLinks : function () {
			this.applyToOtherLinks(function (me) {
				var controls = this.__threeCanvas.getControls();
				controls.copy(me.__threeCanvas.getControls());
				controls.update();
				this.render();
			});
		},

		removeAllMeshes : function () {
			var meshesTree=this.__meshesTree;
			var meshesToRemove=[];

			var meshes=meshesTree.nodeGet(this.__meshesRoot).children;
			for (var i=0;i<meshes.length;i++) {
				meshesToRemove.push(meshesTree.nodeGet(meshes[i]));
			}

			this.removeMeshes(meshesToRemove);

			if (this.__slicesRoot === null) {
				return;
			}

			meshes=meshesTree.nodeGet(this.__slicesRoot).children;
			meshesToRemove=[];
			for (i = 0; i < meshes.length; i++) {
				meshesToRemove.push(meshesTree.nodeGet(meshes[i]));
			}

			this.removeMeshes(meshesToRemove);
		},

		openFile : function (file, mtime) {
			var _this = this;
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
					_this.__readFile (file, mtime, [1.0,1.0,1.0,1.0, 0], true);
					break;

				case ".xml":
					var xmlhttp=new XMLHttpRequest();
					xmlhttp.open("GET", desk.FileSystem.getFileURL(file) + "?nocache=" + Math.random(),false);
					xmlhttp.send();
					var rootDocument=xmlhttp.responseXML;

					var meshes=rootDocument.getElementsByTagName("mesh");
					var rootElement=rootDocument.childNodes[0];
					if (rootElement.hasAttribute("timestamp")) {
						mtime=parseFloat(rootElement.getAttribute("timestamp"));
					}

					var slashIndex=file.lastIndexOf("/");

					var path="";
					if (slashIndex>0)
						path=file.substring(0,slashIndex);

					var numberOfMeshes=meshes.length;

					var numberOfRemainingMeshes=numberOfMeshes;
					
					for (var n=0;n<numberOfMeshes;n++) {
						var color=[1.0,1.0,1.0,1.0, 0];
						var mesh=meshes[n];
						if (mesh.hasAttribute("color")) {
							var colorstring=mesh.getAttribute("color");
							var colors=colorstring.split(" ");
							switch (colors.length)
							{
								case 3:
									colors[3]="1";
								case 4:
									colors[4]="0";
								default:
							}
							for (var j=0;j<4;j++) {
								color[j]=parseFloat(colors[j]);
							}
							color[4]=parseInt(colors[4], 10);
						}

						var updatesTimes = 4; // ...only after 4 updates when  numberOfRemainingMeshes = 0 all the meshes are loaded
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
									_this.__meshesTree.getDataModel().setData();
									--updatesTimes;
									if(updatesTimes === 0)
										_this.fireDataEvent("meshesLoaded", _this.__meshes);
									break;
								default:
							}
						};

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
			for (var i=0;i<4;i++) {
				geometry.vertices.push( new THREE.Vector3( 0, 0, 0 ) );
			}
			geometry.faces.push( new THREE.Face4( 0, 1, 2, 3 ) );
			geometry.faceVertexUvs[ 0 ].push( [
				new THREE.UV( 0, 0),
				new THREE.UV( 1, 0 ),
				new THREE.UV( 1, 1 ),
				new THREE.UV( 0, 1 )
				] );

			var material=volumeSlice.getMaterial();
			material.transparent=false;
			var mesh=new THREE.Mesh(geometry,material);
			material.side=THREE.DoubleSide;
			this.__threeCanvas.getScene().add(mesh);

			mesh.__volumeSlice=volumeSlice;

			var dataModel=this.__meshesTree.getDataModel();

			if (this.__slicesRoot===null) {
				this.__slicesRoot=dataModel.addBranch(null,"slices", true);
			}

			var leaf=dataModel.addLeaf(this.__slicesRoot,volumeSlice.getFileName(), null);
			dataModel.setData();
			this.__meshes[ leaf ] = mesh ;	
			this.__meshesVisibility[leaf] = true ;

			var _this=this;

			function updateTexture()
			{
				var coords=volumeSlice.getCornersCoordinates();
				for (var i=0;i<4;i++) {
					geometry.vertices[i].set(coords[3*i],coords[3*i+1],coords[3*i+2]);
				}
				geometry.computeCentroids();
				geometry.computeFaceNormals();
				geometry.computeVertexNormals();
				geometry.computeBoundingSphere();
				geometry.computeBoundingBox();
				geometry.verticesNeedUpdate=true;

				_this.render();
			}

			updateTexture();

			var listenerId=volumeSlice.addListener('changeImage',function(e)
				{
					updateTexture();
				}, this);

			this.__window.addListener("close", function() {
				volumeSlice.removeListenerById(listenerId);
				});
		},

		__addDropSupport : function () {
			this.__window.setDroppable(true);
			this.__window.addListener("drop", function(e) {
				if (e.supportsType("fileBrowser")) {
					var files = e.getData("fileBrowser").getSelectedFiles();
					for (var i = 0; i < files.length; i++) {
						this.openFile(files[i]);
					}
				}
				if (e.supportsType("volumeSlices")) {
					this.attachVolumeSlices(e.getData("volumeSlices"));
				}

				// activate the window
				var windowManager = qx.core.Init.getApplication().getRoot().getWindowManager();
				windowManager.bringToFront(this.__window);
			}, this);
		},

		__setupInteractions : function() {
			var threeCanvas = this.__threeCanvas;

			var draggingInProgress=false;
			threeCanvas.addListener("mousedown", function (event)	{
				threeCanvas.capture();
				var origin = threeCanvas.getContentLocation();
				draggingInProgress = true;
				var button = 0;
				if (event.isRightPressed()) {
					button = 1;
				}
				else if ( event.isMiddlePressed() || event.isShiftPressed()) {
					button = 2;
				}
				else if (event.isCtrlPressed()) {
					button = 3;
				}

				this.__threeCanvas.getControls().mouseDown(button,
								event.getDocumentLeft() - origin.left,
								event.getDocumentTop() - origin.top);
			}, this);

			threeCanvas.addListener("mousemove", function (event)	{
				if (draggingInProgress) {
					var origin = threeCanvas.getContentLocation();
					this.__threeCanvas.getControls().mouseMove(event.getDocumentLeft() - origin.left,
						event.getDocumentTop() - origin.top);
					this.render();
					this.__propagateLinks();
				}
			}, this);

			threeCanvas.addListener("mouseup", function (event)	{
				threeCanvas.releaseCapture();
				draggingInProgress = false;
				this.__threeCanvas.getControls().mouseUp();
			}, this);

			threeCanvas.addListener("mousewheel", function (event)	{
				var tree = this.__meshesTree;
				var root = this.__slicesRoot;
				if (root !== null) {
					var rootNode = tree.nodeGet(root);
					var children = rootNode.children;
					if (children.length !== 0) {
						var meshes = [];
						for (var i = 0; i < children.length; i++) {
							if (this.__meshesVisibility[children[i]]) {
								meshes.push(this.__meshes[children[i]]);
							}
						}

						var origin = threeCanvas.getContentLocation();
						var x=event.getDocumentLeft() - origin.left;
						var y=event.getDocumentTop() - origin.top;

						var elementSize = this.__threeCanvas.getInnerSize();
						var x2 = ( x / elementSize.width ) * 2 - 1;
						var y2 = - ( y / elementSize.height ) * 2 + 1;

						var projector = new THREE.Projector();
						var vector = new THREE.Vector3( x2, y2, 0.5 );
						var camera = this.__threeCanvas.getCamera();
						projector.unprojectVector(vector, camera);

						var ray = new THREE.Ray(camera.position,
							vector.subSelf(camera.position).normalize());

						var intersects = ray.intersectObjects(meshes);

						if (intersects.length > 0) {
							var volumeSlice = intersects[0].object.__volumeSlice;
							var maximum = volumeSlice.getNumberOfSlices() - 1;
							var delta = Math.round(event.getWheelDelta()/2);
							var newValue = volumeSlice.getSlice() + delta;
							if (newValue > maximum) {
								newValue = maximum;
							}
							if (newValue < 0) {
								newValue = 0;
							}
							volumeSlice.setSlice(newValue);
						}
					}
				}
			}, this);
		},

		render : function (force) {
			this.__threeCanvas.render(force);
		},

		loadVTKURL : function (url, callback, color) {
			var loader=new THREE.VTKLoader();
			var _this=this;
			loader.load (url, function(geom){
				geom.dynamic = true;
				geom.computeBoundingBox();

				var threecolor = new THREE.Color().setRGB(color[0],color[1],color[2]);
				var material =  new THREE.MeshLambertMaterial({
					color:threecolor.getHex(),
					opacity: color[3]});
				if (color[3]<0.999) {
					material.transparent=true;
				}
				var mesh = new THREE.Mesh(geom, material );
				material.side = THREE.DoubleSide;
				mesh.renderDepth = color[4];
				_this.__threeCanvas.getScene().add( mesh );
				if(typeof callback == 'function') {
					callback(mesh);
				}
				_this.viewAll();
			});
		},

		loadCTMURL : function (url, callback, color) {
			if (this.__meshesToLoad==null) {
				this.__meshesToLoad=[];
			}

			var mesh={url : url, color : color, callback : callback};
			this.__meshesToLoad[this.__meshesToLoad.length]=mesh;
			this.__loadQueue();
		},

		__loadQueue : function ( ) {
			if (this.__meshesToLoad.length==0)
				return;

			var parameters=this.__meshesToLoad[0];
			var _this=this;
			var useWorker = true;
			var useBuffers = true;

			if (this.__numberOfLoaders>0){
				this.__meshesToLoad.shift();
				this.__numberOfLoaders--;
				var loader = new THREE.CTMLoader( this.__threeCanvas.getRenderer().context );
				loader.load (parameters.url,
					function(geom){
								geom.dynamic = true;
							geom.computeBoundingBox();
							var color=parameters.color;
							var threecolor=new THREE.Color().setRGB(color[0],color[1],color[2]);

							var material =  new THREE.MeshPhongMaterial({
                color:threecolor.getHex(),
                opacity: color[3]
              });
							var factor=0.3;
							material.ambient = new THREE.Color().setRGB(
								factor*threecolor.r,factor*threecolor.g,factor*threecolor.b);
							material.shininess=5;
							material.specular= new THREE.Color( 0x303030 );
							if (color[3]<0.999) {
								material.transparent=true;
							}
							var mesh = new THREE.Mesh(geom, material );
							material.side=THREE.DoubleSide;
							mesh.renderDepth=color[4];
							_this.__threeCanvas.getScene().add( mesh );

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

			var button=new qx.ui.form.Button(null, "desk/camera-photo.png");
			button.addListener("execute", function(e) {
				this.__threeCanvas.snapshot(factor);
			}, this);
	
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
				if (e.supportsType("meshView")) {
					var meshView=e.getData("meshView");
					this.link(meshView);
					meshView.__propagateLinks();
				}
			},this);

			var menu = new qx.ui.menu.Menu();
			var unlinkButton = new qx.ui.menu.Button("unlink");
			unlinkButton.addListener("execute", this.unlink, this);
			menu.add(unlinkButton);
			dragLabel.setContextMenu(menu);

			return dragLabel;
		},

		__getPropertyWidget : function (parentWindow){
			var _this=this;
			var meshesTree=this.__meshesTree;
			
			var mainContainer = new qx.ui.container.Composite();
			mainContainer.setLayout(new qx.ui.layout.VBox());

			var topBox = new qx.ui.container.Composite();
			topBox.setLayout(new qx.ui.layout.HBox());
			var bottomBox = new qx.ui.container.Composite();
			bottomBox.setLayout(new qx.ui.layout.HBox());
			mainContainer.add(topBox);
			mainContainer.add(bottomBox);

			var colorSelector=new qx.ui.control.ColorSelector();
			bottomBox.add(colorSelector);//, {flex:1});

/*			var wireframeCheckBox=new qx.ui.form.CheckBox("wireframe");
			topBox.add(wireframeCheckBox);
		*/	

			var renderDepthLabel=new qx.ui.basic.Label("Render Depth");
			topBox.add(renderDepthLabel);

			var renderDepthSpinner=new qx.ui.form.Spinner(-100, 0,100);
			topBox.add(renderDepthSpinner);

			topBox.add(new qx.ui.core.Spacer(10, 20),{flex:1});
			if (parentWindow) {
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
			var updateWidgets=function (event) {
				enableUpdate=false;
				var selectedNode=meshesTree.getSelectedNodes()[0];
				if (selectedNode.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					var firstSelectedMesh=_this.__meshes[selectedNode.nodeId];
					var color=firstSelectedMesh.material.color;
					colorSelector.setRed(Math.round(ratio*color.r));
					colorSelector.setGreen(Math.round(ratio*color.g));
					colorSelector.setBlue(Math.round(ratio*color.b));
					colorSelector.setPreviousColor(Math.round(ratio*color.r),
							Math.round(ratio*color.g),Math.round(ratio*color.b));
			//		wireframeCheckBox.setValue(firstSelectedMesh.material.wireframe);
					opacitySlider.setValue(Math.round(firstSelectedMesh.material.opacity*ratio));
					renderDepthSpinner.setValue(firstSelectedMesh.renderDepth);
					enableUpdate=true;
				}
			};
			
			updateWidgets();

			meshesTree.addListener("changeSelection",updateWidgets);

			opacitySlider.addListener("changeValue", function(event){
				if (enableUpdate) {
					var meshes=meshesTree.getSelectedNodes();
					for (var i=0;i<meshes.length;i++) {
						var mesh=_this.__meshes[meshes[i].nodeId];
						if (mesh != null) {
							var opacity=opacitySlider.getValue()/ratio;
							mesh.material.opacity=opacity;
							if (opacity<1) {
								mesh.material.transparent=true;
							}
							else {
								mesh.material.transparent=false;
							}
						}
					}
					_this.render();
				}
			});

			colorSelector.addListener("changeValue", function(event){
				if (enableUpdate) {
					var meshes=meshesTree.getSelectedNodes();
					for (var i=0;i<meshes.length;i++) {
						var mesh=_this.__meshes[meshes[i].nodeId];
						if (mesh != null) {
							mesh.material.color.setRGB (colorSelector.getRed()/ratio,
										colorSelector.getGreen()/ratio,
										colorSelector.getBlue()/ratio);
						}
					}
					_this.render();
				}
			});

/*			wireframeCheckBox.addListener('changeValue',function(event){
				if (enableUpdate)
				{
					var shapesArray=meshesTree.getSelectedNodes();
					for (var i=0;i<shapesArray.length;i++)
					{
						var shape=_this.__meshes[shapesArray[i].nodeId];
						shape.material.wireframe=wireframeCheckBox.getValue();
					}
					console.log(wireframeCheckBox.getValue());
					_this.render();
				}
				});*/

			renderDepthSpinner.addListener("changeValue", function(event){
				if (enableUpdate) {
					var meshes=meshesTree.getSelectedNodes();
					for (var i=0;i<meshes.length;i++) {
						var mesh=_this.__meshes[meshes[i].nodeId];
						if (mesh != null) {
							mesh.renderDepth=renderDepthSpinner.getValue();
						}
					}
					_this.render();
				}
			});
			return (mainContainer);
		},

		removeMeshes : function (nodes) {
			var renderer = this.__threeCanvas.getRenderer();
			var dataModel=this.__meshesTree.getDataModel();
			for (var i=0;i<nodes.length;i++) {
				var nodeId=nodes[i].nodeId;
				dataModel.prune(nodeId, true);
				var mesh=this.__meshes[nodeId];
				this.__threeCanvas.getScene().remove(mesh);
				this.__meshes[nodeId]=0;
				this.__meshesVisibility[nodeId]=0;
				var map=mesh.material.map;
				if (map != null) {
					renderer.deallocateTexture( map );
				}
				renderer.deallocateObject( mesh );
			}
			dataModel.setData();
		},

		__animator : null,

		__getContextMenu : function() {
			//context menu to edit meshes appearance
			var menu = new qx.ui.menu.Menu();
			var propertiesButton = new qx.ui.menu.Button("properties");
			propertiesButton.addListener("execute", function (){
				var meshId=this.__meshesTree.getSelectedNodes()[0].nodeId;
				var mesh=this.__meshes[meshId];
				alert ("Mesh with "+mesh.geometry.vertexPositionBuffer.numItems/3+" vertices and "+
						mesh.geometry.vertexIndexBuffer.numItems/3+" polygons");
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
				var meshes=this.__meshesTree.getSelectedNodes();
				for (var i=0;i<meshes.length;i++) {
					if (meshes[i].type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
						var meshId=meshes[i].nodeId;
						var mesh=this.__meshes[meshId];
						mesh.visible=true;
						this.__meshesVisibility[meshId]=true;
					}
				}
				this.render();
			},this);
			menu.add(showButton);

			var hideButton = new qx.ui.menu.Button("hide");
			hideButton.addListener("execute", function (){
				var meshes=this.__meshesTree.getSelectedNodes();
				for (var i=0;i<meshes.length;i++) {
					if (meshes[i].type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
						var meshId=meshes[i].nodeId;
						var mesh=this.__meshes[meshId];
						mesh.visible=false;
						this.__meshesVisibility[meshId]=false;
					}
				}
				this.render();
			},this);
			menu.add(hideButton);

			var removeButton = new qx.ui.menu.Button("remove");
			removeButton.addListener("execute", function (){
				this.removeMeshes(this.__meshesTree.getSelectedNodes());
				this.render();		
			},this);
			menu.add(removeButton);
			
			var analysisButton = new qx.ui.menu.Button("Mesh Tools");
			analysisButton.addListener("execute", function (){
				var meshes=this.__meshesTree.getSelectedNodes();
				for (var i=0;i<meshes.length;i++) {
					if (meshes[i].type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
						var meshId=meshes[i].nodeId;
						var mesh=this.__meshes[meshId];
						
						var meshTools = new desk.MeshTools( {meshViewer:this, specMesh:mesh} );
						
					}
				}
			},this);
			menu.add(analysisButton);
			
			var animateButton = new qx.ui.menu.Button('animate');
			animateButton.addListener('execute', function () {
				var nodes = this.__meshesTree.getSelectedNodes();
				if (!this.__animator) {
					var that = this;
					this.__animator = new desk.Animator(function () {that.render();});
					this.__animator.addListener('close', function () {
						this.__animator = null;
					}, this);
				}

				for (var i = 0; i !=nodes.length; i++) {
					this.__animator.addObject(this.__meshes[nodes[i].nodeId], nodes[i].label);
				}
			},this);
			menu.add(animateButton);
			
			return menu;
		}
	}
});


/*
#ignore(o3djs.renderscene)
#ignore(o3djs.mesh)
#ignore(globalO3DDoNotHandleKeyEvents)
#ignore(o3djs.webgl)
*/

qx.Class.define("desk.meshView", 
{
  extend : qx.core.Object,

	construct : function(file, fileBrowser, mtime)
	{
//		this.base(arguments);

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

		this.__embededHTML=this.createDisplayWidget();
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
			meshView.getScene().render();
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
						{
							if (meshView.__shapesVisibility[node.nodeId])
								shape.show();
							else
								shape.hide();
						}
						return true;
					}
					else
					{
						if (shape)
							shape.hide();
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
			meshView.getScene().render();
			});
		filterBox.add(resetButton);
		dataModel.setFilter(filter);

		elementsList.add(this.__shapesList,{flex : 1});
		this.__shapesArray=[];
		this.__shapesVisibility = [];


		//context menu to edit meshes appearance
		var menu = new qx.ui.menu.Menu;
		var openButton = new qx.ui.menu.Button("color");
		openButton.addListener("execute", function (){
			var propertyWindow=new qx.ui.window.Window();
			propertyWindow.setLayout(new qx.ui.layout.HBox());
			propertyWindow.add(meshView.createPropertyWidget(propertyWindow));
			propertyWindow.open();			
			}, this);
		menu.add(openButton);

		var showButton = new qx.ui.menu.Button("show");
		showButton.addListener("execute", function (){
			var shapesArray=this.__shapesList.getSelectedNodes();
			for (var i=0;i<shapesArray.length;i++)
			{
				var shapeId=shapesArray[i].nodeId;
				var shape=this.__shapesArray[shapeId];
				shape.show();
				this.__shapesVisibility[shapeId]=true;
			}
			this.getScene().render();		
			},this);
		menu.add(showButton);

		var hideButton = new qx.ui.menu.Button("hide");
		hideButton.addListener("execute", function (){
			var shapesArray=this.__shapesList.getSelectedNodes();
			for (var i=0;i<shapesArray.length;i++)
			{
				var shapeId=shapesArray[i].nodeId;
				var shape=this.__shapesArray[shapeId];
				shape.hide();
				this.__shapesVisibility[shapeId]=false;
			}
			this.getScene().render();		
			},this);
		menu.add(hideButton);
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
//		this._disposeObjects("__");
	},

	members : {
		__embededHTML : null,
		__window : null,
		__fileBrowser : null,
		__fileToOpen : null,
		__fileToOpenMTime : null,
		__sceneReady : null,
		__shapesList : null,
		__shapesArray : null,
		__scene : null,
		__shapesVisibility : null,

		__volumes : null,

		getWindow : function() {
			return this.__window;
		},

		__readFile : function (file, mtime, color, update, opt_updateDataModel) {
			var label;
			var lastSlashIndex=file.lastIndexOf("\/");
			if (lastSlashIndex<0)
				label=file;
			else
				label=file.substring(lastSlashIndex+1, file.length);

			var myMeshViewer=this;
			var dataModel=this.__shapesList.getDataModel();
			var leaf=dataModel.addLeaf(null,label, null);
			if (opt_updateDataModel!=false)
				dataModel.setData();

			var scene=myMeshViewer.getScene();
			var fileBrowser=this.__fileBrowser;

			var loadMeshIntoScene=function(file)
			{
				scene.loadMesh(fileBrowser.getFileURL(file), function (shape)
					{
						myMeshViewer.__shapesArray[leaf]=shape;	
						myMeshViewer.__shapesVisibility[leaf]=true;
						if (update==true)
							scene.viewAll();
						else if ((update!=null)&&(update!=false))
							update();
					}, mtime, color);
			}

			var extension=file.substring(file.length-4, file.length);
			switch (extension)
			{
			case ".ply":
			case ".obj":
			case ".stl":
				var parameterMap={
					"action" : "mesh2vtk",
					"input_mesh" : file,
					"output_directory" : "cache\/"};

				function getAnswer(e)
				{
					var req = e.getTarget();
					var splitResponse=req.getResponseText().split("\n");
					var outputDir=splitResponse[0];
					console.log(req.getResponseText());
					var mtime=splitResponse[splitResponse.length-3];
					loadMeshIntoScene(outputDir+"\/"+"mesh.vtk",mtime);
				}

				fileBrowser.getActions().launchAction(parameterMap, getAnswer);
				break;
			case ".vtk":
				loadMeshIntoScene(file);
				break;
			default : 
				alert("error : file "+file+"cannot be displayed by mesh viewer");
			}
		},

		openFile : function (file, mtime) {
			if (file==null)
			{
				//no file is provided, maybe the iframe just finished setting up, and there is a file waiting to be loaded
				if (this.__fileToOpen==null)
					return;
				else
				{
					var fileToTopen=this.__fileToOpen;
					this.__fileToOpen=null;
					var mTime=this.__fileToOpenMTime;
					this.__fileToOpenMTime=null;
					this.openFile(fileToTopen,mTime);
				}
			}
			else
			{
				if (this.__sceneReady==null)
				{
					// the iframe is not ready : store the file name and mtime for future loading
					if (mtime==null)
					{
						console.log("Warning : no file mtime was given for mesh "+file+", will set mtime as random");
						mtime=Math.random();
					}
					this.__fileToOpen=file;
					this.__fileToOpenMTime=mtime;
				}
				else
				{
					//open the file
					var scene=this.getScene();
					var myMeshViewer=this;
					var extension=file.substring(file.length-4, file.length);
					switch (extension)
					{
						case ".ply":
						case ".obj":
						case ".stl":
						case ".vtk":
							this.__readFile (file, mtime, null, true);
							break;

						case ".xml":
							var xmlhttp=new XMLHttpRequest();
							xmlhttp.open("GET",myMeshViewer.__fileBrowser.getFileURL(file)+"?nocache=" + Math.random(),false);
							xmlhttp.send();
							var readString=xmlhttp.responseXML;

							var meshes=readString.getElementsByTagName("mesh");

							var slashIndex=file.lastIndexOf("/");

							var path="";
							if (slashIndex>0)
								path=file.substring(0,slashIndex);

							var meshIndex=0;
							var numberOfMeshes=meshes.length;
							var scene=this.getScene();
							var numberOfRemainingMeshes=numberOfMeshes;

							for (var n=0;n<numberOfMeshes;n++)
							{
								var mesh=meshes[n];
								var Label=mesh.getAttribute("Label");
								var color=[1.0,1.0,1.0,1.0];
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
											scene.viewAll();
											myMeshViewer.__shapesList.getDataModel().setData();
											break;
										default:
									}
								}

								this.__readFile(path+"/"+mesh.getAttribute("Mesh"), mtime, color, update, false);
							}
							break;
						default : 
							alert ("error : meshviewer cannot read extension "+extension);
					}
				}
			}
		},

		getScene : function() {
				return this.__scene;
		},

		createDisplayWidget : function(){


			var htmlContainer = new qx.ui.embed.Html();
			var randomId=Math.random();
			htmlContainer.setHtml("<div id=\"o3d"+randomId+"\"></div>");

			var scene;
			var canvaselement;
			var meshView=this;

			function initStep2(clientElements) {

				canvaselement=clientElements[0];
				scene=o3djs.renderscene.createRenderScene(clientElements[0]);
				meshView.__scene=scene;
				scene.render();
				
				var draggingInProgress=false;
				htmlContainer.addListener("mousedown", function (event)	{
					htmlContainer.capture();
					var origin=htmlContainer.getContentLocation();
					draggingInProgress=true;
					scene.startDragging(event.getDocumentLeft()-origin.left,
													event.getDocumentTop()-origin.top,
													event.isShiftPressed(),
													event.isCtrlPressed(),
													event.isMiddlePressed(),
													event.isRightPressed());});

				htmlContainer.addListener("mousemove", function (event)	{
					if (draggingInProgress)
					{
						var origin=htmlContainer.getContentLocation();
						scene.drag(event.getDocumentLeft()-origin.left
								, event.getDocumentTop()-origin.top);
					}});

				htmlContainer.addListener("mouseup", function (event)	{
					htmlContainer.releaseCapture();
					draggingInProgress=false;
					scene.stopDragging();});

				htmlContainer.addListener("mousewheel", function (event)	{
					scene.mouseWheelUsed(-event.getWheelDelta());});

				meshView.__sceneReady=true;

				function resizeHTML(){
					var elementSize=htmlContainer.getInnerSize();
					var myWidth = elementSize.width;
					var myHeight = elementSize.height;
					scene.client.gl.hack_canvas.width=myWidth;
					scene.client.gl.hack_canvas.height=myHeight;
					scene.client.gl.displayInfo = {width: myWidth, height: myHeight};
					scene.resize();
					}

				htmlContainer.addListener("resize",resizeHTML);
				resizeHTML();
				meshView.openFile();

				meshView.__window.setDroppable(true);
				meshView.__window.addListener("drop", function(e) {
					if (e.supportsType("fileBrowser"))
					{
						var fileBrowser=e.getData("fileBrowser");
						var nodes=fileBrowser.getSelectedNodes();
						var scene=this.getScene();
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
										scene.viewAll();
										break;
									default:
								}
							}
							meshView.__readFile(fileName, mTime, null, update);
						}
					}
					if (e.supportsType("volumeSlice"))
					{
						var volView=e.getData("volumeSlice");
						var scene=this.getScene();
						var dimensions=volView.getDimensions();
						var width=dimensions[0];
						var height=dimensions[1];
						var square=o3djs.mesh.createSquare(scene, width, height);

						function updateTexture()
						{
							var coords=volView.getCornersCoordinates();
							for (var i=0;i<4;i++)
								square.setVertexCoordinates(i,coords[3*i],coords[3*i+1],coords[3*i+2]);
							square.setTextureImageData(volView.getSliceImageData());
							scene.render();
						}

						updateTexture();

						var listenerId=volView.addListener('changeSlice',function(e)
							{
								updateTexture();
								scene.render();});

						if (meshView.__volumes==null)
							meshView.__volumes=[];
						meshView.__volumes.push({
								volumeViewer : volView,
								listener : listenerId});
						scene.render();
					}
					// activate the window
					var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
					windowManager.bringToFront(this.__window);
				}, meshView);

			meshView.__window.addListener("beforeClose", function(e) {
				// remove bindings from volume viewers
				var volumes=this.__volumes;
				if (volumes!=null)
					for (var i=0;i<volumes.length;i++)
						volumes[i].volumeViewer.removeListenerById(volumes[i].listener);
				this.__volumes=null;

				//clean the scene
				this.getScene().client.cleanup();
				this.__shapesArray.length=0;
				this.__shapesVisibility.length=0;
				},meshView);
			}

			htmlContainer.addListener("appear",function(e){
				globalO3DDoNotHandleKeyEvents=true;
				o3djs.webgl.makeClients(initStep2,null,null,null,"^o3d"+randomId);
				});
	
			return (htmlContainer);
		},

		snapshot : function () {
			this.__scene.render();
			var strData = this.__scene.client.gl.hack_canvas.toDataURL("image/png");
			var saveData=strData.replace("image/png", "image/octet-stream");
			document.location.href = saveData;			
		},

		__getSnapshotButton : function () {
			var button=new qx.ui.form.Button(null, "resource/desk/camera-photo.png");
			button.addListener("execute", function(e) {
				this.snapshot();}, this);
			return button;
		},

		__getResetViewButton : function () {
			var button=new qx.ui.form.Button("reset view");
			button.addListener("execute", function(e) {
				this.__scene.resetCamera();}, this);
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
						var meshView2=e.getData("meshView");
						this.__scene.bind(meshView2.__scene);
						meshView2.__scene.bind(this.__scene);
						meshView2.__scene.cameracontroller.onChange();
				}
			},this);

			// add listener on close window event to remove bindings
			this.__window.addListener("beforeClose", function (e){
			this.__scene.client.cleanup();
				},this)
			return dragLabel;
		},

		createPropertyWidget : function (parentWindow){
			var meshViewer=this;
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

			var wireframeCheckBox=new qx.ui.form.CheckBox("wireframe      ");
			topBox.add(wireframeCheckBox);

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
			var slider=new qx.ui.form.Slider();
			slider.setMinimum(0);
			slider.setMaximum(ratio);
			slider.setWidth(30);
			slider.setOrientation("vertical");
			bottomBox.add(slider);

			var enableUpdate=true;
			var updateWidgets=function (event)
			{
				enableUpdate=false;
				var firstSelectedShape=meshViewer.__shapesArray[shapesTree.getSelectedNodes()[0].nodeId];
				var color=firstSelectedShape.getColor();
				colorSelector.setRed(ratio*color[0]);
				colorSelector.setGreen(ratio*color[1]);
				colorSelector.setBlue(ratio*color[2]);
				colorSelector.setPreviousColor(ratio*color[0],ratio*color[1],ratio*color[2]);
				wireframeCheckBox.setValue(firstSelectedShape.isRepresentationWireframe());
				slider.setValue(color[3]*ratio);
				enableUpdate=true;
			}
			
			updateWidgets();

			var updateRepresentation=function(event){
				if (enableUpdate)
				{
					var shapesArray=shapesTree.getSelectedNodes();
					for (var i=0;i<shapesArray.length;i++)
					{
						var shape=meshViewer.__shapesArray[shapesArray[i].nodeId];
						shape.setColor ([colorSelector.getRed()/ratio,
						colorSelector.getGreen()/ratio,
						colorSelector.getBlue()/ratio,
						slider.getValue()/ratio]);
						shape.setRepresentationToWireframe(wireframeCheckBox.getValue());
					}
					shape.scene.render();
				}
			}

			shapesTree.addListener("changeSelection",updateWidgets);


			slider.addListener("changeValue", updateRepresentation);
			colorSelector.addListener("changeValue", updateRepresentation);

			wireframeCheckBox.addListener('changeValue',updateRepresentation);
			return (mainContainer);
		}
	}
});

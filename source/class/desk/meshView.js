qx.Class.define("desk.meshView", 
{
  extend : qx.ui.window.Window,

	construct : function(file, fileBrowser)
	{
		this.base(arguments);

		this.setLayout(new qx.ui.layout.VBox());
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);
		this.setContentPadding(2);
		this.setCaption(file);

		var pane = new qx.ui.splitpane.Pane("horizontal")
		this.add(pane, {flex : 1});

		this.__iframe = new qx.ui.embed.Iframe().set({
			width: 400,
			height: 400,
			minWidth: 200,
			minHeight: 150,
			decorator:null});
		this.__iframe.setFrameName('o3dframe');
		pane.add(this.__iframe, 1);
		this.open();

		this.__shapesList=new qx.ui.treevirtual.TreeVirtual(["meshes","wireframe"],
			{initiallyHiddenColumns : [1]});
		this.__shapesList.setSelectionMode(qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);
		this.__shapesList.set({
			width  : 50,
			rowHeight: 22,
			columnVisibilityButtonVisible : false,
			draggable : true});
		pane.add(this.__shapesList,0);
		this.__shapesArray=[];


		// context menu to edit meshes appearance
		var menu = new qx.ui.menu.Menu;
		var shapesTree=this.__shapesList;
		var MeshViewer=this;
		var openButton = new qx.ui.menu.Button("Change Colors");
		openButton.addListener("execute", function (){
			var colorsWindow=new qx.ui.window.Window();
			colorsWindow.setLayout(new qx.ui.layout.HBox());
			var colorSelector=new qx.ui.control.ColorSelector()
			colorsWindow.add(colorSelector);//, {flex:1});
			console.log(MeshViewer.__shapesArray);
			console.log(shapesTree.getSelectedNodes());
			var firstSelectedShape=MeshViewer.__shapesArray[shapesTree.getSelectedNodes()[0].nodeId];
			var color=firstSelectedShape.getColor();
			var ratio=255;
			colorSelector.setRed(ratio*color[0]);
			colorSelector.setGreen(ratio*color[1]);
			colorSelector.setBlue(ratio*color[2]);
			var wireframeCheckBox=new qx.ui.form.CheckBox();
			wireframeCheckBox.setValue(firstSelectedShape.isRepresentationWireframe());

			var ratio=255;

			var slider=new qx.ui.form.Slider();
			slider.setMinimum(0);
			slider.setMaximum(ratio);
			slider.setWidth(30);
			slider.setOrientation("vertical");
			colorsWindow.add(slider);
			colorsWindow.add(wireframeCheckBox);
			slider.setValue(color[3]*ratio);
			colorsWindow.open();

			var updateRepresentation=function(event){
				var shapesArray=shapesTree.getSelectedNodes();
				for (var i=0;i<shapesArray.length;i++)
				{
					var shape=MeshViewer.__shapesArray[shapesArray[i].nodeId];
					shape.setColor ([colorSelector.getRed()/ratio,
					colorSelector.getGreen()/ratio,
					colorSelector.getBlue()/ratio,
					slider.getValue()/ratio]);
					shape.setRepresentationToWireframe(wireframeCheckBox.getValue());
				}
				shape.scene.render();
			}

			slider.addListener("changeValue", updateRepresentation);
			colorSelector.addListener("changeValue", updateRepresentation);

			wireframeCheckBox.addListener('changeValue',updateRepresentation);
			}, this);
		menu.add(openButton);
		this.__shapesList.setContextMenu(menu);


		if (qx.core.Environment.get("browser.name")=="firefox")
		{
			// quirk for firefox which oes not handle iframes correctly
			this.__iframe.setSource("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/?empty=true&width=400&height=400");

			this.__iframe.addListenerOnce("load", function(e) { 
			    this.addListener("resize", 
				function(event) {this.__iframe.getWindow().resizeClient(this.getWidth()-7,this.getHeight()-32);},this);
			    }, this);
		}
		else
			this.__iframe.setSource("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/?empty=true");

		this.__iframe.addListenerOnce("load", function(e) {

			var myMeshViewer=this;
			function loadCallback()
			{
				myMeshViewer.__sceneReady=true;
				myMeshViewer.__iframe.getWindow().o3djs.event.addEventListener(myMeshViewer.getScene().o3dElement, 'mousedown', function(){
					var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
					windowManager.bringToFront(myMeshViewer);});
				myMeshViewer.openFile();
			}
			this.__iframe.getWindow().parentCallback=loadCallback;
			this.__iframe.getWindow().init2(loadCallback);

			this.addListener("mouseout", 
				function(event) {this.__iframe.getWindow().g_scene.stopDragging();},this);

			this.addListener("keypress", function(event) {
				console.log(event.getKeyIdentifier());
				if (event.getKeyIdentifier()=="L")
					this.__shapesListWindow.open();
				else
					this.__iframe.getWindow().keyPressed(event.getKeyCode())
				;},this);

			this.addListener("keypress", function(event) {
				if (event.getKeyIdentifier()=="S")
					desk.meshView.LINKEDWINDOW=this;
				},this);

			this.addListener("click", function(event) {
				var window=desk.meshView.LINKEDWINDOW;
				if ((window!=null)&&(window!=this))
				{
					this.__iframe.getWindow().g_scene.bind(window.__iframe.getWindow().g_scene);
					window.__iframe.getWindow().g_scene.bind(this.__iframe.getWindow().g_scene);
					this.__iframe.getWindow().g_scene.cameracontroller.onChange();
					desk.meshView.LINKEDWINDOW=null;
				}},this);

			this.setDroppable(true);
			this.addListener("drop", function(e) {
					var fileBrowser=e.getData("fileBrowser");
					var nodes=fileBrowser.getSelectedNodes();
					var scene=this.getScene();
					var numberOfMeshes=nodes.length;

					for (var i=0;i<nodes.length;i++)
					{
						var fileNode=nodes[i];
						var fileName=fileBrowser.getNodeURL(fileNode);
						scene.loadMesh(fileName, function (shape){
							numberOfMeshes--;
							if (numberOfMeshes==0)
							{							
								scene.cameracontroller.viewAll(scene.meshesBoundingBox,1);
								scene.client.root.localMatrix=scene.cameracontroller.calculateViewMatrix();
								scene.render();
							}
							myMeshViewer.addShape(shape);
							});
					}
					// activate the window
					var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
					windowManager.bringToFront(this);
				}, this);

			    }, this);


		var meshView=this;
		if (fileBrowser!=null)
		{
			this.setCaption(fileBrowser.getNodeURL(file));
			//file is a tree node...
			var node=file;
			var file=fileBrowser.getNodePath(node);
			var extension=file.substring(file.length-4, file.length);
			switch (extension)
			{
			case ".xml":
				this.setCaption(node.label);
				var ajax = new XMLHttpRequest();
				ajax.onreadystatechange = function()
				{
					if(this.readyState == 4 && this.status == 200)
					{
						var sha1=ajax.responseText.split("\n")[0];
						meshView.openFile("\/visu\/visu_cache\/"+sha1+"\/"+"meshes.xml");
					}
					else if (this.readyState == 4 && this.status != 200)
					{
						// fetched the wrong page or network error...
						alert('"Fetched the wrong page" OR "Network error"');
					}
				};
				var label = new qx.ui.basic.Label("Extracting meshes, wait...").set({
					font : new qx.bom.Font(28, ["Verdana", "sans-serif"])
					});
				this.add(label, {flex : 1});
				ajax.open("POST", "\/visu\/desk\/php\/volumeAnalysis.php", true);
				ajax.send(file);
				break;
			case ".ply":
			case ".obj":
			case ".stl":
				var parameterMap={
					"action" : "mesh2vtk",
					"input_file" : file,
					"output_directory" : "cache\/"};
				fileBrowser.getActions().launchAction(parameterMap, getAnswer, this);

				function getAnswer(e)
				{
					var req = e.getTarget();
					var splitResponse=req.getResponseText().split("\n");
					var outputDir=splitResponse[0];
					console.log(req.getResponseText());
					var mtime=splitResponse[splitResponse.length-3];
					meshView.openFile("\/visu\/desk\/php\/"+outputDir+"\/"+"mesh.vtk",mtime);
				}
				break;
			default	:
				alert ("extension "+extension+" not supported for mesh viewer");
			}
		}
		else
		{
			this.setCaption(file);
			this.openFile(file);
		}
		return (this);
	},

	statics : {
		LINKEDWINDOW : null
	},

	members : {
		__iframe : null,
		__fileToOpen : null,
		__fileToOpenMTime : null,
		__sceneReady : null,
		__shapesList : null,
		__shapesArray : null,

		addShape : function (shape) {
			var dataModel=this.__shapesList.getDataModel();
			var leaf=dataModel.addLeaf(null, shape.getSimpleName(), null);
			this.__shapesArray[leaf]=shape;
			dataModel.setData();
			return;
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
					this.__fileToOpen=file;
					this.__fileToOpenMTime=mtime;
				}
				else
				{
					//open the file
					var scene=this.getScene();
					var myMeshViewer=this;
					scene.loadMesh(file, function (shape){
						scene.cameracontroller.viewAll(scene.meshesBoundingBox,1);
						scene.client.root.localMatrix=scene.cameracontroller.calculateViewMatrix();
						scene.render();
						myMeshViewer.addShape(shape);
						}, mtime);
				}
			}
		},

		getScene : function() {
				return this.__iframe.getWindow().g_scene;
		}
	}
});

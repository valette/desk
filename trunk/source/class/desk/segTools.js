/*
#ignore(Uint8Array)
*/

qx.Class.define("desk.segTools",
{
  extend : qx.ui.window.Window,

	construct : function(master, globalFile, appliCallback)
	{	
		this.base(arguments);

		this.__fileSystem=desk.FileSystem.getInstance();

        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }

    ////Global variables ?

		this.__master = master;

		this.__file = globalFile;
		
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		this.__appliCallback = appliCallback;
		
	//// Set window
		this.setLayout(new qx.ui.layout.VBox());
		this.set({
								showMinimize: false,
								showMaximize: false,
								allowMaximize: false,
								showClose: true,
								movable : true,
								caption :"segmentation tool"
							});
		this.setResizable(false, false, false, false);
	//// Fill window with the tools widgets

		this.__buildRightContainer();


		var _this=this;

		var listenersIds=[];
		master.applyToViewers( function () {
			listenersIds[this]=this.addListener("changeSlice", function ( event ) {
				_this.__saveCurrentSeeds();
				_this.__reloadSeedImage( this );
			}, this);
		});

		this.addListener("close", function (e) {
			master.applyToViewers( function () {
				this.removeListenerById(listenersIds[this]);
				this.setPaintMode(false);
				this.setEraseMode(false);
				var canvas=this.getDrawingCanvas();
				canvas.getContext2d().clearRect(0,0,
							canvas.getCanvasWidth(), canvas.getCanvasHeight());
				this.fireEvent("changeDrawing");
			});
		});
		this.__labels=[];
		
		this.open();
		
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		if(typeof this.__appliCallback == "function")
			this.__appliCallback(this.__master, this);
			
//		this.__createLabelsList();
	//// Return the tools window aka : this
		return (this);
		
	},

	statics : {
		filePrefixes : ["seed","correction"],
		seedsListsString : "seedsLists",
		seedsArrayString : "seedsArray",
		cacheTagsArrayString : "cacheTagsArray"
	},

	events : {
		"gotSegmentedVolume" : "qx.event.type.Event",
		"meshViewerCreated" : "qx.event.type.Data"
	},

	properties : {
		sessionDirectory : { init : null, event : "changeSessionDirectory"},
		seedsType : { init : 0, check: "Number", event : "changeSeedsType"}
	},

	members :
	{
		__defaultColorsFile : "data/xml/colorsKneeAdvanced.xml",
		__master : null,
		__file : null,
		__fileSystem : null,

		__topRightContainer : null,
		__bottomRightContainer : null,
		__mainBottomRightContainer : null,
		__colorsContainer : null,
		__seedsTypeSelectBox : null,

		__startSegmentationButton : null,

// Tableau contenant les couleurs des seeds
         __labels : null,

// type arrays containing seeds colors (for speed processing)
         __labelColorsRed : null,
         __labelColorsGreen : null,
         __labelColorsBlue : null,

		__compactLabelsRed : null,
		__compactLabelsGreen : null,
		__compactLabelsBlue : null,

		__penSize : null,
		__eraserButton : null,
		__eraserCursor : null,
		
		getMeshViewer : function()
		{
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			return this.__meshViewer;
		},
		
		__reloadSeedImage : function (sliceView) {
			if (this.getSessionDirectory()==null)
				return;
			var _this=this;
			var canvas=sliceView.getDrawingCanvas();
			var width=canvas.getCanvasWidth()
			var height=canvas.getCanvasHeight()

			var context=canvas.getContext2d();
			context.clearRect(0, 0, width, height);
			var seedsType=_this.getSeedsType();
			var seedsList=sliceView.getUserData(desk.segTools.seedsListsString)[seedsType];
			var seedsArray=seedsList.getUserData(desk.segTools.seedsArrayString);
			var cacheTagsArray=seedsList.getUserData(desk.segTools.cacheTagsArrayString);
			var sliceId=sliceView.getSlice();

			if (seedsArray[sliceId]!=0) {
				var imageLoader= new Image();
				seedsList.setSelection([seedsArray[sliceId]]);
				imageLoader.onload=function(){
					context.drawImage(imageLoader, 0, 0);
					sliceView.fireEvent("changeDrawing");
					imageLoader.onload=0;
				}
				imageLoader.src=_this.__fileSystem.getFileURL(_this.getSessionDirectory())+"/"+
								_this.__getSeedFileName ( sliceView, sliceId, seedsType)+"?nocache="+
								cacheTagsArray[sliceId];
			}
			else {
				seedsList.resetSelection();
				sliceView.fireEvent("changeDrawing");
			}
		},

		__buildRightContainer : function()
		{	
			var tools = this;
			
			var theMaster = tools.__master;
			
			var volFile = tools.__file;
			
			var fileSystem = this.__fileSystem;
			
			
			var spacing=5;
			
			var tRCL=new qx.ui.layout.HBox();
			tRCL.setSpacing(spacing);
			tools.__topRightContainer = new qx.ui.container.Composite(tRCL);

			var bRCL=new qx.ui.layout.HBox();
			bRCL.setSpacing(spacing);
			tools.__bottomRightContainer= new qx.ui.container.Composite(bRCL);

		////Create pen size chose widget
            tools.__penSize = new qx.ui.form.Spinner().set({
                minimum: 1,
                maximum: 100,
                value: 1
            });
			
            this.__penSize.addListener("changeValue", function(event)
			{
					this.__master.applyToViewers(function () {
						this.setPaintWidth(event.getData());
					});
				}, this);
            this.__penSize.setValue(5);
			
			var penLabel = new qx.ui.basic.Label("Brush : ");
			this.__topRightContainer.add(penLabel);
			this.__topRightContainer.add(tools.__penSize);
			
		////Create eraser on/off button
            tools.__eraserButton = new qx.ui.form.ToggleButton("Eraser");
			
			this.__eraserButton.addListener("changeValue", function(e)
			{
				this.__master.applyToViewers(function () {
					this.setEraseMode(e.getData());
					});
				}, this);

			tools.__topRightContainer.add(tools.__eraserButton);

			
		////Create test Marks on/off button
            tools.__marksButton = new qx.ui.form.ToggleButton("Marks");
			
			this.__marksButton.addListener("changeValue", function(e)
			{
				this.__master.applyToViewers(function () {
					this.__markerObject.setMarkMode(e.getData());
					});
			}, this);

			tools.__topRightContainer.add(tools.__marksButton);
			var master = this.__master;
			this.__master.applyToViewers( function()
			{
				this.__markerObject = new desk.Markers(this, master);
				this.getMarkerObject = function() {
					return this.__markerObject;
				};
			} );
			
			
		////Create labels zone
			var paintPage = new qx.ui.tabview.Page("paint");
			var paintPageLayout=new qx.ui.layout.VBox();
			paintPageLayout.setSpacing(5);
            paintPage.setLayout(paintPageLayout);
			paintPage.add(tools.__topRightContainer);

			tools.__colorsContainer=new qx.ui.container.Composite();
            tools.__colorsContainer.setLayout(new qx.ui.layout.Grid(1,1));

			tools.__colorsContainer.setDroppable(true);
			tools.__colorsContainer.addListener("drop", function(e) {
				if (e.supportsType("fileBrowser"))
				{
					var fileBrowser=e.getData("fileBrowser");
					var fileNode=fileBrowser.getSelectedNodes()[0];
					var fileName=fileBrowser.getNodeFile(fileNode);
					this.__loadColors(fileName);
				}
			}, this);

			paintPage.add(tools.__colorsContainer);

			var bRCL=new qx.ui.layout.HBox();
			bRCL.setSpacing(spacing);
			tools.__mainBottomRightContainer = new qx.ui.container.Composite(bRCL);
			
			var tabView = new qx.ui.tabview.TabView();
			tools.__tabView=tabView;
            tabView.add(paintPage);
			tabView.setVisibility("excluded");

			var sessionWdgt = tools.__getSessionsWidget();
			this.__addSeedsListsToViews();
			this.add(sessionWdgt);
			
			this.add(tools.__mainBottomRightContainer, {flex : 1});

			tools.__mainBottomRightContainer.add(tabView);
			
			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("Opacity :");
			tools.__topRightContainer.add(whileDrawingDrwngOpacityLabel);
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
			whileDrawingDrwngOpacitySlider.setValue(100);
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
				this.__master.applyToViewers(function () {
					this.setPaintOpacity(event.getData()/100);
					});
			},this);

            this.__topRightContainer.add(whileDrawingDrwngOpacitySlider, {flex : 1});

			paintPage.add(this.__bottomRightContainer);

			var clusteringPage = new qx.ui.tabview.Page("clustering");
            clusteringPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(clusteringPage);
			var clusteringAction=new desk.action("cvtseg2", false);
			clusteringAction.setActionParameters(
				{"input_volume" : volFile});

			clusteringAction.setOutputSubdirectory("clustering");
			
			clusteringAction.buildUI();
			clusteringPage.add(clusteringAction);

			var segmentationPage = new qx.ui.tabview.Page("segmentation");
            segmentationPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(segmentationPage);
			var segmentationAction=new desk.action("cvtgcmultiseg", false);
			clusteringAction.setActionParameters({
				"input_volume" : volFile});

			segmentationAction.setOutputSubdirectory("segmentation");
			segmentationAction.connect("clustering", clusteringAction, "clustering-index.mhd");
			
			segmentationAction.buildUI();
			segmentationPage.add(segmentationAction);

			var medianFilteringPage = new qx.ui.tabview.Page("cleaning");
            medianFilteringPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(medianFilteringPage);
			var medianFilteringAction=new desk.action("volume_median_filtering", false);
			medianFilteringAction.setOutputSubdirectory("filtering");
			medianFilteringAction.connect("input_volume", 
										segmentationAction, "seg-cvtgcmultiseg.mhd");
			medianFilteringAction.buildUI();
			medianFilteringPage.add(medianFilteringAction);

			var meshingPage = new qx.ui.tabview.Page("meshing");
            meshingPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(meshingPage);
			var meshingAction=new desk.action("extract_meshes", false);
			meshingAction.setOutputSubdirectory("meshes");
			meshingAction.buildUI();
			meshingPage.add(meshingAction);

			tools.addListener("changeSessionDirectory", function (e)
			{
				var directory=e.getData();
				medianFilteringAction.setOutputDirectory(directory);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
				if (segmentationToken!=null)
					theMaster.removeVolume(segmentationToken);
				clusteringAction.setOutputDirectory(directory);
				segmentationAction.setOutputDirectory(directory);
				meshingAction.setOutputDirectory(directory);
				segmentationAction.setActionParameters({
					"input_volume" : volFile,
					"seeds" : tools.getSessionDirectory()+"/seeds.xml"});
				clusteringAction.setActionParameters({
					"input_volume" : volFile});
				meshingAction.setActionParameters({
					"input_volume" : tools.getSessionDirectory()+"/filtering/output.mhd",
					"colors" : tools.getSessionDirectory()+"/seeds.xml"});
			});

			tools.__startSegmentationButton=new qx.ui.form.Button("Start segmentation");
			tools.__startSegmentationButton.addListener("execute", function ()
			{
				tools.__startSegmentationButton.setEnabled(false);
				tools.__segmentationInProgress=true;
				tools.__saveCurrentSeeds(function() {
							medianFilteringAction.executeAction();});
			}, this);
			tools.__bottomRightContainer.add(tools.__startSegmentationButton);

			var meshingButton=new qx.ui.form.Button("extract meshes");
			tools.__extractMeshesButton=meshingButton;
			meshingButton.addListener("execute", function () {
				tools.__startSegmentationButton.setEnabled(false);
				meshingButton.setEnabled(false);
				meshingAction.executeAction();
				}, this);
			tools.__bottomRightContainer.add(meshingButton);

			var segmentationToken=null;
			medianFilteringAction.addListener("actionUpdated", function ()
			{
				tools.__startSegmentationButton.setEnabled(true);
				if (segmentationToken==null)
				{
					segmentationToken=theMaster.addVolume(medianFilteringAction.getOutputDirectory()+"/output.mhd",
								{opacity : 0.5, imageFormat : 0,
								colors : [tools.__labelColorsRed, tools.__labelColorsGreen, tools.__labelColorsBlue]});
				}
				else
				{
					theMaster.updateVolume(segmentationToken);
				}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
				tools.fireEvent("gotSegmentedVolume");
			}, this);

			tools.__master.addListener("removeVolume", function (e) {
				if (e.getData()==segmentationToken) {
					segmentationToken=null;
				}
			});

			var meshViewer=null;

			meshingAction.addListener("actionUpdated", function ()
			{
				meshingButton.setEnabled(true);
				tools.__startSegmentationButton.setEnabled(true);
				if (meshViewer==null) {
					meshViewer=new desk.meshView(tools.getSessionDirectory()+
						"/meshes/meshes.xml");
					meshViewer.addListener("close", function () {
						meshViewer=null;
					})
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
					tools.fireDataEvent("meshViewerCreated", meshViewer);
				}
				else {
					meshViewer.update();
				}
				this.__meshViewer = meshViewer;
			}, this);

			tools.__seedsTypeSelectBox = tools.__getSeedsTypeSelectBox();
			paintPage.addAt(tools.__seedsTypeSelectBox,0);
		},

		__rebuildLabelsList : function () {
			var colors=this.__labels;
			var row=0;
			var column=0;
			var numberOfColumns=4;
			this.__colorsContainer.removeAll();
			for (var i=0;i<colors.length;i++) {	
				var labelBox=colors[i].container;
				this.__colorsContainer.add(labelBox, {column: column, row: row});
				column++;
				if (column>=numberOfColumns) {
					column=0;
					row++;
				}
			}
			this.__buildLookupTables();
		},

		__buildLookupTables : function () {
			var red=new Uint8Array (256);
			var green=new Uint8Array (256);
			var blue=new Uint8Array (256);
			this.__labelColorsRed=red;
			this.__labelColorsGreen=green;
			this.__labelColorsBlue=blue;
			var i;
			for (i=0;i<256;i++) {
				red[i]=0;
				green[i]=0;
				this.__labelColorsBlue[i]=0;
			}
			var colors=this.__labels;

			// build compact lookuptables for seeds processing
			var cRed=new Uint8Array (colors.length);
			this.__compactLabelsRed=cRed;
			var cGreen=new Uint8Array (colors.length);
			this.__compactLabelsGreen=cGreen;
			var cBlue=new Uint8Array (colors.length);
			this.__compactLabelsBlue=cBlue;

			for (i=0;i<colors.length;i++) {
				var label=colors[i].label;
				red[label]=colors[i].red;
				green[label]=colors[i].green;
				blue[label]=colors[i].blue;

				cRed[i]=colors[i].red;
				cGreen[i]=colors[i].green;
				cBlue[i]=colors[i].blue;
			}
		},

		__setColorsFromElements : function (colors, adjacencies) {
			if (colors.length==0) {
				alert("error : no colors");
				return;
			}

			for (var i=0;i<this.__labels.length;i++) {
				this.__labels[i].dispose();
			}
			this.__labels=[];
			for(var i=0; i<colors.length; i++)
			{
				var color=colors[i];
				var label=parseInt(color.getAttribute("label"),10)
				var colorName=color.getAttribute("name");
				var red=parseInt(color.getAttribute("red"));
				var green=parseInt(color.getAttribute("green"));
				var blue=parseInt(color.getAttribute("blue"));
				var mColor=[];
				if (color.hasAttribute("meshcolor")) {
					mColor=color.getAttribute("meshcolor").split(" ");
					mColor[0]=Math.round(parseFloat(mColor[0])*255);
					mColor[1]=Math.round(parseFloat(mColor[1])*255);
					mColor[2]=Math.round(parseFloat(mColor[2])*255);
					mColor[3]=parseFloat(mColor[3]);
					mColor[4]=parseInt(mColor[4]);
				}
				else {
					mColor=[255, 255, 255, 1, 0];
				}
				
				this.__addColorItem(label, colorName, red, green, blue,
						mColor[0],mColor[1],mColor[2],mColor[3],mColor[4]);
			}
			this.__rebuildLabelsList();
			for (var i=0;i<adjacencies.length;i++)
			{
				var adjacency=adjacencies[i];
				this.__addEdge(this.__getLabel(adjacency.getAttribute("label1")),
						this.__getLabel(adjacency.getAttribute("label2")));
			}
		},

		__loadColors : function (file) {
			if (file==null) {
				file=this.__defaultColorsFile;
			}
			var tools=this;
		////Fill labels zone width data from the xml file

			var colorsParamRequest = new XMLHttpRequest();
			colorsParamRequest.onreadystatechange = function()
			{
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(this.responseXML!=null)
					{
						var response = this.responseXML;
						tools.__setColorsFromElements(response.getElementsByTagName("color"),
								response.getElementsByTagName("adjacency"));

					}
					else
						alert("Global Params : Failure...");
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					// fetched the wrong page or network error...
					alert('Global Params : "Fetched the wrong page" OR "Network error"');
				}
			};
			colorsParamRequest.open("GET",
				this.__fileSystem.getFileURL(file)+"?nocache="+Math.random(), true);
			colorsParamRequest.send(null);
		},

		__targetColorItem : null,
		__editionWindow : null,
		__updateEditionWindow : null,

		__createEditionWindow : function () {
			var window=new qx.ui.window.Window();
			window.setLayout(new qx.ui.layout.VBox());
			window.setShowClose(true);
			window.setShowMinimize(false);
			window.setUseMoveFrame(true);
			window.setCaption("label editor");
			window.setResizable(false, false, false, false);

			var topContainer=new qx.ui.container.Composite();
			topContainer.setLayout(new qx.ui.layout.HBox());
			window.add(topContainer);

			var topLeftContainer=new qx.ui.container.Composite();
			topLeftContainer.setLayout(new qx.ui.layout.VBox());
			topContainer.add(topLeftContainer);
			topContainer.add(new qx.ui.core.Spacer(50), {flex: 5});

			var topRightContainer=new qx.ui.container.Composite();
			topRightContainer.setLayout(new qx.ui.layout.VBox());
			topContainer.add(topRightContainer);


			var doNotUpdate=false;

			var labelDisplay=new qx.ui.basic.Label("Label :");
			topLeftContainer.add(labelDisplay);
			var labelValue=new qx.ui.form.TextField();
			labelValue.addListener("changeValue", function (e) {
				var target=this.__targetColorItem;
				if ((target!=null)&&!doNotUpdate)
				{
					target.label=parseInt(labelValue.getValue());
					target.updateWidget();
				}
				var count=0;
				for (var i=0;i<this.__labels.length;i++) {
					if (this.__labels[i].label==target.label) {
						count++;
					}
				}
				if (count>1) {
					labelDisplay.setBackgroundColor("red");
					labelValue.setToolTipText("This label already exists");
					alert("This label already exists");
				}
				else {
					labelDisplay.setBackgroundColor("transparent");
					labelValue.resetToolTipText();
				}
			}, this);
			topLeftContainer.add(labelValue);
			topLeftContainer.add(new qx.ui.core.Spacer(), {flex: 5});


			var label1=new qx.ui.basic.Label("Name :");
			topLeftContainer.add(label1);
			var labelName=new qx.ui.form.TextField();
			if (this.__targetColorItem!=null) {
				labelName.setValue(this.__targetColorItem.labelName);
			}

			labelName.addListener("changeValue", function (e) {
				var target=this.__targetColorItem;
				if ((target!=null)&&!doNotUpdate)
				{
					target.labelName=labelName.getValue();
					target.updateWidget();
				}
			}, this);
			topLeftContainer.add(labelName);
			topLeftContainer.add(new qx.ui.core.Spacer(), {flex: 5});

			var colorContainer=new qx.ui.container.Composite();
			colorContainer.setLayout(new qx.ui.layout.HBox());
			window.add(new qx.ui.core.Spacer(0, 30), {flex: 5});
			window.add(colorContainer);

			var colorSelector=new qx.ui.control.ColorPopup();
			colorSelector.addListener("changeValue", function (e) {
				var target=this.__targetColorItem;
				if ((target!=null)&&!doNotUpdate)
				{
					target.red=colorSelector.getRed();
					target.green=colorSelector.getGreen();
					target.blue=colorSelector.getBlue();
					target.updateWidget();
			        colorView.setBackgroundColor(e.getData());
					this.__master.applyToViewers( function () {
						this.setPaintColor(colorSelector.getValue());
					});
				}
			}, this);
			colorSelector.exclude();

			var colorButton = new qx.ui.form.Button("Choose color");
			colorButton.addListener("execute", function(e)
			{
				colorSelector.placeToWidget(colorButton);
				colorSelector.show();
			});

			var colorView = new qx.ui.basic.Label("Color").set({
				padding : [3, 60],
				decorator : "main"
			});

			colorContainer.add(colorView, {flex : 1});
			colorContainer.add(colorButton, {flex : 1});

			var label3=new qx.ui.basic.Label("Adjacent labels :");
			topRightContainer.add(label3);

			var container=new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.HBox());
			topRightContainer.add(container);

			var container2=new qx.ui.container.Composite();
			container2.setLayout(new qx.ui.layout.VBox());
			container.add(container2);

			var adjacenciesField = new qx.ui.form.List().set(
				{droppable : true, height : 120, selectionMode : "multi"});
			adjacenciesField.addListener("drop", function(e) {
				if (e.supportsType("segmentationLabel"))
				{
					var label=e.getData("segmentationLabel");
					this.__addEdge(label, this.__targetColorItem);
					__updateAdjacenciesText();
				}
			}, this);

			container2.add(adjacenciesField, {flex : 2});

			var _this=this;

			function __updateAdjacenciesText () {
				var adjacencies=_this.__targetColorItem.adjacencies;
				var children=adjacenciesField.getChildren();
				while (children.length>0) {
					children[0].destroy();
				}

				for (var i=0;i<adjacencies.length;i++) {
					var neighbour=adjacencies[i];
					var listItem=new qx.ui.form.ListItem(neighbour.label+" : "+neighbour.labelName);
					listItem.setUserData("AdjacenciesItem", neighbour);
					adjacenciesField.add(listItem);
				}
			}

			var removeButton=new qx.ui.form.Button("Remove Selection");
			removeButton.addListener("execute", function () {
				var selection=adjacenciesField.getSelection();
				for (var i=0;i<selection.length;i++) {
					this.__removeEdge(selection[i].getUserData("AdjacenciesItem"), this.__targetColorItem);
				}
				__updateAdjacenciesText();
			}, this);
			container2.add(removeButton);

			var meshColorContainer=new qx.ui.container.Composite();
			meshColorContainer.setLayout(new qx.ui.layout.HBox());

			var meshColorSelector=new qx.ui.control.ColorPopup();
			meshColorSelector.addListener("changeValue", function (e) {
				var target=this.__targetColorItem;
				if ((target!=null)&&!doNotUpdate)
				{
					target.meshRed=meshColorSelector.getRed();
					target.meshGreen=meshColorSelector.getGreen();
					target.meshBlue=meshColorSelector.getBlue();
			        meshColorView.setBackgroundColor(e.getData());
				}
			}, this);
			colorSelector.exclude();

			var meshColorButton = new qx.ui.form.Button("Choose color");
			meshColorButton.addListener("execute", function(e)
			{
				meshColorSelector.placeToWidget(meshColorButton);
				meshColorSelector.show();
			});

			var meshColorView = new qx.ui.basic.Label("Mesh color").set({
				padding : [3, 60],
				decorator : "main"
			});

			meshColorContainer.add(meshColorView, {flex : 1});
			meshColorContainer.add(meshColorButton, {flex : 1});

			window.add(new qx.ui.core.Spacer(0, 30), {flex: 5});
			window.add(meshColorContainer);

			var meshPropertiesContainer=new qx.ui.container.Composite();
			meshPropertiesContainer.setLayout(new qx.ui.layout.HBox());
			window.add(meshPropertiesContainer);

			var opacityContainer=new qx.ui.container.Composite();
			opacityContainer.setLayout(new qx.ui.layout.VBox());
			meshPropertiesContainer.add(opacityContainer);
			meshPropertiesContainer.add(new qx.ui.core.Spacer(50), {flex: 5});
			var depthContainer=new qx.ui.container.Composite();
			depthContainer.setLayout(new qx.ui.layout.VBox());
			meshPropertiesContainer.add(depthContainer);

			opacityContainer.add(new qx.ui.basic.Label("Mesh opacity :"));
			var meshOpacity=new qx.ui.form.TextField("1");
			meshOpacity.addListener("changeValue", function (e) {
				var target=this.__targetColorItem;
				if ((target!=null)&&!doNotUpdate)
				{
					target.opacity=parseFloat(meshOpacity.getValue());
				}
			}, this);
			opacityContainer.add(meshOpacity);

			depthContainer.add(new qx.ui.basic.Label("Mesh depth :"));
			var meshDepth=new qx.ui.form.Spinner(-100, 0, 100);
			meshDepth.setToolTipText("change this field to solve problems with transparency");
			meshDepth.addListener("changeValue", function (e) {
				var target=this.__targetColorItem;
				if ((target!=null)&&!doNotUpdate)
				{
					target.depth=meshDepth.getValue();
				}
			}, this);
			depthContainer.add(meshDepth);



			this.__editionWindow=window;

			var _this=this;
			this.__updateEditionWindow=function (e) {
				var target=this.__targetColorItem;
				if (target!=null) {
					doNotUpdate=true;
					labelValue.setValue(target.label+"");
					labelName.setValue(target.labelName);
					colorSelector.setRed(target.red);
					colorSelector.setGreen(target.green);
					colorSelector.setBlue(target.blue);
					colorView.setBackgroundColor(qx.util.ColorUtil.rgbToHexString
							([target.red, target.green, target.blue]));
					meshColorSelector.setRed(target.meshRed);
					meshColorSelector.setGreen(target.meshGreen);
					meshColorSelector.setBlue(target.meshBlue);
					meshColorView.setBackgroundColor(qx.util.ColorUtil.rgbToHexString
							([target.meshRed, target.meshGreen, target.meshBlue]));
					meshOpacity.setValue(target.opacity+"");
					meshDepth.setValue(target.depth);
					this.__buildLookupTables();
					doNotUpdate=false;
					__updateAdjacenciesText();
				}
			}
		},

		__getLabel : function (label) {
			var intLabel=parseInt(label);
			var labels=this.__labels;
			for (var i=0;i<labels.length;i++) {
				if (labels[i].label==intLabel) {
					return (labels[i]);
				}
			}
			alert("error : label "+label+" does not exist!");				
			return (false);
		},

		__deleteColorItem : function (item) {
			var colors=this.__labels;
			for (var i=0;i<colors.length;i++) {
				if (colors[i]==item) {
					colors.splice(i,1);
					this.__rebuildLabelsList();
					item.dispose();
					this.__eraserButton.removeListenerById(item.listenerId);
					return;
				}
			}
		},

		__addEdge : function (label1, label2) {
			if (label1==label2) {
				alert ("error : trying to create self-loop adjacency : "+
						label1.label+"-"+label2.label);
				return;
			}
			var adjacencies=label1.adjacencies;
			var found=false;
			for (var i=0;i<adjacencies.length;i++) {
				if (adjacencies[i].label==label2.label) {
					found=true;
					break;
				}
			}

			if (found) {
				alert ("Error : adjacency "+label1.label+"-"+label2.label+" already exists");
				return;
			}
			this.__addAdjacency(label1, label2);
			this.__addAdjacency(label2, label1);
		},

		__removeEdge : function (label1, label2) {
			var adjacencies=label1.adjacencies;
			var found=false;
			for (var i=0;i<adjacencies.length;i++) {
				if (adjacencies[i]==label2) {
					found=true;
				}
			}

			if (!found) {
				alert ("error : adjacency "+label1.label+"-"+label2.label+" does not exist");
				return;
			}
			this.__removeAdjacency(label1, label2);
			this.__removeAdjacency(label2, label1);

		},

		__addAdjacency : function (label1,label2) {
			var adjacencies=label1.adjacencies;
			var label=label2.label;
			for (var i=0;i<adjacencies.length;i++){
				if (label<adjacencies[i].label) {
					adjacencies.splice(i,0,label2);
					return;
				}
			}
			adjacencies.push(label2);
		},

		__removeAdjacency : function (label1,label2) {
			var adjacencies=label1.adjacencies;
			for (var i=0;i<adjacencies.length;i++){
				if (label2==adjacencies[i]) {
					adjacencies.splice(i,1);
					return;
				}
			}
			alert ("error : adjacency to remove not found...");
		},

		__addColorItem : function(label, labelName, red, green, blue,
					meshRed, meshGreen, meshBlue, opacity, depth)
        {
		////Function creates one label box
			var unfocusedBorder = new qx.ui.decoration.Single(2, "solid", "black");
            var focusedBorder = new qx.ui.decoration.Single(3, "solid", "red");
			var boxWidth = 80;

            var labelLayout = new qx.ui.layout.VBox();
            labelLayout.setSpacing(4);
			var labelBox = new qx.ui.container.Composite().set({
                layout : labelLayout,
                allowGrowX: false,
                allowGrowY: false,
                width: boxWidth,
                height: 53,
                decorator: unfocusedBorder,
                backgroundColor: "background-light",
                focusable : true
            });
			var colorBox = new qx.ui.container.Composite().set({
                maxWidth: boxWidth-12,
                height: 25,
                alignX : "center"});

			var listenerId=this.__eraserButton.addListener("changeValue", function (e) {
				if (e.getData())
				{
					labelBox.set({decorator: unfocusedBorder, backgroundColor: "background-light"});
				}
			}, this);

			labelBox.addListener("click", function(e)
			{
				this.__targetColorItem=labelAttributes;
				if (this.__editionWindow!=null) {
						this.__updateEditionWindow();
				}

				var children = this.__colorsContainer.getChildren();
				var paint;
				if (!(labelBox.getBackgroundColor()=="white"))
				{
					labelBox.set({decorator: focusedBorder, backgroundColor: "white"});
					for(var k=0; k<children.length; k++)
					{
						if(children[k]!=labelBox)
						{
							children[k].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
						}
					}
					paint=true;
					this.__eraserButton.setValue(false);
				}
				else
				{
					labelBox.set({decorator: unfocusedBorder, backgroundColor: "background-light"});
					paint=false
				}

				this.__master.applyToViewers( function () {
					this.setPaintColor(colorBox.getBackgroundColor());
					this.setPaintMode(paint);
					});
            }, this);

			labelBox.setDraggable(true);
			labelBox.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("segmentationLabel");
			}, this);
			labelBox.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					switch (type)
					{
					case "segmentationLabel":
						e.addData(type, labelAttributes);
						break;
					default :
						alert ("type "+type+"not supported for labels drag and drop");
					}
			}, this);


			var boxLabel = new qx.ui.basic.Label().set({alignX:"left"});
			labelBox.add(boxLabel);
			labelBox.add(colorBox);

			var labelAttributes={
				red : red,
				green : green,
				blue : blue,
				meshRed : meshRed,
				meshGreen : meshGreen,
				meshBlue : meshBlue,
				opacity : opacity,
				depth : depth,
				label : label,
				labelName : labelName,
				container : labelBox,
				listenerId : listenerId,
				adjacencies : [],
				updateWidget : function () {
					colorBox.setBackgroundColor(
						qx.util.ColorUtil.rgbToRgbString([labelAttributes.red,
															labelAttributes.green,
															labelAttributes.blue]));
					boxLabel.setValue(" "+labelAttributes.label + " : " + labelAttributes.labelName);
					
				}};
			labelAttributes.updateWidget();

			this.__labels.push(labelAttributes);

			//context menu to edit labels
			var menu = new qx.ui.menu.Menu;
			var editButton = new qx.ui.menu.Button("edit");
			editButton.addListener("execute", function () {
				if (this.__editionWindow==null) {
					this.__createEditionWindow();
				}
				this.__editionWindow.open();
				this.__targetColorItem=labelAttributes;
				this.__updateEditionWindow();
				},this);
			menu.add(editButton);

			var reorderButton = new qx.ui.menu.Button("reorder labels");
			reorderButton.addListener("execute", this.__createReorderingWindow, this);
			menu.add(reorderButton);

			var addButton = new qx.ui.menu.Button("add new label");
			addButton.addListener("execute", function (){
				var colors=this.__labels;
				var maxLabel=0;
				for (var i=0;i<colors.length;i++) {
					if (colors[i].label>maxLabel) {
						maxLabel=colors[i].label;
					}
				}
				this.__addColorItem (maxLabel+1, "edit me", 100, 100, 100,
								100, 100, 100, 1, 0)
				this.__rebuildLabelsList();
				},this);
			menu.add(addButton);

			var removeButton = new qx.ui.menu.Button("remove");
			removeButton.addListener("execute", function (){
				this.__deleteColorItem(labelAttributes);
				},this);
			menu.add(removeButton);
			labelBox.setContextMenu(menu);

			labelAttributes.dispose=function () {
				labelBox.destroy();
				unfocusedBorder.dispose();
				focusedBorder.dispose();
				labelLayout.dispose();
				colorBox.destroy();
				boxLabel.destroy();
				menu.destroy();
				addButton.destroy();
				editButton.destroy();
				removeButton.destroy();
			}
        },

		loadSession : function()
		{
			this.__clearSeeds();
			var master=this.__master;
			var _this=this;

			master.applyToViewers ( function () {
				this.setUserData("previousSlice", this.getSlice());
			});

			var loadSessionRequest = new XMLHttpRequest();
			
			loadSessionRequest.onreadystatechange = function( ) {
				 if(this.readyState == 4 && this.status == 200) {
					// so far so good
					if(this.responseXML!=null) {
						var response = this.responseXML;
						for (var k=0;k<2;k++) {
							var slices;
							if (k==0) {
								slices=response.getElementsByTagName("seed");
							}
							else {
								slices=response.getElementsByTagName("correction");
							}

							for(var j=0; j<slices.length; j++) {
								var sliceId = parseInt(slices[j].getAttribute("slice"),10);
								var sliceOrientation;
								if (slices[j].hasAttribute("orientation")){
									sliceOrientation = parseInt(slices[j].getAttribute("orientation"),10);
								}
								else {
									sliceOrientation = 0;
								}
								master.applyToViewers ( function () {
									if(sliceOrientation==this.getOrientation())
										_this.__addNewSeedItemToList(this, sliceId, k);
									});
							}
						master.applyToViewers( function () {
								_this.__reloadSeedImage( this );
							});
						}
						var colors=response.getElementsByTagName("color");
						var adjacencies=response.getElementsByTagName("adjacency");
						if (colors.length>0) {
							_this.__setColorsFromElements(colors, adjacencies);
						}
						else {
							_this.__loadColors();
						}
					}
					else {
						alert("no seeds found");
						_this.__loadColors();
						master.applyToViewers( function () {
								_this.__reloadSeedImage( this );
							});
					}
				}
				else if (this.readyState == 4 && this.status != 200) {
					alert("no seeds found");
					_this.__loadColors();
					master.applyToViewers( function () {
						_this.__reloadSeedImage( this );
						});
				}
			};

			loadSessionRequest.open("GET",
				this.__fileSystem.getFileURL(
					this.getSessionDirectory()+"/seeds.xml?nocache="+Math.random()), true);
			loadSessionRequest.send(null);
		},

		__getSessionsWidget : function()
		{	
			var tools = this;
			var volFile = this.__file;
			var fileSystem = this.__fileSystem;
			
			var sessionsListLayout=new qx.ui.layout.HBox();
			sessionsListLayout.setSpacing(4);
			var sessionsListContainer=new qx.ui.container.Composite(sessionsListLayout);
			var sessionsListLabel=new qx.ui.basic.Label("Sessions : ");
			//~ sessionsListContainer.add(new qx.ui.core.Spacer(), {flex: 5}); // commented for oneFitAppli
			sessionsListContainer.add(sessionsListLabel);
			var button=new qx.ui.form.Button("new session");
			sessionsListContainer.add(button);

			var sessionType="gcSegmentation";
			var sessionsList = new qx.ui.form.SelectBox();
			sessionsListContainer.add(sessionsList);
			//~ sessionsListContainer.add(new qx.ui.core.Spacer(), {flex: 5});  // commented for oneFitAppli

			var updateInProgress=false;

			function updateList(sessionIdToSelect) {
				updateInProgress=true;
				var buildSessionsItems =function (sessions)
				{
					var sessionItemToSelect=null;
					sessionsList.removeAll();
					for (var i=0; i<sessions.length; i++)
					{
						var sessionId=sessions[i];
						var sessionItem = new qx.ui.form.ListItem(""+sessionId);
						sessionsList.add(sessionItem);
						if (sessionId==sessionIdToSelect)
							sessionItemToSelect=sessionItem;
					}

					if (sessionIdToSelect==null)
					{
						var dummyItem = new qx.ui.form.ListItem("select a session");
						sessionsList.add(dummyItem);
						dummyItem.setUserData("dummy",true);
					}
					if (sessionItemToSelect!=null)
					{
						sessionsList.setSelection([sessionItemToSelect]);
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileSystem.getSessionDirectory(
							volFile,sessionType,sessionIdToSelect));
						tools.__clearSeeds();
						tools.__loadColors();
					}
					else
						sessionsList.setSelection([dummyItem]);					
					updateInProgress=false;
				};

				fileSystem.getFileSessions(volFile, sessionType, buildSessionsItems);
			}
			
			sessionsList.addListener("changeSelection", function(e)
			{
				if (!updateInProgress)
				{
					var listItem=sessionsList.getSelection()[0];
					if (listItem.getUserData("dummy")!=true)
					{
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileSystem.getSessionDirectory(
							volFile,sessionType,listItem.getLabel()));
						tools.loadSession();
					}
					sessionsList.close();
				}
			});

			button.addListener("execute", function (e){
				this.__fileSystem.createNewSession(volFile,sessionType, updateList);
				}, this);

			updateList();
			return sessionsListContainer;
		},

		__saveCurrentSeeds : function(callback) {

			if (this.getSessionDirectory()==null)
				return;

			var numberOfRemainingSaves=1+this.__master.getViewers().length;

			function savecallback () {
				numberOfRemainingSaves--;
				if ((numberOfRemainingSaves==0)&&
					(typeof callback =="function")) {
						callback();
					}
			}
			
        	var wasAnySeedModified=false;
        	var _this=this;
			this.__master.applyToViewers ( function ( ) {
				var base64Img=_this.__getNewSeedsImage ( this );
				if ( base64Img!=false ) {
					// save image
					var sliceId=this.getUserData( "previousSlice" );
					var seedsType=_this.getSeedsType();

					_this.__addNewSeedItemToList ( this, sliceId, seedsType );
					wasAnySeedModified=true;

					var parameterMap={
					action : "write_binary",
					file_name : _this.__getSeedFileName (this, sliceId, seedsType),
					base64data : base64Img,
					output_directory : _this.getSessionDirectory()};
					desk.actions.getInstance().launchAction(parameterMap, savecallback);
				}
				else {
					savecallback();
				}
				this.setUserData("previousSlice", this.getSlice());
				this.setDrawingCanvasNotModified();
			});
			if (wasAnySeedModified) {
				this.__saveSeedsXML(savecallback);
			}
			else {
				savecallback();
			}
		},

		////Rewrite xml list of the drawn seeds
		__saveSeedsXML : function(callback) {
               // XML writer with attributes and smart attribute quote escaping
			/*
				Format a dictionary of attributes into a string suitable
				for inserting into the start tag of an element.  Be smart
			   about escaping embedded quotes in the attribute values.
			*/
			function formatAttributes (attributes) {
				var APOS = "'";
				var QUOTE = '"';
				var ESCAPED_QUOTE = {  };
				ESCAPED_QUOTE[QUOTE] = '&quot;';
				ESCAPED_QUOTE[APOS] = '&apos;';
				var att_value;
				var apos_pos, quot_pos;
				var use_quote, escape;
				var att_str;
				var re;
				var result = '';
				for (var att in attributes) {
					att_value = attributes[att];
					// Find first quote marks if any
					apos_pos = att_value.indexOf(APOS);
					quot_pos = att_value.indexOf(QUOTE);
					// Determine which quote type to use around 
					// the attribute value
					if (apos_pos == -1 && quot_pos == -1) {
						att_str = ' ' + att + "='" + att_value +  "'";	//	use single quotes for attributes
						att_str = ' ' + att + '="' + att_value +  '"';	//	use double quotes for attributes
						result += att_str;
						continue;
					}
					// Prefer the single quote unless forced to use double
					if (quot_pos != -1 && quot_pos < apos_pos) {
						use_quote = APOS;
					}
					else {
						use_quote = QUOTE;
					}
					// Figure out which kind of quote to escape
					// Use nice dictionary instead of yucky if-else nests
					escape = ESCAPED_QUOTE[use_quote];
					// Escape only the right kind of quote
					re = new RegExp(use_quote,'g');
					att_str = ' ' + att + '=' + use_quote + 
						att_value.replace(re, escape) + use_quote;
					result += att_str;
				}
				return result;
			}

			function element (name,content,attributes) {
				var att_str = '';
				if (attributes) { // tests false if this arg is missing!
					att_str = formatAttributes(attributes);
				}
				var xml;
				if (!content){
					xml='<' + name + att_str + '/>';
				}
				else {
					xml='<' + name + att_str + '>' + content + '</'+name+'>';
				}
				return xml;
			}

			var xmlContent = '\n';
			var colors="";
			for(var i=0; i<this.__labels.length; i++)
			{
				var labelColor=this.__labels[i];
				var meshColor=labelColor.meshRed/255+" "+
								labelColor.meshGreen/255+" "+
								labelColor.meshBlue/255+" "+
								labelColor.opacity+" "+
								labelColor.depth;
				colors+=element('color',null, {red : ""+labelColor.red,
												green: ""+labelColor.green,
												blue : ""+labelColor.blue,
												label : ""+labelColor.label,
												name : ""+labelColor.labelName,
												meshcolor : meshColor})+"\n";
			}
			xmlContent+=element('colors', colors)+"\n";

			var adjacencies="\n";
			var adjArray=[];
			var labelColors=this.__labels;
			for(var i=0; i<labelColors.length; i++)
			{
				var label1=labelColors[i].label;
				var adj=labelColors[i].adjacencies;
				for (var j=0;j<adj.length;j++) {
					var label2=adj[j].label;
					var found=false;
					for (var k=0;k<adjArray.length;k++) {
						var edge=adjArray[k];
						if (((edge.label1==label1)&&(edge.label2==label2))||
							((edge.label1==label2)&&(edge.label2==label1))) {
							found=true;
							break;
						}
					}
					if (!found) {
						adjacencies+=element('adjacency',null, 
							{label1 : ""+label1, label2 : ""+label2})+"\n";
						adjArray.push({label1 : label1, label2 : label2});
					}
				}
			}

			if (adjArray.length>0) {
				xmlContent+=element('adjacencies', adjacencies)+"\n";
			}

			var _this=this;
			this.__master.applyToViewers( function () {
				var seedsLists=this.getUserData(desk.segTools.seedsListsString);
				var orientation=this.getOrientation();

				for (var seedsType=0; seedsType<2; seedsType++) {
					var list=seedsLists[seedsType];
					var filePrefix=desk.segTools.filePrefixes[seedsType];
					var slices=list.getChildren();
					for (var i=0;i<slices.length;i++)
					{
						var sliceId=slices[i].getUserData("slice");
						xmlContent += element(filePrefix,
								_this.__getSeedFileName(this, sliceId, seedsType), 
								{slice: sliceId + "", orientation: orientation + ""}) + '\n';
					}
				}
			});

			var parameterMap={
				action : "write_binary",
				file_name : "seeds.xml",
				base64data : qx.util.Base64.encode(element('seeds', xmlContent), true),
				output_directory : this.getSessionDirectory()};

			desk.actions.getInstance().launchAction(parameterMap, callback);
		},

		__getSeedsTypeSelectBox : function()
		{
			var selectBox = new qx.ui.form.SelectBox();

			var seedsItem = new qx.ui.form.ListItem("seeds");
			seedsItem.setUserData("seedsType", 0);
			selectBox.add(seedsItem);

			var correctionsItem = new qx.ui.form.ListItem("corrections");
			correctionsItem.setUserData("seedsType", 1);
			selectBox.add(correctionsItem);

			var _this=this;

			function updateSeedsListsVisibility (e) {
				var newSeedsType=selectBox.getSelection()[0].getUserData("seedsType");
				_this.setSeedsType(newSeedsType);
				_this.__master.applyToViewers(function ( ) {
					var seedsLists=this.getUserData(desk.segTools.seedsListsString);
					seedsLists[newSeedsType].setVisibility("visible");
					seedsLists[1-newSeedsType].setVisibility("excluded");
					_this.__reloadSeedImage (this);
					});
			}

			selectBox.addListener("changeSelection",updateSeedsListsVisibility);
			updateSeedsListsVisibility();
			return selectBox;
		},

		__getNewSeedsImage : function ( sliceView ) {
			if (sliceView.isDrawingCanvasModified()==true) {
				var canvas=sliceView.getDrawingCanvas();
				var seedsImageData=canvas.getContext2d().getImageData(0, 0, canvas.getWidth(), canvas.getHeight());
				var pixels = seedsImageData.data;
				var isAllBlack = true;

				var redArray=this.__compactLabelsRed;
				var greenArray=this.__compactLabelsGreen;
				var blueArray=this.__compactLabelsBlue;
				var numberOfColors=this.__compactLabelsRed.length;

				var numberOfBytes=pixels.length
				for(var i=0; i<numberOfBytes; i+=4) {
					if(128<=pixels[i+3])  //  if( color is solid not totally transparent, ie. alpha=0) <-> if( not background )
					{
						var dRed = 0;
						var dGreen = 0;
						var dBlue = 0;
						var distance = 500000;
						var rightColorIndex = 0;

						for(var j=0; j!=numberOfColors; j++) {
							dRed = redArray[j]-pixels[i];
							dGreen = greenArray[j]-pixels[i+1];
							dBlue = blueArray[j]-pixels[i+2];
							var testD = dRed*dRed+dGreen*dGreen+dBlue*dBlue;
							if(testD<distance) {
								distance = testD;
								rightColorIndex = j;
							}
						}
						pixels[i] = redArray[rightColorIndex];
						pixels[i+1] = greenArray[rightColorIndex];
						pixels[i+2] = blueArray[rightColorIndex];
						pixels[i+3] = 255;
						isAllBlack = false;
					}
					////Comment "else" to send combined image
					else {
						pixels[i] = 0;
						pixels[i+1] = 0;
						pixels[i+2] = 0;
						pixels[i+3] = 0;
					}
				}

				if(!isAllBlack) {
					////Send png image to server
					seedsImageData.data = pixels;

					canvas.getContext2d().putImageData(seedsImageData, 0, 0);
					var pngImg = canvas.getContentElement().getCanvas().toDataURL("image/png");
					var saveData=pngImg.replace("image/png", "image/octet-stream");
					var commaIndex=pngImg.lastIndexOf(",");
					var base64Img = pngImg.substring(commaIndex+1,pngImg.length);
					return base64Img;
				}
			}
			return false;
		},

		__addSeedsListsToViews : function ( ) {
			var _this=this;
			this.__master.applyToViewers ( function () {
				_this.__addSeedsLists ( this );
			});
		},

		__addSeedsLists : function( sliceView ) {
			// create seeds list
			var seedsList=new qx.ui.form.List();
			seedsList.setWidth(30);
			seedsList.setScrollbarY("off");
			sliceView.add(seedsList);
			seedsList.setVisibility("excluded");

			// create corrections list
			var correctionsList=new qx.ui.form.List();
			correctionsList.setWidth(30);
			correctionsList.setScrollbarY("off");
			sliceView.add(correctionsList);
			correctionsList.setVisibility("excluded");

			var lists=[];
			lists.push(seedsList);
			lists.push(correctionsList);
			sliceView.setUserData(desk.segTools.seedsListsString, lists);

		/*	seedsList.addListener("removeItem", function(event) {
				if (seedsList.getChildren().length==0)
					this.__startSegmentationButton.setEnabled(false);
				}, this);

			seedsList.addListener("addItem", function(event) {
				this.__startSegmentationButton.setEnabled(true);
				}, this);*/

			function keyPressHandler (event) {
				if(event.getKeyIdentifier()=="Delete") {
					var seedsType = this.getSeedsType();
					var list=lists[seedsType];
					var selectedChild = list.getSelection()[0];
					if (selectedChild!=null) {
						var sliceId = selectedChild.getUserData("slice");

						////Erase image on the server
						desk.actions.getInstance().launchAction({action : "delete_file",
										"file_name" : this.getSessionDirectory()+"/"+
										this.__getSeedFileName(sliceView, sliceId, seedsType)});
						list.getUserData("seedsArray")[sliceId]=0;
						list.remove(selectedChild);
						this.__reloadSeedImage( sliceView );
						this.__saveSeedsXML();
					}
				}
			}

			seedsList.addListener("keypress", keyPressHandler, this);
			correctionsList.addListener("keypress", keyPressHandler, this);

			this.addListener("close", function (e) {
				sliceView.remove(seedsList);
				sliceView.remove(correctionsList);
			});
		},

		__clearSeeds : function ( ) {
			this.__master.applyToViewers ( function () {
				this.setUserData("previousSlice", this.getSlice());
				var seedsLists=this.getUserData(desk.segTools.seedsListsString);
				for (var i=0;i<2;i++) {
					var numberOfSlices=this.getVolumeSliceToPaint().getNumberOfSlices();
					var seedsArray = [];
					var cacheTagsArray = [];
					for (var j=0;j!=numberOfSlices;j++)
					{
						seedsArray[j]=0;
						cacheTagsArray[j]=Math.random();
					}
					seedsLists[i].removeAll();
					seedsLists[i].setUserData(desk.segTools.seedsArrayString, seedsArray);
					seedsLists[i].setUserData(desk.segTools.cacheTagsArrayString, cacheTagsArray);
				}
			});
		},

		__addNewSeedItemToList : function ( sliceView, sliceId, seedsType )
		{
			var seedsList = sliceView.getUserData(desk.segTools.seedsListsString)[seedsType];
			var seeds = seedsList.getChildren();
			var tempPos = 0;

			for(var i=0; i<seeds.length; i++)
			{
				var currentId=seeds[i].getUserData("slice");
				if(currentId>sliceId) {
					tempPos++;
				}
				if (currentId==sliceId) {
					seedsList.getUserData(desk.segTools.cacheTagsArrayString)[sliceId]=Math.random();
					return;
				}
			}

			var sliceItem = new qx.ui.form.ListItem(""+ sliceId);
			sliceItem.setUserData("slice",sliceId);
			sliceItem.addListener("click", function(event) {
				sliceView.setSlice(event.getTarget().getUserData("slice"));
			});

			seedsList.addAt(sliceItem, tempPos);
			seedsList.getUserData(desk.segTools.seedsArrayString)[sliceId]=sliceItem;
			seedsList.getUserData(desk.segTools.cacheTagsArrayString)[sliceId]=Math.random();
		},

		__getSeedFileName : function(sliceView, sliceId, seedType) {			
			var filePrefix;
			if (seedType==0) {
				filePrefix = "seed";
			}
			else {
				filePrefix = "correction";
			}

			var offset=sliceView.getVolumeSliceToPaint().getSlicesIdOffset();

			switch(sliceView.getOrientation())
			{
				// ZY X
				case 1 :
					return filePrefix +"ZY"+(offset + sliceId) +".png";
					break;
				// XZ Y
				case 2 :
					return filePrefix +"XZ"+(offset + sliceId) +".png";
					break;
				// XY Z
				default :
					return filePrefix +"XY"+(offset + sliceId) +".png";
			}
		},

		__createReorderingWindow : function () {
			var list;
			var currentListItem;
			var myWindow=new qx.ui.window.Window();

			myWindow.setLayout(new qx.ui.layout.VBox());
			myWindow.set({
									width : 400,
									showMinimize: false,
									showMaximize: false,
									allowMaximize: false,
									showClose: true,
									resizable: false,
									movable : true,
									caption : "reorder labels"
								});

			var list = new qx.ui.form.List;
			list.setDraggable(true);
			list.setDroppable(true);
			list.setSelectionMode("multi");
			myWindow.add(list);

			for (var i=0; i<this.__labels.length; i++) {
				var label=this.__labels[i];
				var item=new qx.ui.form.ListItem(label.label+"-"+label.labelName);
				item.setUserData("label", label);
				list.add(item);
			}

			// Create drag indicator
			var indicator = new qx.ui.core.Widget;
			indicator.setDecorator(new qx.ui.decoration.Single().set({
				top : [ 1, "solid", "#33508D" ]
			}));
			indicator.setHeight(0);
			indicator.setOpacity(0.5);
			indicator.setZIndex(100);
			indicator.setLayoutProperties({left: -1000, top: -1000});
			indicator.setDroppable(true);
			myWindow.add(indicator);


			// Just add a move action
			list.addListener("dragstart", function(e) {
				e.addAction("move");
			});

			list.addListener("dragend", function(e)
			{
				// Move indicator away
				indicator.setDomPosition(-1000, -1000);
			});


			list.addListener("drag", function(e)
			{
				var orig = e.getOriginalTarget();

				// store the current listitem - if the user drops on the indicator
				// we can use this item instead of calculating the position of the
				// indicator
				if (orig instanceof qx.ui.form.ListItem) {
					currentListItem = orig;
				}
				if (!qx.ui.core.Widget.contains(myWindow, orig) && orig != indicator) {
					return;
				}

				var origCoords2 = list.getContainerLocation();
				var origCoords = orig.getContainerLocation();

				indicator.setWidth(orig.getBounds().width);
				indicator.setDomPosition(origCoords.left-origCoords2.left,
							 origCoords.top-origCoords2.top);
			});

			list.addListener("dragover", function(e)
			{
				// Stop when the dragging comes from outside
				if (e.getRelatedTarget()) {
					e.preventDefault();
				}
			});

			list.addListener("drop", function(e) {
				reorderList(e.getOriginalTarget());
			});

			indicator.addListener("drop", function(e) {
				reorderList(currentListItem);
				});

			function reorderList (listItem)
			{

				// Only continue if the target is a list item.
				if (listItem.classname != "qx.ui.form.ListItem") {
					return ;
				}

				var sel = list.getSortedSelection();

				for (var i=0, l=sel.length; i<l; i++)
				{
					list.addBefore(sel[i], listItem);

				// recover selection as it get lost during child move
					list.addToSelection(sel[i]);
				}
			}
			myWindow.open();
			myWindow.addListener("close", function () {
				this.__labels=[];
				var labels=list.getChildren();
				for (var i=0;i<labels.length;i++)
				{
					this.__labels.push(labels[i].getUserData("label"));
				}
				list.destroy();
				indicator.destroy();
				myWindow.destroy();
				this.__rebuildLabelsList();
			}, this);
		}

	} //// END of   members :

}); //// END of   qx.Class.define("desk.segTools",

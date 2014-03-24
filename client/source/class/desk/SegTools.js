/**
* @ignore(Uint8Array)
* @lint ignoreDeprecated(alert)
* @lint ignoreDeprecated(confirm)
* @ignore (async.each)
* @ignore (_.find)
*/

qx.Class.define("desk.SegTools",
{
  extend : qx.ui.window.Window,

	construct : function(master, globalFile, options)
	{	
		this.base(arguments);
		this.setAlwaysOnTop(true)
		options = options || {};

		if (options.segmentationMethod) {
			this.__segmentationMethod = options.segmentationMethod;
		}

		this.__master = master;
		this.__file = globalFile;

		this.__labelUnfocusedBorder = new qx.ui.decoration.Decorator().
			set ({width : 2, style : "solid", color : "black"});
		this.__labelFocusedBorder = new qx.ui.decoration.Decorator().
			set ({width : 3, style : "solid", color : "red"});

		this.set({
			layout : new qx.ui.layout.VBox(),
			showMinimize: false,
			showMaximize: false,
			allowMaximize: false,
			showClose: true,
			movable : true,
			caption :"segmentation tool",
			resizable : [false, false, false, false]
		});

		this.__buildActionsContainers();

		var listenersIds = [];
		master.getViewers().forEach(function (viewer) {
			listenersIds[viewer] = viewer.addListener("changeSlice", function ( event ) {
				this.__saveCurrentSeeds();
				this.__reloadSeedImage( viewer );
			}, this);
		}.bind(this));

		this.addListener("close", function (e) {
			master.getViewers().forEach(function (viewer) {
				viewer.removeListenerById(listenersIds[viewer]);
				viewer.setPaintMode(false);
				viewer.setEraseMode(false);
				var canvas = viewer.getDrawingCanvas();
				canvas.getContext2d().clearRect(0, 0, canvas.getCanvasWidth(), canvas.getCanvasHeight());
				viewer.fireEvent("changeDrawing");
			});
		});
		this.__labels = [];
		this.open();
        this.center();
	},

	statics : {
		defaultColors : ['<colors>',
		'<color red="255" green="0" blue="0" name="object1" label="1"/>',
		'<color red="0" green="255" blue="0" name="object2" label="2"/>',
		'<color red="0" green="0" blue="255" name="object3" label="3"/>',
		'<adjacencies>',
		'<adjacency label1="1" label2="2"/>',
		'<adjacency label1="2" label2="3"/>',
		'<adjacency label1="3" label2="1"/>',
		'</adjacencies>',
		'</colors>'].join('\n'),
		defaultColorsFile : null,
		filePrefixes : ["seed","correction"],
		seedsListsString : "seedsLists"
	},

	events : {
		"gotSegmentedVolume" : "qx.event.type.Event",
		"meshingActionUpdated" : "qx.event.type.Data"
	},

	properties : {
		sessionDirectory : { init : null, event : "changeSessionDirectory"},
		seedsType : { init : 0, check: "Number", event : "changeSeedsType"}
	},

	members :
	{
		__segmentationMethod : 0,
		__master : null,
		__file : null,
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

		__meshViewer : null,

		getMeshViewer : function() {
			return this.__meshViewer;
		},
		
		__reloadSeedImage : function (sliceView) {
			if (this.getSessionDirectory() == null)
				return;
			var canvas = sliceView.getDrawingCanvas();
			var width = canvas.getCanvasWidth()
			var height = canvas.getCanvasHeight()

			var context = canvas.getContext2d();
			context.clearRect(0, 0, width, height);
			var seedsType = this.getSeedsType();
			var seedsList = sliceView.getUserData("seeds")[seedsType];
			var sliceId = sliceView.getSlice();

			var seed = _.find(seedsList.getChildren(), function (seed) {
				return seed.getUserData("slice") === sliceId;
			});

			if (seed) {
				var imageLoader = new Image();
				seedsList.setSelection([seed]);
				imageLoader.onload = function(){
					context.drawImage(imageLoader, 0, 0);
					sliceView.fireEvent("changeDrawing");
					imageLoader.onload = 0;
				}
				imageLoader.src = desk.FileSystem.getFileURL(this.getSessionDirectory()) + "/" +
					this.__getSeedFileName (sliceView, sliceId, seedsType) +
					"?nocache=" + Math.random();
			} else {
				seedsList.resetSelection();
				sliceView.fireEvent("changeDrawing");
			}
		},

		__buildActionsContainers : function() {	
			var spacing = 5;
			var tRCL = new qx.ui.layout.HBox();
			tRCL.setSpacing(spacing);
			this.__topRightContainer = new qx.ui.container.Composite(tRCL);

			var bRCL=new qx.ui.layout.HBox();
			bRCL.setSpacing(spacing);
			this.__bottomRightContainer = new qx.ui.container.Composite(bRCL);

			////Create pen size chose widget
            this.__penSize = new qx.ui.form.Spinner().set({
                minimum: 1,
                maximum: 100,
                value: 1
            });
			
            this.__penSize.addListener("changeValue", function(event) {
				this.__master.getViewers().forEach(function (viewer) {
					viewer.setPaintWidth(event.getData());
				});
			}, this);
            this.__penSize.setValue(5);
			
			var penLabel = new qx.ui.basic.Label("Brush : ");
			this.__topRightContainer.add(penLabel);
			this.__topRightContainer.add(this.__penSize);
			
			////Create eraser on/off button
            this.__eraserButton = new qx.ui.form.ToggleButton("Eraser");
			this.__eraserButton.addListener("changeValue", function(e) {
				this.__master.getViewers().forEach(function (viewer) {
					viewer.setEraseMode(e.getData());
				});
			}, this);
			this.__topRightContainer.add(this.__eraserButton);

			////Create labels zone
			var paintPage = new qx.ui.tabview.Page("paint");
			var paintPageLayout = new qx.ui.layout.VBox();
			paintPageLayout.setSpacing(spacing);
            paintPage.setLayout(paintPageLayout);
			paintPage.add(this.__topRightContainer);

			this.__colorsContainer = new qx.ui.container.Composite();
            this.__colorsContainer.setLayout(new qx.ui.layout.Grid(1,1));
			this.__colorsContainer.setDroppable(true);
			this.__colorsContainer.addListener("drop", function(e) {
				if (e.supportsType("fileBrowser")) {
					this.__loadColors(e.getData("fileBrowser").getSelectedFiles()[0]);
				}
			}, this);
			paintPage.add(this.__colorsContainer);

			var bRCL = new qx.ui.layout.HBox();
			bRCL.setSpacing(spacing);
			this.__mainBottomRightContainer = new qx.ui.container.Composite(bRCL);
			
			var tabView = new desk.TabView();
			this.__tabView = tabView;
            tabView.add(paintPage);
			tabView.setVisibility("excluded");

			var sessionWdgt = this.__getSessionsWidget();

			this.__master.getViewers().forEach (function (viewer) {
				this.__addSeedsLists (viewer);
			}.bind(this));

			this.add(sessionWdgt);
			
			this.add(this.__mainBottomRightContainer, {flex : 1});

			this.__mainBottomRightContainer.add(tabView);
			
			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("Opacity :");
			this.__topRightContainer.add(whileDrawingDrwngOpacityLabel);
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
			whileDrawingDrwngOpacitySlider.setValue(100);
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event) {
				this.__master.getViewers().forEach(function (viewer) {
					viewer.setPaintOpacity(event.getData() / 100);
				});
			}, this);

            this.__topRightContainer.add(whileDrawingDrwngOpacitySlider, {flex : 1});

			paintPage.add(this.__bottomRightContainer);

			if (this.__segmentationMethod) {
				this.__buildActions();
			} else {
				this.__buildActionsGC();
			}

			this.__seedsTypeSelectBox = this.__getSeedsTypeSelectBox();
			paintPage.addAt(this.__seedsTypeSelectBox,0);
		},

		__buildActions : function () {
			var segmentationAction = new desk.Action("multiseg", {standalone : false});
			segmentationAction.setActionParameters({"input_volume" : this.__file});
			segmentationAction.setOutputSubdirectory("segmentation");
			segmentationAction.buildUI();
			this.__tabView.addElement('segmentation', segmentationAction.getTabView());

			var meshingAction = new desk.Action("extract_meshes", {standalone : false});
			meshingAction.setOutputSubdirectory("meshes");
			meshingAction.buildUI();
			this.__tabView.addElement('meshing', meshingAction.getTabView());

			this.addListener("changeSessionDirectory", function (e) {
				var directory = e.getData();
				if (segmentationToken != null) {
					this.__master.removeVolume(segmentationToken);
				}
				segmentationAction.setOutputDirectory(directory);
				meshingAction.setOutputDirectory(directory);
				segmentationAction.setActionParameters({
					"input_volume" : this.__file,
					"seeds" : this.getSessionDirectory() + "/seeds.xml"
				});
				meshingAction.setActionParameters({
					"input_volume" : this.getSessionDirectory() + "/segmentation/output.mhd",
					"colors" : this.getSessionDirectory() + "/seeds.xml"
				});
			}, this);

			this.__startSegmentationButton = new qx.ui.form.Button("Start segmentation");
			this.__startSegmentationButton.addListener("execute", function () {
				this.__startSegmentationButton.setEnabled(false);
				this.__segmentationInProgress = true;
				this.__saveCurrentSeeds(function() {
					segmentationAction.executeAction();
				});
			}, this);
			this.__bottomRightContainer.add(this.__startSegmentationButton);

			var meshingButton = new qx.ui.form.Button("extract meshes");
			this.__extractMeshesButton = meshingButton;
			meshingButton.addListener("execute", function () {
				this.__startSegmentationButton.setEnabled(false);
				meshingButton.setEnabled(false);
				this.__saveCurrentSeeds(function() {
					meshingAction.executeAction();
				});
			}, this);
			this.__bottomRightContainer.add(meshingButton);

			var segmentationToken = null;
			segmentationAction.addListener("actionUpdated", function () {
				this.__startSegmentationButton.setEnabled(true);
				if (!segmentationToken) {
					segmentationToken = this.__master.addVolume(segmentationAction.getOutputDirectory()+"output.mhd",
						{opacity : 0.5, format : 0,
						colors : [this.__labelColorsRed, this.__labelColorsGreen, this.__labelColorsBlue]});
				} else {
					this.__master.updateVolume(segmentationToken);
				}

				this.fireEvent("gotSegmentedVolume");
			}, this);

			this.__master.addListener("removeVolume", function (e) {
				if (e.getData() == segmentationToken) {
					segmentationToken = null;
				}
			});

			meshingAction.addListener("actionUpdated", function () {
				meshingButton.setEnabled(true);
				this.__startSegmentationButton.setEnabled(true);
				if (!this.__meshViewer) {
					this.__meshViewer = new desk.MeshViewer(this.getSessionDirectory() +
						"/meshes/meshes.xml");
					this.__meshViewer.addListener("close", function () {
						this.__meshViewer = null;
					}, this)
				} else {
					this.__meshViewer.update();
				}

				this.fireDataEvent("meshingActionUpdated", this.__meshViewer);
			}, this);
		},

		__buildActionsGC : function() {	
			var clusteringAction = new desk.Action("cvtseg2", {standalone : false});
			clusteringAction.setActionParameters({"input_volume" : this.__file});
			clusteringAction.setOutputSubdirectory("clustering");
			clusteringAction.buildUI();
			this.__tabView.addElement('clustering', clusteringAction.getTabView());

			var segmentationAction = new desk.Action("cvtgcmultiseg",
				{standalone : false});
			clusteringAction.setActionParameters({"input_volume" : this.__file});
			segmentationAction.setOutputSubdirectory("segmentation");
			segmentationAction.connect("clustering", clusteringAction,
				"clustering-index.mhd");
			segmentationAction.buildUI();
			this.__tabView.addElement('segmentation', segmentationAction.getTabView());

			var medianFilteringAction = new desk.Action("volume_median_filtering", {standalone : false});
			medianFilteringAction.setOutputSubdirectory("filtering");
			medianFilteringAction.connect("input_volume", 
				segmentationAction, "seg-cvtgcmultiseg.mhd");
			medianFilteringAction.buildUI();
			this.__tabView.addElement('cleaning', medianFilteringAction.getTabView());

			var meshingAction = new desk.Action("extract_meshes", {standalone : false});
			meshingAction.setOutputSubdirectory("meshes");
			meshingAction.buildUI();
			this.__tabView.addElement('meshing', meshingAction.getTabView());

			this.addListener("changeSessionDirectory", function (e) {
				var directory=e.getData();
				medianFilteringAction.setOutputDirectory(directory);
				if (segmentationToken != null) {
					this.__master.removeVolume(segmentationToken);
				}
				clusteringAction.setOutputDirectory(directory);
				segmentationAction.setOutputDirectory(directory);
				meshingAction.setOutputDirectory(directory);
				segmentationAction.setActionParameters({
					"input_volume" : this.__file,
					"seeds" : this.getSessionDirectory() + "/seeds.xml"
				});
				clusteringAction.setActionParameters({
					"input_volume" : this.__file
				});
				meshingAction.setActionParameters({
					"input_volume" : this.getSessionDirectory() + "/filtering/output.mhd",
					"colors" : this.getSessionDirectory() + "/seeds.xml"
				});
			}, this);

			this.__startSegmentationButton = new qx.ui.form.Button("Start segmentation");
			this.__startSegmentationButton.addListener("execute", function () {
				this.__startSegmentationButton.setEnabled(false);
				this.__segmentationInProgress = true;
				this.__saveCurrentSeeds(function() {
							medianFilteringAction.executeAction();});
			}, this);
			this.__bottomRightContainer.add(this.__startSegmentationButton);

			var meshingButton = new qx.ui.form.Button("extract meshes");
			this.__extractMeshesButton = meshingButton;
			meshingButton.addListener("execute", function () {
				this.__startSegmentationButton.setEnabled(false);
				meshingButton.setEnabled(false);
				meshingAction.executeAction();
			}, this);
			this.__bottomRightContainer.add(meshingButton);

			var segmentationToken = null;
			medianFilteringAction.addListener("actionUpdated", function () {
				this.__startSegmentationButton.setEnabled(true);
				if (!segmentationToken) {
					segmentationToken = this.__master.addVolume(medianFilteringAction.getOutputDirectory()+"output.mhd",
								{opacity : 0.5, format : 0,
								colors : [this.__labelColorsRed, this.__labelColorsGreen, this.__labelColorsBlue]});
				} else {
					this.__master.updateVolume(segmentationToken);
				}

				this.fireEvent("gotSegmentedVolume");
			}, this);

			this.__master.addListener("removeVolume", function (e) {
				if (e.getData() == segmentationToken) {
					segmentationToken = null;
				}
			});

			meshingAction.addListener("actionUpdated", function () {
				meshingButton.setEnabled(true);
				this.__startSegmentationButton.setEnabled(true);
				if (!this.__meshViewer) {
					this.__meshViewer = new desk.MeshViewer(this.getSessionDirectory() +
						"/meshes/meshes.xml");
					this.__meshViewer.addListener("close", function () {
						this.__meshViewer = null;
					}, this)
				} else {
					this.__meshViewer.update();
				}

				this.fireDataEvent("meshingActionUpdated", this.__meshViewer);
			}, this);

		},

		__rebuildLabelsList : function () {
			var colors = this.__labels;
			var row = 0;
			var column = 0;
			var numberOfColumns = 4;
			this.__colorsContainer.removeAll();
			for (var i=0; i < colors.length; i++) {	
				var labelBox = colors[i].container;
				this.__colorsContainer.add(labelBox, {column: column, row: row});
				column++;
				if (column >= numberOfColumns) {
					column = 0;
					row++;
				}
			}
			this.__buildLookupTables();
		},

		__buildLookupTables : function () {
			var red = new Uint8Array (256);
			var green = new Uint8Array (256);
			var blue = new Uint8Array (256);
			this.__labelColorsRed = red;
			this.__labelColorsGreen = green;
			this.__labelColorsBlue = blue;
			var i;
			for (i = 0; i < 256; i++) {
				red[i] = 0;
				green[i] = 0;
				blue[i] = 0;
			}
			var colors = this.__labels;

			// build compact lookuptables for seeds processing
			var cRed=new Uint8Array (colors.length);
			this.__compactLabelsRed=cRed;
			var cGreen=new Uint8Array (colors.length);
			this.__compactLabelsGreen=cGreen;
			var cBlue=new Uint8Array (colors.length);
			this.__compactLabelsBlue=cBlue;

			for (i = 0; i < colors.length; i++) {
				var label =colors[i].label;
				red[label] = colors[i].red;
				green[label] = colors[i].green;
				blue[label] = colors[i].blue;

				cRed[i] = colors[i].red;
				cGreen[i] = colors[i].green;
				cBlue[i] = colors[i].blue;
			}
		},

		__setColorsFromElements : function (colors, adjacencies) {
			if (colors.length == 0) {
				alert("error : no colors");
				return;
			}

			for (var i = 0; i < this.__labels.length; i++) {
				this.__labels[i].dispose();
			}
			this.__labels = [];
			for(var i = 0; i < colors.length; i++)
			{
				var color = colors[i];
				var label = parseInt(color.getAttribute("label"), 10)
				var colorName = color.getAttribute("name");
				var red = parseInt(color.getAttribute("red"));
				var green = parseInt(color.getAttribute("green"));
				var blue = parseInt(color.getAttribute("blue"));
				var mColor = [];
				if (color.hasAttribute("meshcolor")) {
					mColor = color.getAttribute("meshcolor").split(" ");
					mColor[0] = Math.round(parseFloat(mColor[0])*255);
					mColor[1] = Math.round(parseFloat(mColor[1])*255);
					mColor[2] = Math.round(parseFloat(mColor[2])*255);
					mColor[3] = parseFloat(mColor[3]);
					mColor[4] = parseInt(mColor[4]);
				} else {
					mColor=[255, 255, 255, 1, 0];
				}
				
				this.__addColorItem(label, colorName, red, green, blue,
						mColor[0],mColor[1],mColor[2],mColor[3],mColor[4]);
			}
			this.__rebuildLabelsList();
			for (var i = 0; i < adjacencies.length; i++) {
				var adjacency = adjacencies[i];
				this.__addEdge(this.__getLabel(adjacency.getAttribute("label1")),
						this.__getLabel(adjacency.getAttribute("label2")));
			}
		},

		__loadColors : function (file) {
			if (file == null) {
				file = desk.SegTools.defaultColorsFile;
				if (file == null) {
					var parser = new DOMParser();
					var xmlDoc = parser.parseFromString(desk.SegTools.defaultColors, "text/xml");
					this.__setColorsFromElements(xmlDoc.getElementsByTagName("color"),
								xmlDoc.getElementsByTagName("adjacency"));
				}
			} else {
				desk.FileSystem.readFile(file, function (err, result) {
					this.__setColorsFromElements(result.getElementsByTagName("color"),
									result.getElementsByTagName("adjacency"));
				}, this);
			}
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
					this.__master.getViewers().forEach(function (viewer) {
						viewer.setPaintColor(colorSelector.getValue());
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

			var __updateAdjacenciesText = function () {
				var adjacencies = this.__targetColorItem.adjacencies;
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
			}.bind(this)

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
			if (label1 == label2) {
				alert ("error : trying to create self-loop adjacency : "+
						label1.label + "-" + label2.label);
				return;
			}

			if (_.find(label1.adjacencies, function (adjacency) {
					return adjacency.label === label2.label
				})) {
				alert ("Error : adjacency " + label1.label + "-" + label2.label + " already exists");
				return;
			}
			this.__addAdjacency(label1, label2);
			this.__addAdjacency(label2, label1);
		},

		__removeEdge : function (label1, label2) {
			if (!_.find(label1.adjacencies, function (adjacency) {
					return adjacency.label === label2.label
				})) {
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
			var adjacencies = label1.adjacencies;
			for (var i = 0; i < adjacencies.length; i++){
				if (label2 === adjacencies[i]) {
					adjacencies.splice(i, 1);
					return;
				}
			}
			alert ("error : adjacency to remove not found...");
		},

		__selectedLabel : null,

		__labelUnfocusedBorder : null,

		__labelFocusedBorder : null,

		__addColorItem : function(label, labelName, red, green, blue,
					meshRed, meshGreen, meshBlue, opacity, depth) {
			////Function creates one label box
			var unfocusedBorder = this.__labelUnfocusedBorder;
            var focusedBorder = this.__labelFocusedBorder;
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
                focusable : true
            });
			var colorBox = new qx.ui.container.Composite().set({
                maxWidth: boxWidth-12,
                height: 25,
                alignX : "center"});

			var listenerId = this.__eraserButton.addListener("changeValue", function (e) {
				if (e.getData()){
					labelBox.set({decorator: unfocusedBorder});
				}
			}, this);

			labelBox.addListener("click", function(e) {
				var paint = true;
				if (this.__selectedLabel === labelBox) {
					paint = false;
					this.__selectedLabel = null;
				} else {
					this.__selectedLabel = labelBox;
					this.__eraserButton.setValue(false);
					paint = true;
				}
				this.__targetColorItem = labelAttributes;
				if (this.__editionWindow != null) {
						this.__updateEditionWindow();
				}

				var children = this.__colorsContainer.getChildren();
				for(var k = 0;  k < children.length; k++) {
					var label = children[k];
					if(label === this.__selectedLabel) {
						label.setDecorator(focusedBorder);
					} else {
						label.setDecorator(unfocusedBorder);
					}
				}

				this.__master.getViewers().forEach(function (viewer) {
					viewer.setPaintColor(colorBox.getBackgroundColor());
					viewer.setPaintMode(paint);
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

			var labelAttributes = {
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
					
				}
			};
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
			addButton.addListener("execute", function () {
				var colors = this.__labels;
				var maxLabel = 0;
				for (var i = 0; i < colors.length; i++) {
					if (colors[i].label > maxLabel) {
						maxLabel = colors[i].label;
					}
				}
				this.__addColorItem (maxLabel + 1, "edit_me", 100, 100, 100,
					100, 100, 100, 1, 0)
				this.__rebuildLabelsList();
			}, this);
			menu.add(addButton);

			var removeButton = new qx.ui.menu.Button("remove");
			removeButton.addListener("execute", function () {
				this.__deleteColorItem(labelAttributes);
			},this);
			menu.add(removeButton);
			labelBox.setContextMenu(menu);

			labelAttributes.dispose = function () {
				labelBox.destroy();
				labelLayout.dispose();
				colorBox.destroy();
				boxLabel.destroy();
				menu.destroy();
				addButton.destroy();
				editButton.destroy();
				removeButton.destroy();
			}
        },

		loadSession : function() {
			this.__clearSeeds();

			this.__master.getViewers().forEach(function (viewer) {
				viewer.setUserData("previousSlice", viewer.getSlice());
			});

			desk.FileSystem.readFile(this.getSessionDirectory()+'/seeds.xml', function (err, response) {
				if (!err) {
					for (var k = 0; k < 2; k++) {
						var slices;
						if (k == 0) {
							slices = response.getElementsByTagName("seed");
						} else {
							slices = response.getElementsByTagName("correction");
						}

						for(var j = 0; j < slices.length; j++) {
							var sliceId = parseInt(slices[j].getAttribute("slice"),10);
							var sliceOrientation;
							if (slices[j].hasAttribute("orientation")){
								sliceOrientation = parseInt(slices[j].getAttribute("orientation"),10);
							} else {
								sliceOrientation = 0;
							}
							this.__master.getViewers().forEach (function (viewer) {
								if(sliceOrientation == viewer.getOrientation())
									this.__addNewSeedItemToList(viewer, sliceId, k);
							}.bind(this));
						}
						this.__master.getViewers().forEach(function (viewer) {
							this.__reloadSeedImage( viewer );
						}.bind(this));
					}
					var colors = response.getElementsByTagName("color");
					var adjacencies = response.getElementsByTagName("adjacency");
					if (colors.length > 0) {
						this.__setColorsFromElements(colors, adjacencies);
					} else {
						this.__loadColors();
					}
				} else {
					this.__loadColors();
				}
			}.bind(this));
		},

		__getSessionsWidget : function() {	
			var tools = this;
			var volFile = this.__file;
			var fileSystem = desk.FileSystem.getInstance();
			
			var sessionsListLayout = new qx.ui.layout.HBox();
			sessionsListLayout.setSpacing(4);
			var sessionsListContainer = new qx.ui.container.Composite(sessionsListLayout);
			var sessionsListLabel = new qx.ui.basic.Label("Sessions : ");
			sessionsListContainer.add(sessionsListLabel);
			var button = new qx.ui.form.Button("new session");
			sessionsListContainer.add(button);

			var sessionType = "gcSegmentation";
			var sessionsList = new qx.ui.form.SelectBox();
			sessionsListContainer.add(sessionsList);

			var updateInProgress = false;
			var loadedSessions = [];
			var dummyItem;
			function updateList(sessionIdToSelect) {
				updateInProgress = true;
				function buildSessionsItems (sessions)
				{
					var sessionItemToSelect = null;
					sessionsList.removeAll();
					for (var i = 0; i < sessions.length; i++)
					{
						var sessionId = sessions[i];
						var sessionItem = new qx.ui.form.ListItem("" + sessionId);
						sessionsList.add(sessionItem);
						if (sessionId == sessionIdToSelect)
							sessionItemToSelect = sessionItem;
					}

					if (sessionIdToSelect == null)
					{
						dummyItem = new qx.ui.form.ListItem("select a session");
						sessionsList.add(dummyItem);
						dummyItem.setUserData("dummy",true);
					}
					if (sessionItemToSelect != null)
					{
						sessionsList.setSelection([sessionItemToSelect]);
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileSystem.getSessionDirectory(
							volFile,sessionType, sessionIdToSelect));
						tools.__clearSeeds();
						tools.__loadColors();
					}
					else
					{
						if(sessionsList.indexOf(dummyItem)!=-1)
							sessionsList.setSelection([dummyItem]);
					}
					updateInProgress=false;
					var sLength = sessions.length;
					for(var i=0; i<sLength; i++)
						loadedSessions[i] = sessions[i];
					if(sLength<1)
					{
						sessionsList.setEnabled(false);
						cpSessCheckBox.setEnabled(false);
						rmSessCheckBox.setEnabled(false);
					}
					else
					{
						sessionsList.setEnabled(true);
						cpSessCheckBox.setEnabled(true);
						rmSessCheckBox.setEnabled(true);
					}
					checkCPsession();
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
						if(rmSessCheckBox.getValue())
							checkRmsession();
						else
							tools.loadSession();
					}
					sessionsList.close();
				}
			});

			button.addListener("execute", function (e){
				fileSystem.createNewSession(volFile,sessionType, updateList);
				}, this);

			updateList();
			
			
			var sessionCopyContainer = new qx.ui.container.Composite( new qx.ui.layout.HBox(4) );
			var cpSessCheckBox = new qx.ui.form.CheckBox("Copy from session : ");
			cpSessCheckBox.addListener( "changeValue", function (event)
			{
				var cpSChBoxValue = event.getData();
				if(cpSChBoxValue==true)
				{
					rmSessCheckBox.setValue(false);
					rmSessCheckBox.setUserData("oldEnabled", rmSessCheckBox.getEnabled());
					rmSessCheckBox.setEnabled(false);
				}
				else
					rmSessCheckBox.setEnabled(rmSessCheckBox.getUserData("oldEnabled"));
				forCpSessList.setEnabled(cpSChBoxValue);
				sessionsList.setEnabled(!cpSChBoxValue);
			});
			function checkCPsession()
			{
				if(cpSessCheckBox.getValue()&&(typeof srcSession == "string"))
				{
					var cpFromSessParamMap = {
												"action" : "copy",
												"source" : srcSession + "/*",
												"destination" : tools.getSessionDirectory()
											};
					desk.Actions.getInstance().launchAction( cpFromSessParamMap, tools.loadSession, tools);
					cpSessCheckBox.setValue(false);
				}
				updateCPList();
			}
			cpSessCheckBox.setEnabled(false);
			sessionCopyContainer.add(cpSessCheckBox);
			var forCpSessList = new qx.ui.form.SelectBox();
			var srcSession;
			forCpSessList.addListener("changeSelection", function()
			{
				var listItem = forCpSessList.getSelection()[0];
				if(listItem!=null)
					srcSession = fileSystem.getSessionDirectory(volFile, sessionType, listItem.getLabel());
			});
			function updateCPList()
			{
				forCpSessList.removeAll();
				for (var i=0; i<loadedSessions.length; i++)
				{
					var sessionId = loadedSessions[i];
					var sessionItem = new qx.ui.form.ListItem(""+sessionId);
					forCpSessList.add(sessionItem);
				}
			}
			forCpSessList.setEnabled(false);
			forCpSessList.setMaxWidth(sessionsList.getWidth());
			sessionCopyContainer.add(forCpSessList);
			var rmSessCheckBox = new qx.ui.form.CheckBox("Remove session");
			rmSessCheckBox.addListener( "changeValue", function (event)
			{
				var rmSChBoxValue = event.getData();
				if(rmSChBoxValue==true)
				{
					cpSessCheckBox.setValue(false);
					cpSessCheckBox.setUserData("oldEnabled", cpSessCheckBox.getEnabled());
					cpSessCheckBox.setEnabled(false);
					rmSessCheckBox.setUserData("currSel", sessionsList.getSelection()[0]);
				}
				else
					cpSessCheckBox.setEnabled(cpSessCheckBox.getUserData("oldEnabled"));
				button.setEnabled(!rmSChBoxValue);
			});
			function checkRmsession() {
				if(rmSessCheckBox.getValue()&&(typeof tools.getSessionDirectory() == "string"))
				{
					var sessionDirectory = tools.getSessionDirectory();
					var beforeExtension = sessionDirectory.lastIndexOf(".");
					var sessionId = sessionDirectory.substring(beforeExtension+1);
					var confirmed = confirm('<!> Remove session "' + sessionId + '" ?');
					if(confirmed)
					{
						var rmSessParamMap = {
													"action" : "delete_directory",
													"directory" : sessionDirectory
												};
						desk.Actions.getInstance().launchAction( rmSessParamMap, function()
						{
							var toSelect = rmSessCheckBox.getUserData("currSel");
							if(sessionsList.indexOf(toSelect)!=-1)
								updateList(toSelect.getLabel());
							else
								updateList();
						}, tools);
						rmSessCheckBox.setValue(false);
					}
				}
			}
			rmSessCheckBox.setEnabled(false);
			var sessionOptionsContainer = new qx.ui.container.Composite( new qx.ui.layout.VBox(2) );
			sessionOptionsContainer.add(sessionCopyContainer);
			sessionOptionsContainer.add(rmSessCheckBox);
			
			var sessionToolsContainer = new qx.ui.container.Composite( new qx.ui.layout.VBox() );
			sessionToolsContainer.add(sessionsListContainer);
			sessionToolsContainer.add(sessionOptionsContainer);
			
			return sessionToolsContainer;
		},

		__saveCurrentSeeds : function(callback) {
			callback = callback || function () {};
			if (this.getSessionDirectory() === null) return;
			var modified = false;
			async.each(this.__master.getViewers(), (function (viewer, callback) {
				var base64Img = this.__getNewSeedsImage (viewer);
				var sliceId = viewer.getUserData( "previousSlice" );
				if (base64Img != false) {
					modified = true;
					// save image
					var seedsType = this.getSeedsType();

					this.__addNewSeedItemToList (viewer, sliceId, seedsType);

					desk.Actions.getInstance().launchAction({
						action : "write_binary",
						file_name : this.__getSeedFileName (viewer, sliceId, seedsType),
						base64data : base64Img,
						output_directory : this.getSessionDirectory()
					}, callback);
				} else {
					callback();
				}
				viewer.setUserData("previousSlice", viewer.getSlice());
				viewer.setDrawingCanvasNotModified();
			}).bind(this),
			
			(function () {
				this.__saveSeedsXML(callback, modified);
			}).bind(this));
		},

		////Rewrite xml list of the drawn seeds
		__saveSeedsXML : function(callback, force) {
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
					} else {
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
				} else {
					xml='<' + name + att_str + '>' + content + '</'+name+'>';
				}
				return xml;
			}

			var xmlContent = '\n';
			var colors = "";
			var lColors = this.__labels;
			var lColorsNb = lColors.length;

			for(var i = 0; i < lColorsNb; i++) {
				var labelColor = lColors[i];
				var meshColor = labelColor.meshRed/255 + " " +
								labelColor.meshGreen/255 + " " +
								labelColor.meshBlue/255 + " " +
								labelColor.opacity + " " +
								labelColor.depth;
				colors+=element('color', null, {red : "" + labelColor.red,
												green: "" + labelColor.green,
												blue : "" + labelColor.blue,
												label : "" + labelColor.label,
												name : "" + labelColor.labelName,
												meshcolor : meshColor}) + "\n";
			}
			xmlContent += element('colors', colors) + "\n";

			var adjacencies = "\n";
			var adjArray = [];
			for(var i = 0; i < lColorsNb; i++) {
				var label1 = lColors[i].label;
				var adj = lColors[i].adjacencies;
				for (var j = 0;j < adj.length; j++) {
					var label2 = adj[j].label;

					if (!_.find(adjArray, function (edge) {
						return ((edge.label1 == label1) && (edge.label2 == label2)) ||
							((edge.label1 == label2) && (edge.label2 == label1))
						})) {
						adjacencies += element('adjacency', null, 
							{label1 : "" + label1, label2 : "" + label2}) + "\n";
						adjArray.push({label1 : label1, label2 : label2});
					}
				}
			}

			if (adjArray.length > 0) {
				xmlContent += element('adjacencies', adjacencies) + "\n";
			}

			this.__master.getViewers().forEach( function (viewer) {
				var seedsLists = viewer.getUserData("seeds");
				var orientation = viewer.getOrientation();

				for (var seedsType = 0; seedsType < 2; seedsType++) {
					var list = seedsLists[seedsType];
					var filePrefix = desk.SegTools.filePrefixes[seedsType];
					var slices = list.getChildren();
					for (var i = 0; i < slices.length; i++) {
						var sliceId = slices[i].getUserData("slice");
						xmlContent += element(filePrefix,
							this.__getSeedFileName(viewer, sliceId, seedsType), 
							{slice: sliceId + "", orientation: orientation + ""}) + '\n';
					}
				}
			}.bind(this));

			var seeds = element('seeds', xmlContent);

			desk.FileSystem.readFile(this.getSessionDirectory() + "/seeds.xml", function (err, result) {
				if (!force && (result === seeds)) {
					callback();
					return;
				}
				desk.Actions.getInstance().launchAction({
					action : "write_binary",
					file_name : "seeds.xml",
					base64data : qx.util.Base64.encode(seeds, true),
					output_directory : this.getSessionDirectory()},
				callback);
			}, this, true);
		},

		__getSeedsTypeSelectBox : function() {
			var selectBox = new qx.ui.form.SelectBox();
			var seedsItem = new qx.ui.form.ListItem("seeds");
			seedsItem.setUserData("seedsType", 0);
			selectBox.add(seedsItem);

			var correctionsItem = new qx.ui.form.ListItem("corrections");
			correctionsItem.setUserData("seedsType", 1);
			selectBox.add(correctionsItem);

			var updateSeedsListsVisibility = function (e) {
				var newSeedsType=selectBox.getSelection()[0].getUserData("seedsType");
				this.setSeedsType(newSeedsType);
				this.__master.getViewers().forEach(function (viewer) {
					var seedsLists = viewer.getUserData("seeds");
					seedsLists[newSeedsType].setVisibility("visible");
					seedsLists[1 - newSeedsType].setVisibility("excluded");
					this.__reloadSeedImage(viewer);
				}.bind(this));
			}.bind(this);

			selectBox.addListener("changeSelection",updateSeedsListsVisibility);
			updateSeedsListsVisibility();
			return selectBox;
		},

		__getNewSeedsImage : function ( sliceView ) {
			if (sliceView.isDrawingCanvasModified() == true) {
				var canvas = sliceView.getDrawingCanvas();
				var seedsImageData = canvas.getContext2d().getImageData(0, 0, canvas.getWidth(), canvas.getHeight());
				var pixels = seedsImageData.data;
				var isAllBlack = true;

				var redArray = this.__compactLabelsRed;
				var greenArray = this.__compactLabelsGreen;
				var blueArray = this.__compactLabelsBlue;
				var numberOfColors = this.__compactLabelsRed.length;

				var numberOfBytes = pixels.length
				for(var i = 0; i < numberOfBytes; i += 4) {
					if(128 <= pixels[i + 3]) {
						var dRed = 0;
						var dGreen = 0;
						var dBlue = 0;
						var distance = 500000;
						var rightColorIndex = 0;

						for(var j = 0; j != numberOfColors; j++) {
							dRed = redArray[j] - pixels[i];
							dGreen = greenArray[j] - pixels[i + 1];
							dBlue = blueArray[j] - pixels[i + 2];
							var testD = dRed * dRed + dGreen * dGreen + dBlue * dBlue;
							if(testD < distance) {
								distance = testD;
								rightColorIndex = j;
							}
						}
						pixels[i] = redArray[rightColorIndex];
						pixels[i+1] = greenArray[rightColorIndex];
						pixels[i+2] = blueArray[rightColorIndex];
						pixels[i+3] = 255;
						isAllBlack = false;
					} else {
						pixels[i] = 0;
						pixels[i+1] = 0;
						pixels[i+2] = 0;
						pixels[i+3] = 0;
					}
				}

				if(!isAllBlack) {
					seedsImageData.data = pixels;

					canvas.getContext2d().putImageData(seedsImageData, 0, 0);
					var pngImg = canvas.getContentElement().getCanvas().toDataURL("image/png");
					var saveData = pngImg.replace("image/png", "image/octet-stream");
					var commaIndex = pngImg.lastIndexOf(",");
					var base64Img = pngImg.substring(commaIndex+1,pngImg.length);
					return base64Img;
				}
			}
			return false;
		},

		__addSeedsLists : function( sliceView ) {
			var seedsList = new qx.ui.form.List();
			var correctionsList = new qx.ui.form.List();
			var lists = [seedsList, correctionsList];
			sliceView.setUserData("seeds", lists);

			function stopPropagation (e) {e.stopPropagation();}

			function keyPressHandler (event) {
				if(event.getKeyIdentifier() == "Delete") {
					var seedsType = this.getSeedsType();
					var list = lists[seedsType];
					var selectedChild = list.getSelection()[0];
					if (selectedChild) {
						var sliceId = selectedChild.getUserData("slice");

						////Erase image on the server
						desk.Actions.getInstance().launchAction({action : "delete_file",
							"file_name" : this.getSessionDirectory()+"/"+
								this.__getSeedFileName(sliceView, sliceId, seedsType)});
						list.remove(selectedChild);
						this.__reloadSeedImage( sliceView );
					}
				}
			}

			lists.forEach(function (list) {
				list.set({scrollbarY : "off", visibility : "excluded",
					width : null, opacity : 0.5});
				sliceView.add(list, {top : 40, left : 0});
				list.addListener("mousedown", stopPropagation);
				list.addListener("mousewheel", stopPropagation);
				list.addListener("keypress", keyPressHandler, this);
				list.addListener("changeSelection", function () {
					var slice = list.getSelection() && list.getSelection()[0];
					if (slice) {
						sliceView.setSlice(slice.getUserData("slice"));
					}
				});
				this.addListener("close", function (e) {
					sliceView.remove(list);
				});
			}.bind(this));

		},

		__clearSeeds : function ( ) {
			this.__master.getViewers().forEach (function (viewer) {
				viewer.setUserData("previousSlice", viewer.getSlice());
				viewer.getUserData("seeds").
					forEach(function (list) {list.removeAll();});
				this.__reloadSeedImage(viewer);
			}.bind(this));
		},

		__addNewSeedItemToList : function ( sliceView, sliceId, seedsType ) {
			var seedsList = sliceView.getUserData("seeds")[seedsType];
			var position = 0;

			if (!_.find(seedsList.getChildren(), function(seed){
					var id = seed.getUserData("slice");
					if (id > sliceId) position++;
					return id == sliceId;
				})) {

				var sliceItem = new qx.ui.form.ListItem("" + sliceId);
				sliceItem.setUserData("slice", sliceId);
				sliceItem.addListener("mousedown", function(event) {
					sliceView.setSlice(event.getTarget().getUserData("slice"));
				});
				seedsList.addAt(sliceItem, position);
			}
		},

		__getSeedFileName : function(sliceView, sliceId, seedType) {			
			var filePrefix;
			if (seedType == 0) {
				filePrefix = "seed";
			} else {
				filePrefix = "correction";
			}

			var sliceLetters;
			switch(sliceView.getOrientation())
			{
				// ZY X
				case 1 :
					sliceLetters = "ZY";
					break;
				// XZ Y
				case 2 :
					sliceLetters = "XZ";
					break;
				// XY Z
				default :
					sliceLetters = "XY";
			}
			return filePrefix + sliceLetters + 
				(sliceView.getFirstSlice().getSlicesIdOffset() +
				sliceId) + ".png";
		},

		__createReorderingWindow : function () {
			var list;
			var currentListItem;
			var myWindow = new qx.ui.window.Window();

			myWindow.set({
				layout : new qx.ui.layout.VBox(),
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

			for (var i = 0; i < this.__labels.length; i++) {
				var label = this.__labels[i];
				var item = new qx.ui.form.ListItem(label.label+"-"+label.labelName);
				item.setUserData("label", label);
				list.add(item);
			}

			// Create drag indicator
			var indicator = new qx.ui.core.Widget;
			indicator.setDecorator(new qx.ui.decoration.Decorator().set({
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

			list.addListener("dragend", function(e) {
				// Move indicator away
				indicator.setDomPosition(-1000, -1000);
			});


			list.addListener("drag", function(e) {
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

				var origCoords2 = list.getContentLocation();
				var origCoords = orig.getContentLocation();

				indicator.setWidth(orig.getBounds().width);
				indicator.setDomPosition(origCoords.left-origCoords2.left,
							 origCoords.top-origCoords2.top);
			});

			list.addListener("dragover", function(e) {
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

			function reorderList (listItem) {
				// Only continue if the target is a list item.
				if (listItem.classname != "qx.ui.form.ListItem") {
					return ;
				}

				var sel = list.getSortedSelection();

				for (var i =0, l = sel.length; i < l; i++) {
					list.addBefore(sel[i], listItem);

				// recover selection as it get lost during child move
					list.addToSelection(sel[i]);
				}
			}
			myWindow.open();
			myWindow.addListener("close", function () {
				this.__labels = [];
				var labels = list.getChildren();
				for (var i = 0; i < labels.length; i++) {
					this.__labels.push(labels[i].getUserData("label"));
				}
				list.destroy();
				indicator.destroy();
				myWindow.destroy();
				this.__rebuildLabelsList();
			}, this);
		}
	}
});

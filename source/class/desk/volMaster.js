/*
#ignore(Detector)
#ignore(Uint8Array)
*/
qx.Class.define("desk.volMaster", 
{
	extend : qx.core.Object,
	
	construct : function(globalFile, globalFileBrowser)
	{	
		
        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		this.__file = globalFile;

		this.__fileBrowser = globalFileBrowser;

		var gridLayout=new qx.ui.layout.Grid(3,3);
		for (var i=0;i<2;i++) {
			gridLayout.setRowFlex(i,1);
			gridLayout.setColumnFlex(i,1);
		}

		var gridContainer=new qx.ui.container.Composite();
		gridContainer.setLayout(gridLayout);
		this.__gridContainer=gridContainer;

		var fullscreenContainer=new qx.ui.container.Composite();
		fullscreenContainer.setLayout(new qx.ui.layout.HBox());
		this.__fullscreenContainer=fullscreenContainer;
		fullscreenContainer.setVisibility("excluded")

		this.__window=new qx.ui.window.Window();
		this.__window.setLayout(new qx.ui.layout.VBox());
		this.__window.setShowClose(true);
		this.__window.setShowMinimize(false);
	//	this.__window.setResizable(true,true,true,true);
		this.__window.setUseResizeFrame(true);
		this.__window.setUseMoveFrame(true);

		this.__window.add(gridContainer, {flex : 1});
		this.__window.add(fullscreenContainer, {flex : 1});

		var width=window.innerWidth;
		var height=window.innerHeight;
		var minSize=height;
		if (minSize>width) {
			minSize=width;
		}
		minSize=Math.round(minSize*0.85);
		
		this.__window.set({width : minSize, height : minSize});
		this.__window.setCaption(globalFile);
		this.__window.open();

		this.__createVolumesList();

		this.__viewers = [];
		this.__nbUsedOrientations = 3;

		this.__addViewers();
		this.addVolume(globalFile);

		this.__addLinkToViewerSupport();
		this.__addDropFileSupport();

		return (this.__viewers); //~ orion test : launch the 3 views at once ! ! !
	},


	events : {
		"removeVolume" : "qx.event.type.Data"
	},


	members :
	{
		__fullscreenContainer : null,
		__gridContainer : null,
		__window : null,
		__volumes : null,
		__viewers : null,

		__nbUsedOrientations : null,

		__file : null,
		__fileBrowser : null,

		applyToViewers : function (theFunction) {
			var viewers=this.__viewers;
			for (var i=0;i<viewers.length;i++) {
				theFunction.apply(viewers[i]);
			}
		},

		getVolumesList : function () {
			return this.__volumes;
		},

		getViewers : function () {
			return this.__viewers;
		},

		__renderAll : function () {
			this.applyToViewers(function () {
				this.render();
			});
		},

		__reorderMeshes : function () {
			var volumes=this.__volumes.getChildren();
			for (var i=0;i<volumes.length;i++) {
				var slices=volumes[i].getUserData("slices");
				for (var j=0;j<slices.length;j++){
					slices[j].setUserData("rank", i);
				}
			}
			this.applyToViewers( function () {
				this.reorderMeshes();
			});
		},

		__createVolumesList : function () {
			this.__volumes=new qx.ui.container.Composite();
			this.__volumes.setLayout(new qx.ui.layout.VBox());
			this.__gridContainer.add(this.__volumes, {row: 1, column: 0});
		},

		__addViewers : function () {
			var gridContainer=new qx.ui.container.Composite();
			var gridLayout=new qx.ui.layout.Grid();
			for (var i=0;i<2;i++) {
				gridLayout.setRowFlex(i,1);
				gridLayout.setColumnFlex(i,1);
			}

			gridContainer.setLayout(gridLayout);
			this.__orientationContainer=gridContainer;

			for(var i=0; i<this.__nbUsedOrientations; i++) {
				var sliceView=  new desk.sliceView(this.__fileBrowser, this, i);
				this.__viewers[i] =sliceView;	
				switch (i)
				{
				case 0 :
					this.__addViewerToGrid(sliceView, 0, 0);
					break;
				case 1 : 
					this.__addViewerToGrid(sliceView, 0, 1);
					break;
				case 2 : 
					this.__addViewerToGrid(sliceView, 1, 1);
					break;
				}
			}
		},

		__orientationContainer : null,

		__addViewerToGrid : function (sliceView, x, y) {
			var fullscreen=false;
			this.__gridContainer.add(sliceView, {row: x, column: y});
			this.__orientationContainer.add(sliceView.getReorientationContainer(), {row: x, column: y});

			var fullscreenButton=new qx.ui.form.Button("+");
			sliceView.getRightContainer().add(fullscreenButton);
			fullscreenButton.addListener("execute", function () {
				if (!fullscreen) {
					fullscreenButton.setLabel("-");
					this.__gridContainer.setVisibility("excluded");
					this.__fullscreenContainer.add(sliceView, {flex : 1});
					this.__fullscreenContainer.setVisibility("visible");
					fullscreen=true;
				}
				else {
					fullscreenButton.setLabel("+");
					this.__fullscreenContainer.setVisibility("excluded");
					fullscreen=false;
					this.__fullscreenContainer.remove(sliceView);
					var size=this.__gridContainer.getInnerSize();
					for (var i=0;i<this.__viewers.length;i++) {
						this.__viewers[i].set ({width : Math.round((size.width-3)/2),
								height : Math.round((size.height-3)/2)});
					}
					this.__gridContainer.add(sliceView, {row: x, column: y});
					this.__gridContainer.setVisibility("visible");

					// render other viewers, fixes issues with window resize
					this.applyToViewers(function () {
						if (this!=sliceView){
							this.addListenerOnce("appear", function () {
								this.render();
							}, this);
						}
					});
				}
			}, this);
		},

		addVolume : function (file, parameters) {
			var _this=this;
			var volumeSlices=[];

			var opacity=1;
			var imageFormat=1;
			
			if (parameters!=null) {
				if (parameters.opacity!=null) {
					opacity=parameters.opacity;
				}
				if (parameters.imageFormat!=null) {
					imageFormat=parameters.imageFormat;
				}
			}

			var volumeListItem=new qx.ui.container.Composite()
			volumeListItem.setLayout(new qx.ui.layout.VBox());
			volumeListItem.setDecorator("main");
			volumeListItem.set({toolTipText : file});
			volumeListItem.setUserData("slices", volumeSlices);
			volumeListItem.setUserData("file", file);

			// drag and drop support
			volumeListItem.setDraggable(true);
			volumeListItem.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("volumeSlices");
				});

			volumeListItem.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					switch (type)
					{
					case "volumeSlices":
						e.addData(type, volumeSlices);
						break;
					default :
						alert ("type "+type+"not supported for drag and drop");
					}
				}, this);


			var shortFileName=file.substring(file.lastIndexOf("/")+1, file.length);

			var labelcontainer=new qx.ui.container.Composite()
			labelcontainer.setLayout(new qx.ui.layout.HBox());
			volumeListItem.add(labelcontainer, {flex : 1});

			var label=new qx.ui.basic.Label(shortFileName);
			label.setTextAlign("left");
			labelcontainer.add(label, {flex : 1});
			labelcontainer.setContextMenu(this.__getVolumeContextMenu(volumeListItem));

			var numberOfRemainingMeshes=this.__nbUsedOrientations;

			for(var i=0; i<this.__nbUsedOrientations; i++) {
				this.__viewers[i].addVolume(file, parameters, ( function (myI) { 
					return (function (volumeSlice) {
						volumeSlices[myI]=volumeSlice;
						numberOfRemainingMeshes--;
						if (numberOfRemainingMeshes==0) {
							_this.__reorderMeshes();
						}
					});
				} ) (i));
			}

			var settingsContainer=new qx.ui.container.Composite();
			settingsContainer.setLayout(new qx.ui.layout.HBox());
			volumeListItem.add(settingsContainer);

			// create hide/show widget
			var hideShowCheckbox=new qx.ui.form.CheckBox();
			hideShowCheckbox.set({value : true,
					toolTipText : "visible/hidden"});
			hideShowCheckbox.addListener("changeValue", function (e) {
				for (var i=0;i<volumeSlices.length;i++) {
					volumeSlices[i].getUserData("mesh").visible=e.getData();
				}
				this.__renderAll();
			}, this)
			settingsContainer.add(hideShowCheckbox);

			// create file format change widget
			var fileFormatBox = new qx.ui.form.SelectBox();
			fileFormatBox.setWidth(60);
			fileFormatBox.set({width : 60,
					toolTipText : "change image format"});
			var SelectJPG = new qx.ui.form.ListItem("jpg");
			SelectJPG.setUserData("imageFormat", 1);
			fileFormatBox.add(SelectJPG);
			var SelectPNG = new qx.ui.form.ListItem("png");
			SelectPNG.setUserData("imageFormat", 0);
			fileFormatBox.add(SelectPNG);
			settingsContainer.add(fileFormatBox);

			if (imageFormat!=1) {
				fileFormatBox.setSelection([SelectPNG]);
			}

			fileFormatBox.addListener("changeSelection", function ( ) {
				imageFormat=fileFormatBox.getSelection()[0].getUserData("imageFormat");
				for (var i=0;i<volumeSlices.length;i++) {
					volumeSlices[i].setImageFormat(imageFormat);
				}
			});

			// create opacity widget
            var opacitySlider = new qx.ui.form.Slider();
			opacitySlider.set({value : opacity*100,
					toolTipText : "change opacity"});
			opacitySlider.addListener("changeValue", function(event)
			{
				for (var i=0;i<volumeSlices.length;i++) {
					volumeSlices[i].getUserData("mesh").material.opacity=event.getData()/100;
				}
				this.__renderAll();
			},this);
			settingsContainer.add(opacitySlider, {flex : 1});

			////Create brightness/contrast fixing
			var brightnessButton = new qx.ui.form.Button(null, "desk/Contrast_Logo_petit.PNG");
			brightnessButton.set({toolTipText : "Click and drag to change brightnes, right-click to reset brightness"});

			var clicked=false;
			var x,y;

			brightnessButton.addListener("mousedown", function(event)	{
				if (event.isRightPressed())
				{
					for (var i=0;i<volumeSlices.length;i++) {
						volumeSlices[i].setBrightnessAndContrast(0,1);
					}
				}
				else
				{
					x=event.getScreenLeft();
					y=event.getScreenTop();
					brightnessButton.capture();
					clicked=true;
				}
			}, this);

			brightnessButton.addListener("mousemove", function(event)	{
				if (clicked)
				{
					var newX=event.getScreenLeft();
					var newY=event.getScreenTop();
					var deltaX=newX-x;
					var deltaY=newY-y;
					var contrast=volumeSlices[0].getContrast();
					var brightness=volumeSlices[0].getBrightness();

					brightness-=deltaY/3;
					contrast+=deltaX/200;
					x=newX;
					y=newY;
					for (var i=0;i<volumeSlices.length;i++) {
						volumeSlices[i].setBrightnessAndContrast(brightness,contrast);
					}
				}
			}, this);

			brightnessButton.addListener("mouseup", function(event)	{
				brightnessButton.releaseCapture()
				clicked=false;
			}, this);

			settingsContainer.add(brightnessButton);

			this.__volumes.add(volumeListItem);
			return (volumeListItem);
		},

		__getVolumeContextMenu : function (volumeListItem) {
				//context menu to edit meshes appearance
			var menu = new qx.ui.menu.Menu;
			var propertiesButton = new qx.ui.menu.Button("properties/orientation");
			propertiesButton.addListener("execute", function (){

				function formatArray(array) {
					var result="[";
					for (var i=0;i<array.length;i++) {
						result+=array[i];
						if (i<array.length-1){
							result+=", ";
						}
					}
					result+="]";
					return result;
				}

				var slice=volumeListItem.getUserData("slices")[0];
				var window=new qx.ui.window.Window();
				window.setCaption(slice.getFileName());
				window.setLayout(new qx.ui.layout.VBox());
				window.setShowClose(true);
				window.setShowMinimize(false);
				window.setResizable(false,false,false,false);
				window.add(new qx.ui.basic.Label("volume : "+slice.getFileName()));
				window.add(new qx.ui.basic.Label("dimensions : "+formatArray(slice.getDimensions())));
				window.add(new qx.ui.basic.Label("extent : "+formatArray(slice.getExtent())));
				window.add(new qx.ui.basic.Label("origin : "+formatArray(slice.getOrigin())));
				window.add(new qx.ui.basic.Label("spacing : "+formatArray(slice.getSpacing())));
				window.add(new qx.ui.basic.Label("scalarType : "+slice.getScalarType()+" ("+slice.getScalarTypeAsString()+")"));
				window.add(new qx.ui.basic.Label("scalar bounds : "+formatArray(slice.getScalarBounds())));
				window.add(new qx.ui.basic.Label("Orientation :"));
				window.add(this.__orientationContainer);
				window.open();
				},this);
			menu.add(propertiesButton);

			var colormapButton = new qx.ui.menu.Button("color map");
			colormapButton.addListener("execute", function () {
				this.__createColormapWindow(volumeListItem);
				},this);
			menu.add(colormapButton);


			if (desk.actions.getInstance().getPermissionsLevel()>0) {
				var paintButton=new qx.ui.menu.Button("segment");
				paintButton.addListener("execute", function () {
					var tools = new desk.segTools(this, this.__file, this.__fileBrowser);
				},this);
				menu.add(paintButton);
			}

			var moveForwardButton = new qx.ui.menu.Button("move forward");
			moveForwardButton.addListener("execute", function () {
				var volumes=this.__volumes.getChildren();;
				for (var index=0;index<volumes.length; index++) {
					if (volumes[index]==volumeListItem) {
						break;
					}
				}

				if (index<volumes.length-1) {
					this.__volumes.remove(volumeListItem);
					this.__volumes.addAt(volumeListItem, index+1);
				}
				this.__reorderMeshes();
				this.__renderAll();
				},this);
			menu.add(moveForwardButton);

			var moveBackwardButton = new qx.ui.menu.Button("move backward");
			moveBackwardButton.addListener("execute", function (){
				var volumes=this.__volumes.getChildren();;
				for (var index=0;index<volumes.length; index++) {
					if (volumes[index]==volumeListItem) {
						break;
					}
				}

				if (index>0) {
					this.__volumes.remove(volumeListItem);
					this.__volumes.addAt(volumeListItem, index-1);
				}
				this.__reorderMeshes();
				this.__renderAll();
				},this);
			menu.add(moveBackwardButton);

			var removeButton = new qx.ui.menu.Button("remove");
			removeButton.addListener("execute", function (){
				this.removeVolume(volumeListItem);
				},this);
			menu.add(removeButton);
			return menu;
		},

		updateVolume : function (volumeListItem) {
			var slices=volumeListItem.getUserData("slices");
			for (var i=0;i<slices.length;i++) {
				slices[i].update();
			}
			
		},

		removeVolume : function (volumeListItem) {
			var slices=volumeListItem.getUserData("slices");
			this.applyToViewers (function () {
				this.removeVolumes(slices);
			});

			this.__volumes.remove(volumeListItem);
			this.fireDataEvent("removeVolume", volumeListItem);
			volumeListItem.dispose();
		},

		__addLinkToViewerSupport : function () {
			var viewers=this.__viewers;

			var menu = new qx.ui.menu.Menu();
			var unLinkButton = new qx.ui.menu.Button("unlink");
			unLinkButton.addListener("execute", function() {
				for (var i=0;i<viewers.length;i++) {
					viewers[i].unLink();
				}
			},this);
			menu.add(unLinkButton);

			for (var i=0;i<viewers.length;i++) {
				var label=viewers[i].getRightContainer().getChildren()[0];
				
				label.setDraggable(true);
				label.addListener("dragstart", function(e) {
					e.addAction("alias");
					e.addType("volView");
					});

				label.setContextMenu(menu);

				label.addListener("droprequest", function(e) {
						var type = e.getCurrentType();
						switch (type)
						{
						case "volView":
							e.addData(type, this);
							break;
						default :
							alert ("type "+type+"not supported for volume drag and drop");
						}
					}, this);
			}

			// enable linking between viewers by drag and drop
			this.__window.setDroppable(true);
			this.__window.addListener("drop", function(e) {
				if (e.supportsType("volView"))
				{
					var volView=e.getData("volView");
					var viewers=this.__viewers;
					var viewers2=volView.__viewers;
					for (var i=0;i<viewers.length;i++) {
						var viewer=viewers[i];
						var orientation=viewer.getOrientation();
						for (var j=0;j<viewers2.length;j++) {
							if (viewers2[j].getOrientation()==orientation) {
								viewer.linkToViewer(viewers2[j]);
							}
						}
					}
				}
			},this);
		},

		__createColormapWindow : function(volumeListItem) {
			var slices=volumeListItem.getUserData("slices");

			var window=new qx.ui.window.Window();
			window.setCaption("colors for "+slices[0].getFileName());
			window.setLayout(new qx.ui.layout.HBox());
			window.setShowClose(true);
			window.setShowMinimize(false);

			var colormapGroup = new qx.ui.form.RadioButtonGroup();
			colormapGroup.setLayout(new qx.ui.layout.VBox());
			window.add(colormapGroup);

			var noColors=new qx.ui.form.RadioButton("grey levels");
			colormapGroup.add(noColors);

			var ramp=new Uint8Array(256);
			var zeros=new Uint8Array(256);
			for (var i=0;i<256;i++) {
				ramp[i]=i;
				zeros[i]=0;
			}

			var redColors=new qx.ui.form.RadioButton("reds");
			colormapGroup.add(redColors);

			var greenColors=new qx.ui.form.RadioButton("greens");
			colormapGroup.add(greenColors);

			var blueColors=new qx.ui.form.RadioButton("blues");
			colormapGroup.add(blueColors);

			var randomRedColors=new qx.ui.form.RadioButton("random reds");
			colormapGroup.add(randomRedColors);

			var randomGreenColors=new qx.ui.form.RadioButton("random greens");
			colormapGroup.add(randomGreenColors);

			var randomBlueColors=new qx.ui.form.RadioButton("random blues");
			colormapGroup.add(randomBlueColors);

			var randomColors=new qx.ui.form.RadioButton("random Colors");
			colormapGroup.add(randomColors);
			var randomRed=new Uint8Array(256);
			var randomGreen=new Uint8Array(256);
			var randomBlue=new Uint8Array(256);

			for (var i=0;i<256;i++) {
				randomRed[i]=Math.floor(Math.random()*255);
				randomGreen[i]=Math.floor(Math.random()*255);
				randomBlue[i]=Math.floor(Math.random()*255);
			}
			var randomColorsArray=[randomRed, randomGreen, randomBlue];

			var currentColors=slices[0].getLookupTables();
			var otherColors=null;
			if (currentColors[0]!=null) {
				otherColors=new qx.ui.form.RadioButton("other");
				colormapGroup.add(otherColors);
				colormapGroup.setSelection([otherColors]);
			}
			else {
				colormapGroup.setSelection([noColors]);
			}

			colormapGroup.addListener("changeSelection", function (e) {
				switch (colormapGroup.getSelection()[0])
				{
				case noColors :
				default :
					for (var i=0;i<slices.length;i++) {
						slices[i].removeLookupTables();
					}
					break;
				case redColors :
					for (var i=0;i<slices.length;i++) {
						slices[i].setLookupTables([ramp, zeros, zeros]);
					}
					break;
				case greenColors :
					for (var i=0;i<slices.length;i++) {
						slices[i].setLookupTables([zeros, ramp, zeros]);
					}
					break;
				case blueColors :
					for (var i=0;i<slices.length;i++) {
						slices[i].setLookupTables([zeros, zeros, ramp]);
					}
					break;
				case randomRedColors :
					for (var i=0;i<slices.length;i++) {
						slices[i].setLookupTables([randomRed, zeros, zeros]);
					}
					break;
				case randomGreenColors :
					for (var i=0;i<slices.length;i++) {
						slices[i].setLookupTables([zeros, randomGreen, zeros]);
					}
					break;
				case randomBlueColors :
					for (var i=0;i<slices.length;i++) {
						slices[i].setLookupTables([zeros, zeros, randomBlue]);
					}
					break;
				case randomColors :
					for (var i=0;i<slices.length;i++) {
						slices[i].setLookupTables(randomColorsArray);
					}
					break;
				case otherColors :
					for (var i=0;i<slices.length;i++) {
						slices[i].setLookupTables(currentColors);
					}
				}
			});
			window.open();
		},

		__addDropFileSupport : function () {
			this.__window.setDroppable(true);
			this.__window.addListener("drop", function(e) {
				if (e.supportsType("fileBrowser")) {
					var fileBrowser=e.getData("fileBrowser");
					var nodes=fileBrowser.getSelectedNodes();
					for (var i=0;i<nodes.length;i++) {
						this.addVolume(fileBrowser.getNodeFile(nodes[i]));
					}
				}

				// activate the window
				var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
				windowManager.bringToFront(this.__window);
			}, this);
		}
	} //// END of   members :

	
}); //// END of   qx.Class.define("desk.volMaster",

/*
#ignore(Detector)
#ignore(Uint8Array)
<<<<<<< HEAD
=======
#asset(desk/Contrast_Logo_petit.PNG)
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
*/
qx.Class.define("desk.volMaster", 
{
	extend : qx.core.Object,
	
<<<<<<< HEAD
	construct : function(globalFile, globalFileBrowser)
=======
	construct : function(globalFile, globalFileBrowser, standAlone, appliCallback)
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
	{	
		
        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }
<<<<<<< HEAD
=======
        
        if(standAlone==false)
			this.__standAlone = standAlone;
        
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
		this.__nbUsedOrientations = 3;
		this.__file = globalFile;

		this.__fileBrowser = globalFileBrowser;

		this.__viewers = [];
		for(var i=0; i<this.__nbUsedOrientations; i++) {
			this.__viewers[i] = new desk.sliceView(this.__fileBrowser, this, i);
		}

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
		this.__window.setUseResizeFrame(true);
		this.__window.setUseMoveFrame(true);

<<<<<<< HEAD
		this.__window.add(this.__getToolBar());
=======
/////////////////////////////////////////////////////////////////////////////
		if(this.__standAlone)
			this.__window.add(this.__getToolBar());
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
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


		this.__createOrientationWindow();
		this.__addViewers();
		this.addVolume(globalFile);

		this.__addDropFileSupport();
<<<<<<< HEAD
		return (this.__viewers); //~ orion test : launch the 3 views at once ! ! !
=======
		
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		if(typeof appliCallback == "function")
			appliCallback(this);
				
//////////////////////////////////////////
		return (this); //~ orion test : launch the 3 views at once ! ! !
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
	},


	events : {
		"removeVolume" : "qx.event.type.Data"
	},

	properties : {
<<<<<<< HEAD
		viewsLayout : { init : "ASC", check: "String", event : "changeViewsLayout", apply : "__applyViewsLayout"}
=======
		//~ viewsLayout : { init : "ASC", check: "String", event : "changeViewsLayout", apply : "__applyViewsLayout"}
		viewsLayout : { init : "123", check: "String", event : "changeViewsLayout", apply : "__applyViewsLayout"}
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
	},

	members :
	{
<<<<<<< HEAD
=======
		__standAlone : true,
		
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
		__fullscreenContainer : null,
		__gridContainer : null,
		__window : null,
		__volumes : null,
<<<<<<< HEAD
		__viewers : null,
=======
		__dataTabs : null,
		__viewers : null,
		__windowsInGridCoord : {
			view1 : {c:0,r:0},
			view2 : {c:1,r:0},
			view3 : {c:0,r:1},
			volList : {c:1,r:1}
		},
		__viewsNames : [],
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b

		__nbUsedOrientations : null,

		__file : null,
		__fileBrowser : null,

<<<<<<< HEAD
=======
		getWindow : function(){
			return this.__window;
		},
		
		getGridContainer : function()
		{
			var volumesGridCoor = this.__windowsInGridCoord.volList;
			this.__gridContainer.setUserData("freeRow", volumesGridCoor.r);
			this.__gridContainer.setUserData("freeColumn", volumesGridCoor.c);
			return this.__gridContainer;
		},
		
		getOrientationWindow : function() {
			return this.__orientationWindow;
		},
		
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
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
<<<<<<< HEAD
			this.__volumes=new qx.ui.container.Composite();
			this.__volumes.setLayout(new qx.ui.layout.VBox());
			this.__gridContainer.add(this.__volumes, {row: 1, column: 0});
=======
			var _this = this;
			this.__volumes=new qx.ui.container.Composite();
			this.__volumes.setLayout(new qx.ui.layout.VBox());
			var volumesGridCoor = this.__windowsInGridCoord.volList;
			this.__gridContainer.add(this.__volumes, {row: volumesGridCoor.r, column: volumesGridCoor.c});
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
		},

		__addViewers : function () {
			for(var i=0; i<this.__nbUsedOrientations; i++) {
<<<<<<< HEAD
				var sliceView=this.__viewers[i];	
				switch (i)
				{
				case 0 :
					this.__addViewerToGrid(sliceView, 0, 0);
					sliceView.setUserData("sliceOrientation", "Axial");
					break;
				case 1 : 
					this.__addViewerToGrid(sliceView, 1, 0);
					sliceView.setUserData("sliceOrientation", "Sagittal");
					break;
				case 2 : 
					this.__addViewerToGrid(sliceView, 1, 1);
					sliceView.setUserData("sliceOrientation", "Coronal");
=======
				var sliceView=this.__viewers[i];
				var viewGridCoor;
				switch (i)
				{
				case 0 :
					viewGridCoor = this.__windowsInGridCoord.view1;
					this.__addViewerToGrid(sliceView, viewGridCoor.r, viewGridCoor.c);
					sliceView.setOrientPlane(this.__viewsNames[0]);
					break;
				case 1 : 
					viewGridCoor = this.__windowsInGridCoord.view2;
					this.__addViewerToGrid(sliceView, viewGridCoor.r, viewGridCoor.c);
					sliceView.setOrientPlane(this.__viewsNames[1]);
					break;
				case 2 : 
					viewGridCoor = this.__windowsInGridCoord.view3;
					this.__addViewerToGrid(sliceView, viewGridCoor.r, viewGridCoor.c);
					sliceView.setOrientPlane(this.__viewsNames[2]);
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
					break;
				}
			}
		},

		__applyViewsLayout : function (layout) {
			var viewers=this.__viewers;
			var gridContainer=this.__gridContainer;
			var orientationContainer=this.__orientationContainer;
			for (var i=0;i<viewers.length;i++)
			{
				gridContainer.remove(viewers[i]);
			}
<<<<<<< HEAD

			orientationContainer.removeAll();
			var x,y;
			for (var i=0;i<3;i++) {
				var viewer;
				var letter=layout.charAt(i);
				for (var j=0;j<viewers.length;j++) {
					viewer=viewers[j];
					if (viewer.getUserData("sliceOrientation").charAt(0)==letter) {
						break;
					}
				}
				switch (i)
				{
				case 0 :
					x=0;
					y=0;
					break;
				case 1 : 
					x=1;
					y=0;
					break;
				case 2 :
					x=1;
					y=1; 
					break;
				}
				gridContainer.add (viewer, {row: y, column: x});
				orientationContainer.add(viewer.getReorientationContainer(), {row: y, column: x});
=======
			orientationContainer.removeAll();
			var r,c;
			for (var i=0;i<3;i++) {
				var viewer;
				//// Use  layout.charAt(i)-1  since layout uses 1,2,3  but  __layoutSelectBoxes  goes from 0 to 2 !
				var letter = this.__layoutSelectBoxes[layout.charAt(i)-1].getSelection()[0].getLabel().charAt(0);
				for (var j=0;j<viewers.length;j++)
				{
					viewer=viewers[j];
					if (viewer.getOrientPlane().charAt(0)==letter)
						break;
				}
				var viewGridCoor;
				switch (i)
				{
				case 0 :
					viewGridCoor = this.__windowsInGridCoord.view1;
					r=viewGridCoor.r;
					c=viewGridCoor.c;
					break;
				case 1 : 
					viewGridCoor = this.__windowsInGridCoord.view2;
					r=viewGridCoor.r;
					c=viewGridCoor.c;
					break;
				case 2 :
					viewGridCoor = this.__windowsInGridCoord.view3;
					r=viewGridCoor.r;
					c=viewGridCoor.c;
					break;
				}
				gridContainer.add (viewer, {row: r, column: c});
				orientationContainer.add(viewer.getReorientationContainer(this.__orientationButtonGroup), {row: r, column: c});
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
			}
		},

		__orientationContainer : null,
		__orientationWindow : null,
<<<<<<< HEAD

		__createOrientationWindow : function () {
			var window=new qx.ui.window.Window().set({caption : "Layout and Orientation"});
			window.setLayout(new qx.ui.layout.VBox());


			window.add (new qx.ui.basic.Label("Windows layout :"));
			window.add (new qx.ui.basic.Label("A : Axial; S : Sagittal; C : Coronal"));
			window.add(this.__getChangeLayoutContainer());
			window.add(new qx.ui.core.Spacer(10,30), {flex: 5});

			window.add (new qx.ui.basic.Label("Orientations :"));

=======
		__orientationButtonGroup : null,
		__layoutSelectBoxes : null,

		__createOrientationWindow : function () {
			var _this = this;
			
			_this.__viewsNames[0] = "Axial";
			_this.__viewsNames[1] = "Sagittal";
			_this.__viewsNames[2] = "Coronal";
			
			var window=new qx.ui.window.Window().set({caption : "Layout and Orientation"});
			window.setLayout(new qx.ui.layout.VBox());

			window.add (new qx.ui.basic.Label("Windows layout :"));
			var planesContainer = new qx.ui.container.Composite();
			planesContainer.setLayout(new qx.ui.layout.HBox(5));
			// Creates one item per plane
			var axialItem = new qx.ui.form.ListItem(_this.__viewsNames[0]);
			var sagittalItem = new qx.ui.form.ListItem(_this.__viewsNames[1]);
			var coronalItem = new qx.ui.form.ListItem(_this.__viewsNames[2]);
			var layoutSelectBoxes = [];
			// Define function for change event
			var onChangeSelect = function(event)
			{
				var selectedItem = event.getData()[0];
				var selectItemLabel = selectedItem.getLabel();
				var thisSelectBox = this;
				var tempBoxes = _this.__layoutSelectBoxes;
				var tempLabelPreviousSel = thisSelectBox.getUserData("previousSelect");
				thisSelectBox.setUserData("previousSelect",selectItemLabel);
				var currentLabel;
				var doubledBox;
				var viewers = _this.__viewers;
				var tempViewer;
				var labels2give = [];
				var dirOverLays2get;
				var index = 0;
				while(tempBoxes[index]!=thisSelectBox)
					index++;
				tempViewer = viewers[index];
				tempViewer.setOrientPlane(selectItemLabel);
				for(var i=0; i<3; i++)
				{
					currentLabel = tempBoxes[i].getSelection()[0].getLabel();
					if((currentLabel==selectItemLabel)&&(tempBoxes[i]!=thisSelectBox))
					{
						//// Swtich direction overlays labels
						for(var j=0; j<4; j++)
							labels2give[j] = tempViewer.getOverLays()[j].getValue();
						dirOverLays2get = viewers[i].getOverLays();
						for(var j=0; j<4; j++)
							tempViewer.getOverLays()[j].setValue(dirOverLays2get[j].getValue());
						tempViewer.render();
						for(var j=0; j<4; j++)
							viewers[i].getOverLays()[j].setValue(labels2give[j]);
						viewers[i].render();
						//// Update "prevousSelect" field
						doubledBox = tempBoxes[i];
						var tempSelectables = doubledBox.getSelectables();
						for(var j=0; j<3; j++)
							if(tempSelectables[j].getLabel()==tempLabelPreviousSel)
							{
								doubledBox.setUserData("previousSelect",tempLabelPreviousSel);
								doubledBox.setSelection([tempSelectables[j]]);
								break;
							}
						break;
					}
				}
			};
			// Define function to load items on selectBox
			var setBox = function(inSelectBox, startItemID)
			{
				for(var i=0; i<3; i++)
				{
					var tempItem = new qx.ui.form.ListItem(_this.__viewsNames[i]);
					inSelectBox.add(tempItem);
					if(i==startItemID)
					{
						inSelectBox.setSelection([tempItem]);
						inSelectBox.setUserData("previousSelect", _this.__viewsNames[startItemID]);
					}
				}
			}
			// Create selectBoxes
			var selectBox;
			for(var i=0; i<3; i++)
			{
				planesContainer.add (new qx.ui.basic.Label((i+1) + " : "));
				selectBox = new qx.ui.form.SelectBox();
				layoutSelectBoxes[i] = selectBox;
				setBox(selectBox,i,layoutSelectBoxes);
				selectBox.addListener("changeSelection", onChangeSelect, selectBox);
				planesContainer.add(selectBox, {flex:1});
			}
			this.__layoutSelectBoxes = layoutSelectBoxes;
			window.add(planesContainer);
			
			window.add(new qx.ui.core.Spacer(5,10), {flex: 3});
			window.add(this.__getChangeLayoutContainer(), {flex: 10});
			window.add(new qx.ui.core.Spacer(5,15), {flex: 5});

			window.add (new qx.ui.basic.Label("Orientations :"));
			
			var orientsButtonGroupHBox = new qx.ui.form.RadioButtonGroup();
			orientsButtonGroupHBox.setLayout(new qx.ui.layout.HBox(10));
			var slicesOrButton = new qx.ui.form.RadioButton("Volume Slices");
			slicesOrButton.setUserData("buttonID", 1);
			var anamOrButton = new qx.ui.form.RadioButton("Anatomical Directions");
			anamOrButton.setUserData("buttonID", 2);
			orientsButtonGroupHBox.add(slicesOrButton);
			orientsButtonGroupHBox.add(anamOrButton);
			this.__orientationButtonGroup = orientsButtonGroupHBox;
			var orientsContainer = new qx.ui.container.Composite();
			orientsContainer.setLayout(new qx.ui.layout.HBox());
			orientsContainer.add(this.__orientationButtonGroup);
			window.add(orientsContainer);
			
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
			var gridContainer=new qx.ui.container.Composite();
			var gridLayout=new qx.ui.layout.Grid();
			for (var i=0;i<2;i++) {
				gridLayout.setRowFlex(i,1);
				gridLayout.setColumnFlex(i,1);
			}
			window.add(gridContainer);
			this.__orientationWindow=window;

			gridContainer.setLayout(gridLayout);
			this.__orientationContainer=gridContainer;
		},

<<<<<<< HEAD
		__addViewerToGrid : function (sliceView, x, y) {
=======
		__addViewerToGrid : function (sliceView, r, c) {
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
			var fullscreen=false;
			var width = Math.round((this.__window.getWidth()-3)/2);
			var height = Math.round((this.__window.getHeight()-3)/2);
			sliceView.set({width : width, height : height});
<<<<<<< HEAD
			this.__gridContainer.add(sliceView, {row: y, column: x});
			this.__orientationContainer.add(sliceView.getReorientationContainer(), {row: y, column: x});
			sliceView.setUserData("positionInGrid", {row :y , column :x})
=======
			this.__gridContainer.add(sliceView, {row: r, column: c});
			this.__orientationContainer.add(sliceView.getReorientationContainer(this.__orientationButtonGroup), {row: r, column: c});
			sliceView.setUserData("positionInGrid", {row :r , column :c})
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b


			var fullscreenButton=new qx.ui.form.Button("+").set({opacity: 0.5});
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
					this.__gridContainer.add(sliceView, sliceView.getUserData("positionInGrid"));
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
<<<<<<< HEAD
				e.addType("file");
=======
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
				});

			volumeListItem.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					switch (type)
					{
					case "volumeSlices":
						e.addData(type, volumeSlices);
						break;
<<<<<<< HEAD
					case "file":
						e.addData(type, file);
						break;
=======
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
					default :
						alert ("type "+type+"not supported for drag and drop");
					}
				}, this);


			var shortFileName=file.substring(file.lastIndexOf("/")+1, file.length);

			var labelcontainer=new qx.ui.container.Composite()
			labelcontainer.setLayout(new qx.ui.layout.HBox());
			labelcontainer.setContextMenu(this.__getVolumeContextMenu(volumeListItem));
			volumeListItem.add(labelcontainer, {flex : 1});

 			var label=new qx.ui.basic.Label(shortFileName);
 			label.setTextAlign("left");
			labelcontainer.add(label, {flex : 1});

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
				var opacity=event.getData()/100;
				for (var i=0;i<volumeSlices.length;i++) {
					volumeSlices[i].setOpacity(opacity);
				}
			},this);
			settingsContainer.add(opacitySlider, {flex : 1});
<<<<<<< HEAD

			////Create brightness/contrast fixing
			var brightnessButton = new qx.ui.form.Button(null, "desk/Contrast_Logo_petit.PNG");
=======
			
			////Create brightness/contrast fixing
			//~ var brightnessButton = new qx.ui.form.Button(null, "desk/Contrast_Logo_petit.PNG");
			var brightnessButton = new qx.ui.form.Button(null, "resource/onefit/Contrast_Logo.png");
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
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

					brightness-=deltaY/300;
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
<<<<<<< HEAD

			settingsContainer.add(brightnessButton);
=======
			
			if(!_this.__standAlone)
			{
				var brgthnssCntrstButtons = [];
					brgthnssCntrstButtons[0] = new qx.ui.form.RepeatButton("+", null);
					brgthnssCntrstButtons[0].setUserData("buttonID", "bm");
					brgthnssCntrstButtons[0].setToolTipText("Brightness ++");
					brgthnssCntrstButtons[1] = new qx.ui.form.RepeatButton("-", null);
					brgthnssCntrstButtons[1].setUserData("buttonID", "bl");
					brgthnssCntrstButtons[1].setToolTipText("Brightness --");
					brgthnssCntrstButtons[2] = new qx.ui.form.RepeatButton("+", null);
					brgthnssCntrstButtons[2].setUserData("buttonID", "cm");
					brgthnssCntrstButtons[2].setToolTipText("Contrast ++");
					brgthnssCntrstButtons[3] = new qx.ui.form.RepeatButton("-", null);
					brgthnssCntrstButtons[3].setUserData("buttonID", "cl");
					brgthnssCntrstButtons[3].setToolTipText("Contrast --");
				mouseDownLstnr = function(event)
				{
					if (event.isRightPressed())
					{
						for (var i=0;i<volumeSlices.length;i++)
							volumeSlices[i].setBrightnessAndContrast(0,1);
					}
					else
					{
						x = 0;
						y = 0;
					}
				};
				mouseUpLstnr = function(event)
				{
					x = 0;
					y = 0;
				};
				x = 0;
				y = 0;
				var brtnssSpeed = 5;
				var contrastSpeed = 5;
				buttonExecuteFnct = function(event)
				{
					var newX = x;
					var newY = y;
					var thisButton = this;
					var buttonType = thisButton.getUserData("buttonID");
					switch(buttonType)
					{
						case "bm" :
							newY -= brtnssSpeed;
							break;
						case "bl" :
							newY += brtnssSpeed;
							break;
						case "cm" :
							newX += contrastSpeed;
							break;
						case "cl" :
							newX -= contrastSpeed;
							break;
					}
					var deltaX=newX-x;
					var deltaY=newY-y;
					var contrast=volumeSlices[0].getContrast();
					var brightness=volumeSlices[0].getBrightness();
					brightness-=deltaY/300;
					contrast+=deltaX/200;
					x=newX;
					y=newY;
					for (var i=0;i<volumeSlices.length;i++) {
						volumeSlices[i].setBrightnessAndContrast(brightness,contrast);
					}
				};
				var buttonsContainer = new qx.ui.container.Composite();
					buttonsContainer.setLayout(new qx.ui.layout.HBox());
				for(var i=0; i<brgthnssCntrstButtons.length; i++)
				{
					brgthnssCntrstButtons[i].addListener("mousedown", mouseDownLstnr, brgthnssCntrstButtons[i]);
					brgthnssCntrstButtons[i].addListener("mouseup", mouseUpLstnr, brgthnssCntrstButtons[i]);
					brgthnssCntrstButtons[i].addListener("execute", buttonExecuteFnct, brgthnssCntrstButtons[i]);
					buttonsContainer.add(brgthnssCntrstButtons[i]);
				}
				settingsContainer.add(buttonsContainer);
			}
			else
				settingsContainer.add(brightnessButton);
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b

			this.__volumes.add(volumeListItem);
			return (volumeListItem);
		},

		__getVolumeContextMenu : function (volumeListItem) {
				//context menu to edit meshes appearance
			var menu = new qx.ui.menu.Menu;
			var propertiesButton = new qx.ui.menu.Button("properties");
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
				window.open();
				},this);
			menu.add(propertiesButton);

			var colormapButton = new qx.ui.menu.Button("color map");
			colormapButton.addListener("execute", function () {
				this.__createColormapWindow(volumeListItem);
				},this);
			menu.add(colormapButton);

<<<<<<< HEAD

			if (desk.actions.getInstance().getPermissionsLevel()>0) {
				var paintButton=new qx.ui.menu.Button("segment");
				paintButton.addListener("execute", function () {
					new desk.segTools(this, this.__file, this.__fileBrowser);
				},this);
				menu.add(paintButton);
			}
=======
///////////////////////////////////////////////////////////////////////////////////////////////////
			if(this.__standAlone)
				if (desk.actions.getInstance().getPermissionsLevel()>0) {
					var paintButton=new qx.ui.menu.Button("segment");
					paintButton.addListener("execute", function () {
						new desk.segTools(this, this.__file, this.__fileBrowser);
					},this);
					menu.add(paintButton);
				}
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b

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

		__getToolBar : function () {
			var container=new qx.ui.container.Composite()
			container.setLayout(new qx.ui.layout.HBox());
			container.add(this.__getLinkButton());
			container.add(new qx.ui.core.Spacer(10), {flex: 1});
			container.add(this.__getOrientationButton());
			return (container);
		},

		__getOrientationButton : function () {
			var button=new qx.ui.form.Button("Layout/Orientation");
			button.addListener ("execute", function () {
				this.__orientationWindow.open();
			}, this)
			return (button);
		},

<<<<<<< HEAD
		__getChangeLayoutContainer : function () {
			var _this=this;
			var radioGroup = new qx.ui.form.RadioGroup();

			function getGrid(layout)
			{
				var gridContainer=new qx.ui.container.Composite().set(
							{decorator : "main"});
				var gridLayout=new qx.ui.layout.Grid();
				gridContainer.setLayout(gridLayout);
				for (var i=0;i<2;i++) {
					gridLayout.setRowFlex(i,1);
					gridLayout.setColumnFlex(i,1);
				}
				for (var i=0;i<3;i++)
				{
					var label=new qx.ui.basic.Label(layout.charAt(i));
					switch (i)
					{
						case 0 :
							gridContainer.add(label, {row: 0, column: 0});
							break;
						case 1 :
							gridContainer.add(label, {row: 0, column: 1});
							break;
						case 2 :
							gridContainer.add(label, {row: 1, column: 1});
							break;
					}
				}
				var button = new qx.ui.form.RadioButton();
				gridContainer.add(button, {row: 1, column: 0});
				radioGroup.add(button);
				gridContainer.addListener("click", function () {
					radioGroup.setSelection([button]);
					_this.setViewsLayout(layout);
				});
				return gridContainer;
			}

			var gridContainer=new qx.ui.container.Composite();
			var gridLayout=new qx.ui.layout.Grid();
			gridContainer.setLayout(gridLayout);
			for (var i=0;i<3;i++) {
				gridLayout.setRowFlex(i,1);
				gridLayout.setColumnFlex(i,1);
			}

			gridContainer.add(getGrid("ASC"), {row: 0, column: 0});
			gridContainer.add(getGrid("SAC"), {row: 0, column: 1});
			gridContainer.add(getGrid("CAS"), {row: 0, column: 2});
			gridContainer.add(getGrid("ACS"), {row: 1, column: 0});
			gridContainer.add(getGrid("SCA"), {row: 1, column: 1});
			gridContainer.add(getGrid("CSA"), {row: 1, column: 2});
			radioGroup.setSelection([radioGroup.getChildren()[0]]);
=======
		__getChangeLayoutContainer : function ()
		{
			var _this=this;
			
			var gridContainer=new qx.ui.container.Composite();
			var gridLayout=new qx.ui.layout.Grid();
			for (var i=0;i<3;i++) {
				gridLayout.setRowFlex(i,30);
				gridLayout.setColumnFlex(i,1);
			}
			gridContainer.setLayout(gridLayout);
			
			var viewGridCoor = this.__windowsInGridCoord;
			for(var i=0; i<3; i++)
			{
				var labelsContainer = new qx.ui.container.Composite();
				labelsContainer.set({draggable : true,
									decorator : "main",
									toolTipText : "click and drag to switch views"});
				var lblsContLayout = new qx.ui.layout.HBox(5);
				lblsContLayout.setAlignX("center");
				lblsContLayout.setAlignY("middle");
				labelsContainer.setLayout(lblsContLayout);
				labelsContainer.addListener("dragstart", function(event)
				{
					event.addAction("alias");
					event.addType("thisLabelContainer");
				});
				labelsContainer.addListener("droprequest", function(event)
				{
						var type = event.getCurrentType();
						switch (type)
						{
						case "thisLabelContainer":
							event.addData(type, this);
							break;
						default :
							alert ("type "+type+"not supported for thisLabelContainer drag and drop");
						}
				}, labelsContainer);
				labelsContainer.setDroppable(true);
				labelsContainer.addListener("drop", function(event)
				{
					if (event.supportsType("thisLabelContainer"))
					{
						var droppedLabel = event.getData("thisLabelContainer").getChildren()[0];
						var droppedViewerID = droppedLabel.getValue();
						var selfLabel = this.getChildren()[0];
						var selfViewerID = selfLabel.getValue();
						droppedLabel.setValue(selfViewerID);
						selfLabel.setValue(droppedViewerID);
						var tempGridContChildren = gridContainer.getChildren();
						var layout = "" + tempGridContChildren[0].getChildren()[0].getValue()
										+ tempGridContChildren[1].getChildren()[0].getValue()
										+ tempGridContChildren[2].getChildren()[0].getValue();
						_this.setViewsLayout(layout);
					}
				}, labelsContainer);
				var viewLabel = new qx.ui.basic.Label( ""+(i+1));
				viewLabel.setFont(qx.bom.Font.fromString("20px sans-serif bold"));
				labelsContainer.add(viewLabel);
				//~ var orientPlaneLabel = new qx.ui.basic.Label(_this.__viewsNames[i]);
				//~ orientPlaneLabel.bind("value", _this.__viewers[i], "orientPlane");
				//~ labelsContainer.add(orientPlaneLabel);
				switch (i)
				{
					case 0 :
					gridContainer.add(labelsContainer, {row: viewGridCoor.view1.r, column: viewGridCoor.view1.c});
					break;
					case 1 :
					gridContainer.add(labelsContainer, {row: viewGridCoor.view2.r, column: viewGridCoor.view2.c});
					break;
					case 2 :
					gridContainer.add(labelsContainer, {row: viewGridCoor.view3.r, column: viewGridCoor.view3.c});
					break;
				}
			}
			
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
			return (gridContainer);
		},

		__getLinkButton : function () {
			var menu = new qx.ui.menu.Menu();
			var unLinkButton = new qx.ui.menu.Button("unlink");
			unLinkButton.addListener("execute", function() {
				this.applyToViewers (function () {
					this.unLink();
				});
			},this);
			menu.add(unLinkButton);

			var label=new qx.ui.basic.Label("Link").set({draggable : true,
				decorator : "main", toolTipText : "click and drag to an other window to link"});
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
			return (label);
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
<<<<<<< HEAD
				} else if (e.supportsType("file")) {
					this.addVolume(e.getData("file"));
=======
>>>>>>> ca78c024b57c9e0b2483f09a397aa85ed242d91b
				}

				// activate the window
				var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
				windowManager.bringToFront(this.__window);
			}, this);
		}
	} //// END of   members :

	
}); //// END of   qx.Class.define("desk.volMaster",

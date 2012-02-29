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

		this.__window=new qx.ui.window.Window();
		this.__window.setLayout(gridLayout);
		this.__window.setShowClose(true);
		this.__window.setShowMinimize(false);
		this.__window.setResizable(true,true,true,true);
		this.__window.setUseResizeFrame(true);
		this.__window.setUseMoveFrame(true);

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

		this.__addDropFileSupport();

		return (this.__viewers); //~ orion test : launch the 3 views at once ! ! !

	},

	members :
	{
		__window : null,
		__volumes : null,
		__viewers : null,

		__nbUsedOrientations : null,

		__file : null,
		__fileBrowser : null,

		applyToViewers : function (theFunction) {
			var viewers=this.__viewers;
			for (var i=0;i<viewers.length;i++) {
				theFunction (viewers[i]);
			}
		},

		getVolumesList : function () {
			return this.__volumes;
		},

		getViewers : function () {
			return this.__viewers;
		},

		__reorderMeshes : function () {
			var volumes=this.__volumes.getChildren();
			for (var i=0;i<volumes.length;i++) {
				var slices=volumes[i].getUserData("slices");
				for (var j=0;j<slices.length;j++){
					slices[j].setUserData("rank", i);
				}
			}
			this.applyToViewers( function (sliceView) {
				sliceView.reorderMeshes();
			});
		},

		__createVolumesList : function () {
			var container=new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.VBox());

			var paintButton=new qx.ui.form.ToggleButton("segmentation");
			paintButton.addListener("execute", function (e) {
				var tools = new desk.segTools(this, this.__file, this.__fileBrowser);
			},this);
			
			container.add(paintButton);
			this.__volumes=new qx.ui.container.Composite();
			this.__volumes.setLayout(new qx.ui.layout.VBox());
			container.add(this.__volumes);
			this.__window.add(container, {row: 1, column: 0});
		},

		__addViewers : function () {
			for(var i=0; i<this.__nbUsedOrientations; i++)
			{
				var sliceView=  new desk.sliceView(this.__fileBrowser, this, i);
				this.__viewers[i] =sliceView;	
				switch (i)
				{
				case 0 : 
					this.__window.add(sliceView, {row: 0, column: 0});
					break;
				case 1 : 
					this.__window.add(sliceView, {row: 0, column: 1});
					break;
				case 2 : 
					this.__window.add(sliceView, {row: 1, column: 1});
					break;
				}
			}
		},

		addVolume : function (file, parameters) {
			var _this=this;
			var volumeSlices=[];

			var volumeListItem=new qx.ui.container.Composite()
			volumeListItem.setDecorator("main");
			volumeListItem.setLayout(new qx.ui.layout.VBox());
			var shortFileName=file.substring(file.lastIndexOf("/"), file.length);
			volumeListItem.add(new qx.ui.basic.Label(shortFileName));
			volumeListItem.set({toolTipText : file});
			volumeListItem.setUserData("slices", volumeSlices);

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

			////Create brightness/contrast fixing
			var brightnessButton = new qx.ui.form.Button(null, "desk/Contrast_Logo_petit.PNG");

			brightnessButton.set({toolTipText : "LUMINOSITE/CONTRASTE"});

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

			var fileFormatBox = new qx.ui.form.SelectBox();
			fileFormatBox.setWidth(60);
			var SelectJPG = new qx.ui.form.ListItem("jpg");
			SelectJPG.setUserData("imageFormat", 1);
			fileFormatBox.add(SelectJPG);
			var SelectPNG = new qx.ui.form.ListItem("png");
			SelectPNG.setUserData("imageFormat", 0);
			fileFormatBox.add(SelectPNG);
			settingsContainer.add(fileFormatBox);

			fileFormatBox.addListener("changeSelection", function ( ) {
				var imageFormat=fileFormatBox.getSelection()[0].getUserData("imageFormat");
				for (var i=0;i<volumeSlices.length;i++) {
					volumeSlices[i].setImageFormat(imageFormat);
				}
			});

            var opacitySlider = new qx.ui.form.Slider();
			opacitySlider.setValue(100);
			opacitySlider.addListener("changeValue", function(event)
			{
				for (var i=0;i<volumeSlices.length;i++) {
					volumeSlices[i].getUserData("mesh").material.opacity=event.getData()/100;
				}
				this.applyToViewers(function (viewer) {
					viewer.render();
					});
			},this);
			settingsContainer.add(opacitySlider, {flex : 1});

			var hideShowCheckbox=new qx.ui.form.CheckBox();
			hideShowCheckbox.setValue(true);
			hideShowCheckbox.addListener("changeValue", function (e) {
				for (var i=0;i<volumeSlices.length;i++) {
					volumeSlices[i].getUserData("mesh").visible=e.getData();
				}
				this.applyToViewers(function (viewer) {
					viewer.render();
					});
			}, this)
			settingsContainer.add(hideShowCheckbox);

			this.__volumes.add(volumeListItem);
			return (volumeListItem);
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
		//		if (e.supportsType("volumeSlice"))
		//		{
		//			this.attachVolumeSlice(e.getData("volumeSlice"));
		//		}

				// activate the window
				var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
				windowManager.bringToFront(this.__window);
			}, this);
		}
	} //// END of   members :

	
}); //// END of   qx.Class.define("desk.volMaster",

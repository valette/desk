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
		console.log(width+" "+height);
		var minSize=height;
		if (minSize>width) {
			minSize=width;
		}
		minSize*=0.85;
		
		this.__window.set({width : minSize, height : minSize});
		this.__window.setCaption(globalFile);
		this.__window.open();

		this.__createVolumesList();

		this.__viewers = [];
		this.__nbUsedOrientations = 3;
		this.addVolume(globalFile);

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

		addVolume : function (file) {
			var volumeSlices=[];
			for(var i=0; i<this.__nbUsedOrientations; i++)
			{
				if (this.__viewers[i]==undefined)
				{
					var sliceView=  new desk.sliceView(this.__fileBrowser, this, i);

					sliceView.addVolume(file, ( function (myI) { 
						return (function (volumeSlice) {
							volumeSlices[myI]=volumeSlice;
							});
						} ) (i));

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
				else
				{
					alert ("already one volume present, implement addition TODO");
				}
			}

			var volumeListItem=new qx.ui.container.Composite()
			volumeListItem.setDecorator("main");
			volumeListItem.setLayout(new qx.ui.layout.VBox());
			var shortFileName=file.substring(file.lastIndexOf("/"), file.length);
			volumeListItem.add(new qx.ui.basic.Label(shortFileName));
			volumeListItem.set({toolTipText : file});
			volumeListItem.setUserData("slices", volumeSlices);

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
			this.__volumes.add(volumeListItem);
		}
	} //// END of   members :

	
}); //// END of   qx.Class.define("desk.volMaster",

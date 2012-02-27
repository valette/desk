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

		this.__createVolumesList();

		this.__viewers = [];
		this.__nbUsedOrientations = 3;
		this.addVolume(globalFile);

		this.__tools = new desk.segTools(this, globalFile, globalFileBrowser);;	
		this.setToolsReady(true);	

		return (this.__viewers); //~ orion test : launch the 3 views at once ! ! !

	},

	properties : {
		toolsReady : { init : false, check: "Boolean", event : "changeToolsReady"}
	},

	members :
	{
		__volumes : null,

		__viewers : null,
		
		__nbUsedOrientations : null,
		
		__tools : null,
		
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

		getTools : function () {
			return this.__tools;
		},

		getViewers : function () {
			return this.__viewers;
		},

		__createVolumesList : function () {
			var window=new qx.ui.window.Window();

			window.setLayout(new qx.ui.layout.HBox(5));
			window.setShowClose(true);
			window.setShowMinimize(false);
			window.setResizable(true,true,true,true);
			window.setUseResizeFrame(true);
			window.setUseMoveFrame(true);
			window.set({width : 400, height : 400});
			window.setCaption("volumes");

			this.__volumes= new qx.ui.form.List();
			this.__volumes.set({ selectionMode : "multi" });

			window.add(this.__volumes, {flex : 1});
			window.open();
		},

		addVolume : function (file) {
			var volumeSlices=[];
			for(var i=0; i<this.__nbUsedOrientations; i++)
			{
				if (this.__viewers[i]==undefined)
				{
					this.__viewers[i] = new desk.sliceView(file, this.__fileBrowser, this, i, ( function (myI) { 
						return (function (volumeSlice) {
							volumeSlices[myI]=volumeSlice;
							});
						} ) (i));
					// index test : add lfexibility between orientation (1,2 or 3) and a unique index for each viewer no matter its view orientation
					//					<!> CAUTION : any index must be  <  this.__viewers.length
					this.__viewers[i].setUserData("viewerIndex",i);
				}
				else
				{
					alert ("already one volume present, implement addition TODO");
				}
			}
			var volumeListItem=new qx.ui.form.ListItem(file);
			volumeListItem.setUserData("slices", volumeSlices);
			this.__volumes.add(volumeListItem);
		},
		
		__updateSeeds : function ()
		{
this.debug("------->>>   theMaster.__updateSeeds : function()   !!!!!!!");

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
			for(var i=0; i<theMaster.__viewers.length; i++)
			{
				
				var sliceId=theMaster.__viewers[i].__spinner.getValue();
				//~ var oldSeedSlice=theMaster.__viewers[i].__currentSeedsSlice;
				var oldSeedSlice = theMaster.__viewers[i].__display.depthShift;
				
				var selection = theMaster.__viewers[i].__formatSelectBox.getSelection()[0];
				
				var seedsURL = fileBrowser.getFileURL(tools.getSessionDirectory()+"/"+theMaster.__viewers[i].__getSeedFileName(sliceId))+"?nocache="+
				tools.__seedsTypeSelectBox.getSelection()[0].getUserData("cacheTags")[theMaster.__viewers[i].__display.orientation][sliceId];
				
				// test wether the seed is already loaded. If yes, we need to recreate the Image
				if (oldSeedSlice==sliceId)
					theMaster.__viewers[i].__loadSeeds = new Image();
				
				theMaster.__viewers[i].__loadSeeds.viewer = theMaster.__viewers[i];
				theMaster.__viewers[i].__loadSeeds.Id = sliceId;
				theMaster.__viewers[i].__loadSeeds.onload = function ()
				{
//~ theMaster.debug("231 : >>>>>>>  theMaster.__viewers[i].__loadSeeds.onload   !!!!!!!!!!!!!!!!!!!!!!!!!");
					var thisVolView = this.viewer;
					if(thisVolView.__drawingCanvasParams.drawingContext!=null)
					{
						thisVolView.__clearDrawingCanvas();
						thisVolView.__htmlContextLabels.drawImage(thisVolView.__loadSeeds, 0, 0);
						thisVolView.__drawZoomedCanvas(thisVolView.__display.curCtxtZoom,true);
						//~ thisVolView.__currentSeedsSlice=sliceId;
						thisVolView.__display.depthShift = this.Id;
					}
				};
				
				theMaster.__viewers[i].__loadSeeds.src = seedsURL;
				
			}
			
		},

		////Use a php file to remove the specified file in the server
		__eraseFile : function(file)
        {
this.debug("------->>>   theMaster.__eraseFile : function()   !!!!!!!");

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
			
			var parameterMap={
				"action" : "delete_file",
				"file_name" : file};

			theMaster.__fileBrowser.getActions().launchAction(parameterMap);
		}
	} //// END of   members :

	
}); //// END of   qx.Class.define("desk.volMaster",

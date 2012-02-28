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
				}
				else
				{
					alert ("already one volume present, implement addition TODO");
				}
			}
			var volumeListItem=new qx.ui.form.ListItem(file);
			volumeListItem.setUserData("slices", volumeSlices);
			this.__volumes.add(volumeListItem);
		}
	} //// END of   members :

	
}); //// END of   qx.Class.define("desk.volMaster",

qx.Class.define("desk.VolumeViewer", 
{
	extend : desk.MPRContainer,

    construct : function(file, parameters, callback)
	{
        this.base(arguments);
		parameters = parameters || {};

        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }

		var myWindow = new qx.ui.window.Window();
		this.__window = myWindow;
		myWindow.set ({layout : new qx.ui.layout.VBox(),
			showClose : true,
			showMinimize : false,
			useResizeFrame : true,
			useMoveFrame : true});

		var width=window.innerWidth;
		var height=window.innerHeight;
		var minSize=height;
		if (minSize>width) {
			minSize=width;
		}
		minSize=Math.round(minSize*0.85);
		
		myWindow.set({width : minSize, height : minSize});
        myWindow.add(this, {flex : 1});
		myWindow.open();
		myWindow.center();

		if (file) {
			this.addVolume(file, parameters, callback);
			myWindow.setCaption(file);
		}
		return (this);
	}
});

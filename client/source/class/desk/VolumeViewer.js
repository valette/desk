qx.Class.define("desk.VolumeViewer", 
{
	extend : desk.MPRContainer,

    construct : function(file, parameters, callback)
	{
        //~ this.base(arguments);
        this.base(arguments, file, parameters, callback);

        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }

		var win = new qx.ui.window.Window();
		this.__window = win;
		win.set ({layout : new qx.ui.layout.VBox(),
			showClose : true,
			showMinimize : false,
			useResizeFrame : true,
			useMoveFrame : true
		});

		win.addListener('close', function (){this.destroy();}, this);

		var width = window.innerWidth;
		var height = window.innerHeight;
		var minSize = height;
		if (minSize > width) {
			minSize = width;
		}
		minSize = Math.round(minSize * 0.85);
		
		win.set({width : minSize, height : minSize});
        win.add(this, {flex : 1});
		win.open();
		win.center();

		if (file) {
			win.setCaption(file);
		}

		return (this);
	}
});

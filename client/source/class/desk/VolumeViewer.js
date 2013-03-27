/**
 * A Standalone volume viewer. It it simply a desk.MPRContainer embeded in a window
*/
qx.Class.define("desk.VolumeViewer", 
{
	extend : desk.MPRContainer,

    construct : function(file, parameters, callback)
	{
        this.base(arguments, file, parameters, callback);
		var win = new qx.ui.window.Window();
		this.__window = win;
		win.set ({layout : new qx.ui.layout.VBox(),
			showClose : true,
			showMinimize : false,
			useResizeFrame : true,
			useMoveFrame : true
		});

		win.addListener('close', function (){
			this.destroy();
			win.destroy();
		}, this);

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
		this._window = win;

		if (file) {
			win.setCaption(file);
		}
	},

	members : {
		__window : null,

		getWindow : function () {
			return (this.__window);
		},

		close : function () {
			this.__window.close();
		}
	}
});

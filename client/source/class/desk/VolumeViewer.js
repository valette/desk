/**
 * A Standalone volume viewer. It it simply a desk.MPRContainer embeded in a window
*/
qx.Class.define("desk.VolumeViewer", 
{
	extend : desk.MPRContainer,

    construct : function(file, parameters, callback)
	{
        this.base(arguments, file, parameters, callback);
		var win = this.__window = new qx.ui.window.Window();
		win.set ({layout : new qx.ui.layout.VBox(),
			showMinimize : false
		});

		win.addListener('close', function (){
			this.destroy();
			win.destroy();
		}, this);

		var minSize = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.85);
		win.set({width : minSize, height : minSize});
		win.add(this, {flex : 1});
		win.open();
		win.center();

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

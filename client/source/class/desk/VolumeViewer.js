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
		var minSize = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.85);

		win.set ({layout : new qx.ui.layout.HBox(), width : minSize,
			height : minSize, showMinimize : false
		});

		win.addListener('close', function (){
			this.destroy();
			win.destroy();
		}, this);

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

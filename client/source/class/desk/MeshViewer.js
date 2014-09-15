/**
 * A Standalone mesh viewer. It it simply a desk.SceneContainer embeded in a window
*/
qx.Class.define("desk.MeshViewer", 
{
	extend : desk.SceneContainer,

	construct : function(file, parameters, callback, context)
	{
        this.base(arguments);
		var minSize = Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.85);

		var win = new qx.ui.window.Window();
		win.set({layout : new qx.ui.layout.HBox(), showMinimize : false,
			width : minSize, height : minSize});

        win.add(this, {flex : 1});
        win.open();
		win.center();
		this.__window = win;

		win.addListener('close', function() {
			this.fireEvent("close")
			this.dispose();
			win.destroy();
		}, this);

        if (file) {
            win.setCaption(file);
            this.addFile(file, parameters, callback, context);
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

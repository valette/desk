/**
 * A Standalone mesh viewer. It it simply a desk.SceneContainer embeded in a window
*/
qx.Class.define("desk.MeshViewer", 
{
	extend : desk.SceneContainer,

	construct : function(file, parameters, callback, context)
	{
        this.base(arguments);
		var win = new qx.ui.window.Window();
		win.set({layout : new qx.ui.layout.VBox(),
			showClose : true,
			width : 600,
			height : 400,
			showMinimize : false,
			useResizeFrame : true,
			useMoveFrame : true,
			contentPadding : 2
		});
        win.add(this, {flex : 1});
        win.open();
		win.center();
		this.__window = win;

		win.addListener('close', function() {
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

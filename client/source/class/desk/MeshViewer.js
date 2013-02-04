/*
#asset(desk/camera-photo.png)
@lint ignoreUndefined(THREE.*)
#ignore(requestAnimationFrame)
#ignore(Detector)
#ignore(Uint8Array)
@lint ignoreGlobal(THREE)
*/
qx.Class.define("desk.MeshViewer", 
{
	extend : desk.SceneContainer,

	construct : function(file, parameters, callback, context)
	{
        this.base(arguments);
		var window = new qx.ui.window.Window();
		window.set({layout : new qx.ui.layout.VBox(),
			showClose : true,
			width : 600,
			height : 400,
			showMinimize : false,
			useResizeFrame : true,
			useMoveFrame : true,
			contentPadding : 2});
		window.setResizable(true, true, true, true);
		window.addListener("close", function(e) {
			this.removeAllMeshes();
			this.unlink();
			this.fireEvent("close");
		},this);
		this.__window = window;

        window.add(this, {flex : 1});

        window.open();
		window.center();
		window.addListener('close', function() {this.destroy();});
        if (file) {
            window.setCaption(file);
            this.addFile(file, parameters, callback, context);
        }

		return (this);
	},

    members : {
        __window : null,
        
        getWindow : function () {
            return this.__window;
        },
        
		getMainPane : function()
		{
			this.__window.exclude();
			return this;
		}
		
	}
});

qx.Class.define("desk.ImageViewer", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
	{
		this.base(arguments);
		this.setLayout(new qx.ui.layout.VBox());
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);
		this.setCaption(file);

		var url = desk.FileSystem.getFileURL(file);
		this.__image = new qx.ui.basic.Image(url + '?nocache=' + Math.random());
		this.add(this.__image,{flex : 1});

		this.open();
	},

	members : {
		__image : null
	}
});

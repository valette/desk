qx.Class.define("desk.imageView", 
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

		var url=desk.FileSystem.getInstance().getFileURL(file);
		this.__image=new qx.ui.basic.Image(url+"?nocache="+Math.random());
	//	this.__image.setScale(true);
		this.add(this.__image,{flex : 1});

		this.open();
		return (this);
	},

	members : {
		__image : null
	}
});

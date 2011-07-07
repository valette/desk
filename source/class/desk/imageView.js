qx.Class.define("desk.imageView", 
{
  extend : qx.ui.window.Window,

	construct : function(file,timestamp)
	{
		this.base(arguments);

		this.setLayout(new qx.ui.layout.VBox());
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);
		this.setCaption(file);

		if (timestamp!=null)
			this.__image=new qx.ui.basic.Image(file+"?nocache="+timestamp);
		else
			this.__image=new qx.ui.basic.Image(file);

		this.__image.setScale(true);
		this.add(this.__image,{flex : 1});

		this.open();
		return (this);
	},

	members : {
		__image : null
	}
});

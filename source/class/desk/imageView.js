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
		this.setWidth(400);
		this.setHeight(400);
		this.setCaption(file);

		if (timestamp!=null)
			this.__image=new qx.ui.basic.Image(file+"?nocache="+timestamp);
		else
			this.__image=new qx.ui.basic.Image(file);

		this.__image.setScale(true);
		this.add(this.__image,{flex : 1});

//		var html1 = "<img src=\""+file+"\"><\/img>"
//		var embed1 = new qx.ui.embed.Html(html1);
//		this.add(embed1,{flex:1});

		this.open();
		return (this);
	},

	members : {
		__image : null
	}
});

qx.Class.define("desk.meshView", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
	{
		this.base(arguments);

		var win = new qx.ui.window.Window(file);

		var layout = new qx.ui.layout.VBox();
		win.setLayout(layout);
		win.setAllowClose(true);
		win.setAllowMinimize(false);
		win.setResizable(true,true,true,true);
		win.setContentPadding(0);
		win.open();

		var iframe = new qx.ui.embed.Iframe().set({
			width: 400,
			height: 300,
			minWidth: 200,
			minHeight: 150,
			source: "http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?"+file,
			decorator : null
			});
		win.add(iframe, {flex: 1});
	},

  	members : {
    __list : null,
    __textarea : null,

    
    getList : function() {
      return this.__list;
    },
    
    
    clearPostMessage : function() {
      this.__textarea.setValue(null);
    }
  }
});

qx.Class.define("desk.textEditor", 
{
  extend : qx.ui.window.Window,

	construct : function(file, fileBrowser)
	{
		this.base(arguments);

		this.setLayout(new qx.ui.layout.VBox());
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);
		this.setCaption(file);

		var xmlhttp=new XMLHttpRequest();
		xmlhttp.open("GET",fileBrowser.getNodeURL(file)+"?nocache=" + Math.random(),false);
		xmlhttp.send();
		var text=xmlhttp.responseText;

		this.__textArea = new qx.ui.form.TextArea(text);
		this.add(this.__textArea,{flex : 1});
		this.open();
		return (this);
	},

	members : {
		__textArea : null
	}
});

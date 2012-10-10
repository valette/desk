qx.Class.define("desk.TextEditor", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
	{
		this.base(arguments);
		this.setLayout(new qx.ui.layout.VBox());
		this.setHeight(500);
		this.setWidth(500);
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);

		this.__reloadButton = new qx.ui.form.Button("Reload");
		this.__reloadButton.addListener("execute", function(e) {
			this.openFileURL(this.__fileURL);
			}, this);

		this.add(this.__reloadButton);

		this.__textArea = new qx.ui.form.TextArea();
		this.add(this.__textArea,{flex : 1});
		this.open();

		this.openFileURL(desk.Actions.getInstance().getFileURL(file));
		return (this);
	},

	members : {
		__textArea : null,
		__fileURL : null,
		__reloadButton : null,

		openFileURL : function (fileURL)
		{
			this.__fileURL=fileURL;
			this.__reloadButton.setEnabled(false);
			var req = new qx.io.request.Xhr(this.__fileURL+"?nocache=" + Math.random());
			req.setAsync(true);
			req.addListener('load', function (e){
				this.__textArea.setValue(req.getResponseText());
				this.setCaption(fileURL);
				this.__reloadButton.setEnabled(true);
				}, this);
			req.send();
		}
	}
});

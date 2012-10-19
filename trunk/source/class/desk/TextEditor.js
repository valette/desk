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
			this.openFile(this.__file);
			}, this);

		var saveButton = new qx.ui.form.Button("Save");
		saveButton.addListener("execute", function(e) {
			saveButton.setEnabled(false);
			desk.FileSystem.writeFile(this.__file, this.__textArea.getValue(),
				function () {saveButton.setEnabled(true);});
			}, this);

		var buttonsContainer = new qx.ui.container.Composite;
		buttonsContainer.setLayout(new qx.ui.layout.HBox());
		buttonsContainer.add(this.__reloadButton, {flex : 1});
		buttonsContainer.add(saveButton);
		this.add(buttonsContainer);

		this.__textArea = new qx.ui.form.TextArea();
		this.add(this.__textArea,{flex : 1});
		this.open();

		this.openFile(file);
		return (this);
	},

	members : {
		__textArea : null,
		__file : null,
		__reloadButton : null,

		openFile : function (file)
		{
			this.__file = file;
			this.__reloadButton.setEnabled(false);
			var fileURL = desk.FileSystem.getInstance().getFileURL(file);
			var req = new qx.io.request.Xhr(fileURL + "?nocache=" + Math.random());
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

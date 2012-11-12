/**
 * A simple text editor that can also execute javascript code
 */
qx.Class.define("desk.TextEditor", 
{
  extend : qx.ui.window.Window,

	/**
	* Creates a new text editor window
	*
	* @param file {String} the file to edit
	*/
	construct : function(file)
	{
		this.base(arguments);
		this.setLayout(new qx.ui.layout.VBox());
		this.setHeight(400);
		this.setWidth(500);
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);

		this.__reloadButton = new qx.ui.form.Button("Reload");
		this.__reloadButton.setKeepFocus(true);
		this.__reloadButton.addListener("execute", function(e) {
			this.openFile(this.__file);
		}, this);

		var saveButton = new qx.ui.form.Button("Save");
		saveButton.setKeepFocus(true);
		saveButton.addListener("execute", function(e) {
			saveButton.setEnabled(false);
			desk.FileSystem.writeFile(this.__file, this.__textArea.getCode(),
				function () {saveButton.setEnabled(true);});
		}, this);

		this.__executeButton = new qx.ui.form.Button("execute");
		this.__executeButton.setKeepFocus(true);
		this.__executeButton.addListener("execute", this.__onExecute, this);

		var spinner = new qx.ui.form.Spinner(5, 15, 50);
		spinner.addListener('changeValue', function (e) {
			this.__textArea.setFont(qx.bom.Font.fromString(e.getData() + ' serif'));
		}, this);

		var buttonsContainer = new qx.ui.container.Composite();
		buttonsContainer.setLayout(new qx.ui.layout.HBox());
		buttonsContainer.add(this.__executeButton, {flex : 1});
		buttonsContainer.add(this.__reloadButton, {flex : 1});
		buttonsContainer.add(saveButton, {flex : 1});
//		buttonsContainer.add (spinner);
		this.add(buttonsContainer);

		var textArea = new desk.AceContainer(function () {
			if (file) {
				this.openFile(file);
			}
		}, this);

		this.__textArea = textArea;
		this.open();
		this.center();

		var pane = new qx.ui.splitpane.Pane("vertical");
		pane.add(textArea, 3);
		pane.add(this.__getLogArea(), 1);
		this.add(pane, {flex : 1});
		return (this);
	},

	statics : {
		codeInTextEditor : null
	},

	members : {
		__textArea : null,
		__file : null,
		__reloadButton : null,
		__executeButton : null,
		__logArea : null,

		__scriptContainer : null,

		__onExecute : function() {
			desk.TextEditor.codeInTextEditor = null;
			var bodyContainer = document.getElementsByTagName('body')[0];
			var scriptContainer = this.__scriptContainer;
			if (scriptContainer) {
				bodyContainer.removeChild(scriptContainer);
			}
			scriptContainer = this.__scriptContainer = document.createElement('script');
			scriptContainer.setAttribute('type','text/javascript');
			scriptContainer.text = 'desk.TextEditor.codeInTextEditor = function(console){' +
						this.__textArea.getCode() + '};';
			bodyContainer.appendChild(scriptContainer);

			this.__clearLog();

			var that = this;
			if (desk.TextEditor.codeInTextEditor){
				try{
					desk.TextEditor.codeInTextEditor({log : function (m) {
							console.log(m);
							that.__log(m);
						}
					});
				}
				catch (error) {
					this.__log('ERROR : ' + error.message + '\n' + error.stack, 'red');
					throw(error);
				}
			} else {
				alert('Error while parsing your code, please check syntax');
			}
		},

		__getLogArea : function () {
			var logArea = new qx.ui.embed.Html('');
			logArea.set(
			{
				visibility : 'excluded',
				backgroundColor : "white",
				overflowY : "scroll",
				overflowX : "auto",
				font : "monospace",
				padding: 3
			});
			this.__logArea = logArea;
			return logArea;
		},

		__clearLog : function () {
			this.__logArea.setHtml('');
			this.__logArea.setVisibility('excluded');
		},

		__log : function (message, color) {
			var logArea = this.__logArea;
			logArea.setVisibility('visible');

			message = message.replace(' ', '&nbsp');
			var htmlMessage = '';
			var lines = message.split('\n');
			for (var i = 0; i < lines.length; i++) {
				var line = lines[i] + '<br/>';
				if (color) {
					htmlMessage += '<span style="color:' + color + '">' + line + '</span>';
				} else {
					htmlMessage += line;
				}
			}
			logArea.setHtml(logArea.getHtml() + htmlMessage);
			logArea.getContentElement().scrollToY(1000000); 
		},

		/**
		* Opens a file
		*
		* @param file {String} the file to edit
		*/
		openFile : function (file)
		{
			if (file.substring(file.length - 3) === '.js') {
				this.__executeButton.setVisibility('visible');
			}
			else {
				this.__executeButton.setVisibility('excluded');
				this.__textArea.useHighlight(false);
			}

			this.__file = file;
			this.__reloadButton.setEnabled(false);
			desk.FileSystem.readFile(file, function (request){
				this.__textArea.setCode(request.getResponseText());
				this.setCaption(file);
				this.__reloadButton.setEnabled(true);
			}, this);
		}
	}
});

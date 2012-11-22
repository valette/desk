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

		var saveButton = this.__saveButton = new qx.ui.form.Button("Save");
		saveButton.setKeepFocus(true);
		saveButton.addListener("execute", this.save, this);

        this.addListener('keydown', function (e) {
            if (e.isCtrlPressed()) {
              if (e.getKeyIdentifier() === 'S') {
                e.preventDefault();
                this.save();
              }
              if (e.getKeyIdentifier() === 'G') {
                e.preventDefault();
                this.__textArea.getAce().findNext();
              }
            }
        }, this);

		this.__executeButton = new qx.ui.form.Button("execute");
		this.__executeButton.setKeepFocus(true);
		this.__executeButton.addListener("execute", this.__onExecute, this);

		var spinner = new qx.ui.form.Spinner(5, 15, 50);
        this.__spinner = spinner;
		spinner.addListener('changeValue', function (e) {
            this.__textArea.setFontSize(e.getData());
        }, this);

		var buttonsContainer = new qx.ui.container.Composite();
		buttonsContainer.setLayout(new qx.ui.layout.HBox());
		buttonsContainer.add(this.__executeButton, {flex : 1});
		buttonsContainer.add(this.__reloadButton, {flex : 1});
		buttonsContainer.add(saveButton, {flex : 1});
        buttonsContainer.add (spinner);
		this.add(buttonsContainer);

		var textArea = new desk.AceContainer(function () {
			if (file) {
				this.openFile(file);
			}
		}, this);

		this.__textArea = textArea;
        this.add(textArea, {flex : 1});
		this.open();
		this.center();
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
        __saveButton : null,
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
			scriptContainer.text = 'desk.TextEditor.codeInTextEditor = function(){' +
						this.__textArea.getCode() + '\n};';
			bodyContainer.appendChild(scriptContainer);

			var that = this;
			if (desk.TextEditor.codeInTextEditor){
					desk.TextEditor.codeInTextEditor();
			} else {
				alert('Error while parsing your code, please check syntax');
			}
		},

        save : function () {
            this.__saveButton.setEnabled(false);
            desk.FileSystem.writeFile(this.__file, this.__textArea.getCode(), function () {
                this.__saveButton.setEnabled(true);
                console.log('file saved');
            }, this);
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
                this.__textArea.useHighlight(true);
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

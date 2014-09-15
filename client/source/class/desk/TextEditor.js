/**
 * A simple text editor that can also execute javascript code
 * @lint ignoreDeprecated (alert)
 */
qx.Class.define("desk.TextEditor", 
{
  extend : qx.ui.window.Window,

	/**
	* Creates a new text editor window
	*
	* @param file {String} the file to edit
	*/
	construct : function(file) {
		this.base(arguments);
		this.set({layout : new qx.ui.layout.VBox(), 
			height :400, width : 500, showMinimize : false});

		this.__reload = new qx.ui.form.Button("Reload");
		this.__reload.addListener("execute", function(e) {
			this.openFile(this.__file);
		}, this);

		var save = this.__save = new qx.ui.form.Button("Save");
		save.addListener("execute", this.save, this);

        this.addListener('keydown', function (e) {
            if (!e.isCtrlPressed()) return;
			switch (e.getKeyIdentifier()) {
				case 'S' : 
					e.preventDefault();
					this.save();
					break;
				case 'G' :
					e.preventDefault();
					this.__text.getAce().findNext();
					break;
				default :
					break;
			}
        }, this);

		this.__execute = new qx.ui.form.Button("execute");
		this.__execute.addListener("execute", this.__onExecute, this);

		this.__fold = new qx.ui.form.Button("F");
		this.__fold.setToolTipText("Fold all");
		this.__fold.addListener("execute", function () {
			this.__text.getAce().getSession().foldAll(null, null, 0);
		}, this);

		var spinner = this.__spinner = new qx.ui.form.Spinner(5, 14, 50);
		spinner.addListener('changeValue', function (e) {
            this.__text.setFontSize(e.getData());
        }, this);

		var container = this.__buttons = new qx.ui.container.Composite();
		container.setLayout(new qx.ui.layout.HBox());
		container.add(this.__execute, {flex : 1});
		container.add(this.__reload, {flex : 1});
		container.add(this.__fold);
		container.add(save, {flex : 1});
        container.add(spinner);
		this.add(container);

		this.__text = new desk.AceContainer();
		if (file) {
			this.openFile(file);
		}

        this.add(this.__text, {flex : 1});
		this.open();
		this.center();
        this.addListener('close', this.destroy, this);
	},

	destruct : function(file) {
		this.__removeScript();
		qx.util.DisposeUtil.destroyContainer(this.__buttons);
		this.__text.dispose();
	},

	statics : {
		codeInTextEditor : null,
		codeVersion : 0
	},

	members : {
		__text : null,
		__file : null,

		//buttons
		__reload : null,
		__execute : null,
		__save : null,
		__fold : null,

		__buttons : null,
		__script : null,

		__removeScript : function () {
			if (this.__script) {
				document.getElementsByTagName('body')[0].removeChild(this.__script);
			}
		},

		__onExecute : function() {
			desk.TextEditor.codeInTextEditor = null;
			this.__removeScript();
			var body = document.getElementsByTagName('body')[0];
			this.__script = document.createElement('script');
			this.__script.setAttribute('type','text/javascript');
			this.__script.text = 'desk.TextEditor.codeInTextEditor = function(){' +
				this.__text.getCode() + '\n};' + '\n//@ sourceURL=v' +
				desk.TextEditor.codeVersion + '-' +
				desk.FileSystem.getFileName(this.__file);
			desk.TextEditor.codeVersion++;
			body.appendChild(this.__script);

			if (desk.TextEditor.codeInTextEditor) {
				desk.TextEditor.codeInTextEditor();
			} else {
				alert('Error while parsing your code, please check syntax');
			}
		},

        /**
		* Saves content to file
		*/
		save : function () {
            this.__save.setEnabled(false);
            desk.FileSystem.writeFile(this.__file, this.__text.getCode(), function () {
                this.__save.setEnabled(true);
                console.log('file saved');
            }, this);
        },

		/**
		* Opens a file
		*
		* @param file {String} the file to edit
		*/
		openFile : function (file) {
			this.__execute.setVisibility('excluded');
			this.__fold.setVisibility('visible');
			switch (desk.FileSystem.getFileExtension(file)) {
				case "json":
					this.__text.setMode("json");
					break;
				case "cxx":
				case "cpp":
				case "h":
				case "txx":
				case "c":
					this.__text.setMode("c_cpp");
					break;
				case "html":
					this.__text.setMode("html");
					break;
				case "js" :
					this.__execute.setVisibility('visible');
					this.__text.setMode("javascript");
					break;
				default : 
					this.__fold.setVisibility('excluded');
					break;
			}

			this.__file = file;
			this.__reload.setEnabled(false);
			desk.FileSystem.readFile(file, function (error, result) {
				this.__text.setCode(result);
				this.setCaption(file);
				this.__reload.setEnabled(true);
			}, this, {forceText : true});
		}
	}
});

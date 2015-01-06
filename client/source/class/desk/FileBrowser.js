/**
 * A file browser, with customizable launch options
 * 
 * @ignore (async.each)
 * @lint ignoreDeprecated (alert)
 * @lint ignoreDeprecated (confirm)
 * @asset(desk/tris.png)
 * @asset(desk/img.png)
 * @asset(qx/icon/${qx.icontheme}/22/places/folder.png)
 * @asset(qx/icon/${qx.icontheme}/22/mimetypes/office-document.png)
 * @ignore (_.*)
*/

qx.Class.define("desk.FileBrowser", 
{
	extend : qx.ui.container.Composite,
	/**
	* Creates a new file browser
	* @param baseDir {String} directory to browse. Defaults to "data"
	* @param standAlone {bool} defines whether the container should be
	* embedded in a window or not (default : false).
	*/
	construct : function(baseDir, standAlone) {
		baseDir = baseDir || "data";
		if(baseDir.substr(-1) === '/') {
			baseDir = baseDir.substr(0, baseDir.length - 1);
		}

		this.base(arguments);
		this.__fileBrowsers.push(this);

		this.setLayout(new qx.ui.layout.VBox(8));
		this.__standAlone = standAlone || false;

		this.__actionCallbacks = [];
		this.__actionNames = [];

		this.__files = new qx.ui.tree.VirtualTree(null, "name", "children");
		this.__files.setIconPath("");
		this.__files.setIconOptions(this.__iconOptions);
		this.__files.set({
			draggable : true,
			droppable : true,
			showTopLevelOpenCloseIcons : true,
			selectionMode : "multi"
		});
		this.__files.addListener("open", this.__onOpen, this);

        if (this.__standAlone) {
            this.add(this.__getShortcutsContainer());
        }

		this.add(this.__files, {flex: 1});
		this.__createFilter();

		// add root directory
		this.updateRoot(baseDir);

		this.setFileHandler(this.__defaultFileHandler);
		desk.Actions.init(this.__createDefaultStaticActions, this);

		this.__files.addListener("dbltap", this.__onDbltap, this);
		this.__files.addListener("dragstart", this.__onDragstart, this);
		this.__files.addListener("dragend", this.__onDragEnd, this);
		this.__files.addListener("droprequest", this.__onDropRequest, this);
		this.__files.addListener('drop', this.__onDrop, this);

		// this code is for backwards compatibility, may be removed later
		this.__files.getSelection().addListener("change", function (e) {
			this.__files.fireDataEvent("changeSelection", this.__files.getSelection());
		}, this);

		if (this.__standAlone) {
			var win = this.__window = new qx.ui.window.Window();
			win.set({ShowMinimize : false,
				layout : new qx.ui.layout.VBox(),
				caption : this.__baseDir,
				width : 400,
				height : 500
			});
			win.add(this, {flex : 1});
			win.addListener('close', function () {
				this.destroy();
				win.destroy();
			}, this);
			win.open();
		}
	},

	destruct : function() {
		if (this.__standAlone) {
			this.__window.destroy();
		}
		this.__files.dispose();
		qx.util.DisposeUtil.destroyContainer(this);
		for (var i = 0; i < this.__fileBrowsers.length; i++) {
			if (this.__fileBrowsers[i] === this) {
				this.__fileBrowsers.splice(i, 1);
				return;
			}
		}
	},

	members : {
		__focusedRow : null,

		__iconOptions : {
			converter : function(value, model) {
				if (model.getChildren) {
					return "icon/22/places/folder.png";
				} else {
					var image = "icon/22/mimetypes/office-document.png";
					switch (desk.FileSystem.getFileExtension(model.getName())) {
					case "vtk":
					case "ply":
					case "obj":
					case "stl":
						image = "desk/tris.png";
						break;
					case "mhd":
					case "jpg":
					case "png":
						image = "desk/img.png";
						break;
					default:
						break;
					}
					return image;
				}
			}
		},

		/** 
		* Creates the filter container
		*/
		__createFilter : function () {
			// create the filter bar
			var filterBox = new qx.ui.container.Composite();
			filterBox.setLayout(new qx.ui.layout.HBox(10));
			var filterText = new qx.ui.basic.Label("Filter files :");
			filterBox.add(filterText);
			var filterField = new qx.ui.form.TextField();
			filterField.setValue("");
			filterField.addListener("input", this.__files.refresh, this.__files);
			filterBox.add(filterField, {flex:1});
			this.__filterField = filterField;

			var resetButton = new qx.ui.form.Button("Reset filter");
			resetButton.setAllowGrowY(false);
			resetButton.addListener("execute",function(e){
				filterField.setValue("");
				this.__files.refresh();
			}, this);

			filterBox.add(resetButton);
			this.__files.setDelegate({
				filter : function (node) {
					return node.getChildren || node.getName().toLowerCase()
						.indexOf(filterField.getValue().toLowerCase()) != -1;
				}
			});

			if(this.__standAlone) {
				this.add(filterBox);
			}
		},

		/** 
		* Fired whenever a file is double-clicked
		* @param e {qx.event.type.Event}
		*/
		__onDbltap :  function (e) {
			var node = e.getTarget();
			if (node && node.getModel && e.isLeftPressed() && !e.isCtrlOrCommandPressed()) {
				if (!node.getModel().getChildren && this.__fileHandler) {
					this.__fileHandler(node.getModel().getFullName());
				}
			}
		},

		/** 
		* Fired whenever a directory is opened
		* @param e {qx.event.type.Event}
		*/
		__onOpen : function (e) {
			var node = e.getData();
			this.__expandDirectoryListing(node);
		},

		/** 
		* Fired whenever a directory is closed
		* @param e {qx.event.type.Event}
		*/
		__onClose : function (e) {
			var node = e.getData();
			node.getChildren().removeAll();
			node.getChildren().push(
				qx.data.marshal.Json.createModel({name: "Loading", loading : false})
			);
			this.__files.refresh();
		},

		/** 
		* Fired whenever a file drag starts
		* @param e {qx.event.type.Drag}
		*/
		__onDragstart : function(e) {
			e.addAction("move");
			e.addType("fileBrowser");
			e.addType("file");
			var selection = this.getSelectedFiles();
			var dragged = e.getDragTarget().getModel().getFullName();
			if (_.indexOf(selection, dragged) < 0) {
				selection = [dragged];
			}
			this.__draggedNodes = selection;
		},

		/** 
		* Fired whenever a file drag ends
		* @param e {qx.event.type.Drag}
		*/
		__onDragEnd : function(e) {
			this.__draggedNodes = null;
		},

		/** 
		* Fired at each drop request
		* @param e {qx.event.type.Drop}
		*/
		__onDropRequest : function(e) {
			var type = e.getCurrentType();
			switch (type) {
			case "file":
				e.addData(type, e.getDragTarget().getModel().getFullName());
				break;
			case "fileBrowser":
				e.addData(type, this);
				break;
			default :
				break;
			}
		},

		/** 
		* Fired at each drop
		* @param e {qx.event.type.Drop}
		*/
		__onDrop : function (e) {
			if (!e.supportsType('fileBrowser')) {
				return;
			}

			var browser = e.getData('fileBrowser');
			if (browser === this) {
				return;
			}
			var source = e.getDragTarget().getModel().getFullName();
			var selection = browser.__files.getSelection().toArray()
				.map(function(node) {return node.getFullName()});
			var files;
			if (_.indexOf(selection, source) >= 0) {
				files = selection;
			} else {
				files = [source];
			}
			
			var target = e.getOriginalTarget().getModel();
			var destination = target.getFullName();
			if (!target.getChildren) {
				destination = desk.FileSystem.getFileDirectory(destination);
			}
			var actionType = prompt('Copy or move? \n0 : copy,  1 : move', '0');
			actionType = actionType === '1' ? 'move' : 'copy'

			if (!confirm ('Are you sure you want to ' + actionType + ' move these files:\n' +
					files.join('\n') + 'to :\n' + destination)) return;

			async.each(files, function (file, callback) {
				desk.Actions.getInstance().launchAction({
						action : actionType,
						source : file,
						destination : destination},
						callback);
				}, function (err) {
					var directories = files.map(function (file) {
						return desk.FileSystem.getFileDirectory(file);
					});
					directories.push(destination);
					this.__updateDirectories(directories);
			}.bind(this));
		},

		// array to store all file browsers, usefull for updates
		__fileBrowsers : [],

		// defines whether the file browser is a standalone one
		// i.e. whether it needs to create a window
		__standAlone : false,

		// the window containing the widget when in standalone mode
		__window : null,
		__fileHandler : null,
		__baseDir : null,
		__root : null,
		__files : null,
		__rootId : null,
		__filterField : null,

		__actionNames : null,
		__actionCallbacks : null,

		/** 
		* Creates the top shortcuts
		* @return {qx.ui.container.Composite}
		*/
		__getShortcutsContainer : function() {
			var container = new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.HBox(5));
			var settings = desk.Actions.getInstance().getSettings();
			var dataDirs = settings.dataDirs;
			var permissions = settings.permissions;
			var dirs = Object.keys(dataDirs);
			dirs.sort();
			dirs.forEach(function (dir) {
				if ((dir === "cache") || ((permissions === 0) && (dir ==="actions"))) {
					return;
				}

				var button = new qx.ui.form.Button(dir);
				button.addListener("click", function () {
					this.updateRoot(dir);
				}, this);
				container.add(button, {flex : 1});
				var menu = new qx.ui.menu.Menu();
				var openButton = new qx.ui.menu.Button('open in new window');
				openButton.addListener('execute', function (e) {
					var browser = new desk.FileBrowser(dir, true);
					browser.getWindow().center();
				});
				menu.add(openButton);
				button.setContextMenu(menu);
			}, this);
			return container;
		},

		/** Returns the window containing the container in standalone mode
		* @return {qx.ui.window.Window} the file browser window
		*/
		getWindow : function() {
			return this.__window;
		},

		/**
		* Returns the field used to filter files
		* @return {qx.ui.form.TextField} the filter field
		*/
		getFileFilter : function() {
			return this.__filterField;
		},
		
		/**
		* returns the directory for the given file, session type and Id
		* @param file {String} file
		* @param sessionType {String} type of session
		* @param sessionId {Int} Id for the session
		* @return {String} session directory
		*/
		getSessionDirectory : function (file,sessionType,sessionId) {
			return file + "." + sessionType + "."+sessionId;
		},

		/**
		* Updates/changes the root
		* @param newRoot {String} new root
		*/
		updateRoot : function (newRoot) {
			this.__baseDir = newRoot || this.__baseDir;

			this.__root = qx.data.marshal.Json.createModel({
				name: this.__baseDir,
				fullName : this.__baseDir,
				children: [],
				icon: "default",
				loading: false
			}, true);

			if (this.__window) {
				this.__window.setCaption(newRoot);
			}
			this.__root.getChildren().push(
				qx.data.marshal.Json.createModel({name: "Loading", loading : false})
			);
			this.__files.setModel(this.__root);
		},

		/**
		* Handles file double-click
		* @param file {String} file to handle
		*/
		__defaultFileHandler : function (file) {
			var extension = desk.FileSystem.getFileExtension(file);
			switch (extension)
			{
			case 'js':
				if (desk.Actions.getInstance().getSettings().permissions) {
					desk.FileSystem.executeScript(file);
				} else {
					new desk.TextEditor (file);
				}
				break;
			case 'log':
			case 'txt':
			case 'cpp':
			case 'cxx':
			case 'h':
				new desk.TextEditor (file);
				break;
			case "vtk":
			case "ply":
			case "obj":
			case "stl":
			case "ctm":
			case "off":
				new desk.MeshViewer(file);
				break;
			case "xml":
				desk.FileSystem.readFile(file, function (error, xmlDoc) {
					if (xmlDoc.getElementsByTagName("mesh").length !== 0) {
						new desk.MeshViewer(file);
					} else {
						alert ('xml file of unknown type!');
					}
				});
				break;
			case "png":
			case "jpg":
			case "bmp":
			case "mhd":
				new desk.VolumeViewer(file);
				break;
			case "vol": 
				if (desk.Actions.getInstance().getAction("vol_slice") != null) {
					new desk.VolumeViewer(file);
				} else {
					console.log("vol_slice action does not exist. Skipping this filetype handler.")
				}
				break;
			case "json":
				desk.Action.CREATEFROMFILE(file);
				break;
			default:
				alert("no file handler exists for extension "+extension);
				break;
			}				
		},

		/**
		* Launches the simple volume viewer
		* @param node {Objecy} file node
		*/
		__volViewSimpleAction : function (node) {
			if (!node.getChildren) {
				new desk.VolViewSimple(node.getFullName());
			} else {
				alert("Cannot view a directory!");
			}
		},

		/**
		* Launches the file download
		* @param node {Objecy} file node
		*/
		__downloadAction : function (node) {
			if (!node.getChildren) {
				var iframe = qx.bom.Iframe.create({
					name : "testFrame" + Math.random(),
					src : desk.FileSystem.getActionURL('download') +
						'?file=' + node.getFullName()
				});

				qx.bom.Element.addListener(iframe, "load", function(e) {
					iframe.dispose();
				});

				document.body.appendChild(iframe);
			} else {
				alert("Cannot download a directory!");
			}
		},

		/**
		* Launches an uploader 
		* @param node {Objecy} file node
		*/
		__uploadAction : function (node) {
			var dir = node.getFullName();
			if (!node.getChildren) {
				dir = desk.FileSystem.getFileDirectory(dir);
			}
			var uploader = new desk.Uploader(dir);
			uploader.addListener("upload",
				_.throttle(function () {
					this.__expandDirectoryListing(node);
				}.bind(this), 2000)
			);
		},

		/**
		* Creates a directory
		* @param node {Objecy} file node
		*/
		__newDirectoryAction : function (node) {
			var dir = node.getFullName();
			if (!node.getChildren) {
				dir = desk.FileSystem.getFileDirectory(dir);
			}
			var newDir = prompt('Name of the directory to create','new_dir');
			if (!newDir) return;
			desk.Actions.getInstance().launchAction({
				"action" : "create_directory",
				"directory" : dir + '/' + newDir},
				function () {
					this.updateDirectory(dir);
			}, this);
		},

		/**
		* Deletes a file/directory
		* @param node {Objecy} file node
		*/
		__deleteAction : function (node) {
			var nodes = this.__files.getSelection().toArray();
			var message = 'Are you shure you want to delete those files/directories? \n';
			var dirs = nodes.map(function (node) {
				var file = node.getFullName();
				message +=  file + '\n';
				return desk.FileSystem.getFileDirectory(file);
			}, this);
			if (!confirm(message)) return;

			async.each(nodes, function (node, callback) {
				desk.Actions.getInstance().launchAction({
					action : node.getChildren ? 'delete_directory' : 'delete_file',
					file_name : node.getFullName(),
					directory : node.getFullName()},
					callback
				);
			}.bind(this), function (err) {
				this.__updateDirectories(dirs);
			}.bind(this));
		},

		/**
		* Renames file/directory
		* @param node {Objecy} file node
		*/
		__renameAction : function (node) {
			var file = node.getFullName();
			var newFile = prompt('enter new file name : ', desk.FileSystem.getFileName(file));
			if (newFile === null) {
				return;
			}
			var dir = desk.FileSystem.getFileDirectory(file);
			desk.Actions.getInstance().launchAction({
					action : "move",
					source : file,
					destination : dir + newFile
				},
				function () {
					this.updateDirectory(dir);
			}, this);
		},

		/**
		* Creates a new file
		* @param node {Objecy} file node
		*/
		__newFileAction : function (node) {
			var dir = node.getFullName();
			if (!node.getChildren) {
				dir = desk.FileSystem.getFileDirectory(dir);
			}
			var baseName = prompt('enter new file name : ', "newFile");
			if (baseName !== null) {
				desk.FileSystem.writeFile(dir + '/' + baseName, '',
				function () {
					this.updateDirectory(dir);
				}.bind(this));
			}
		},

		/**
		* Launches the text editor on the file
		* @param node {Objecy} file node
		*/
		__viewEditAction : function (node) {
			if (!node.getChildren) {
				new desk.TextEditor(node.getFullName());;
			}
		},

		/**
		* Creates he default menu
		*/
		__createDefaultStaticActions : function () {
			var menu = new qx.ui.menu.Menu();

			// the default "open" button
			var openButton = new qx.ui.menu.Button("Open");
			openButton.addListener("execute", this.__onDbltap, this);

			menu.add(openButton);
			menu.addSeparator();

			var actionsButton = new qx.ui.menu.Button("Actions");
			menu.add(actionsButton);
			menu.addSeparator();

			this.__files.setContextMenu(menu);
			qx.util.DisposeUtil.disposeTriggeredBy(menu, this);
			this.__files.addListener("contextmenu", function (e) {
				actionsButton.setMenu(desk.Actions.getInstance().getActionsMenu(this));
			}, this);

			if (desk.Actions.getInstance().getSettings().permissions < 1) {
				return;
			}

			this.addAction("VolViewSimple", this.__volViewSimpleAction, this);
			this.addAction("download", this.__downloadAction, this);
			this.addAction("upload", this.__uploadAction, this);
			this.addAction("view/edit text", this.__viewEditAction, this);
			this.addAction("new directory", this.__newDirectoryAction, this);
			this.addAction("delete", this.__deleteAction, this);
			this.addAction('rename', this.__renameAction, this);
			this.addAction('new file', this.__newFileAction, this);
		},

		/**
		* Adds a new action in context menu
		* @param actionName {String} : label for the action
		* @param callback {Function} : callback for the action
		* @param context {Object} : optional context for the callback
		*/
		addAction : function (actionName, callback, context) {
			if (this.__actionNames.indexOf(actionName) == -1) {
				this.__actionNames.push(actionName);
			} else {
				console.log ('Warning : action "' + actionName + '" already exists, is overwritten!');
			}

			this.__actionCallbacks[actionName] = callback;

			var button = new qx.ui.menu.Button(actionName);
			button.setUserData("fileBrowser", this);
			button.setUserData("actionName", actionName);
			button.addListener("execute", function (e) {
				var fileBrowser = button.getUserData("fileBrowser");
				var actionName = button.getUserData("actionName");
				var node = fileBrowser.__files.getSelection().getItem(0);
				fileBrowser.__actionCallbacks[actionName].call(context, node);
			}, this);
			this.__files.getContextMenu().add(button);
		},

		/**
		* Changes the callback when a double click is performed
		* @param callback {Function} callback when a file is double clicked
		*/
		setFileHandler : function (callback) {
			this.__fileHandler = callback;
		},

		/**
		* Returns the qx.ui.treevirtual.TreeVirtual underneath
		* @return {qx.ui.treevirtual.TreeVirtual} the virtual tree
		*/
		getTree : function () {
			return this.__files;
		},

		__draggedNodes : null,
	
		/**
		* Returns an array containing currently selected files
		* @return {Array} array of files (strings)
		*/
		getSelectedFiles : function () {
			return this.__draggedNodes || this.__files.getSelection()
				.toArray().map(function(node) {
					return node.getFullName()
				});
		},

		/**
		* Returns the base directory
		* @return {String} base directory
		*/
		getRootDir : function () {
			var baseDir = this.__baseDir + '/';
			if (baseDir.charAt(baseDir.length - 1) === '/') {
				baseDir = baseDir.substring(0, baseDir.length -1);
			}
			return baseDir;
		},

		/**
		* Returns node matching the file string, null if it does not exist
		* @param file {String} the file
		* @return {Object} the file node
		*/
		__getFileNode : function (file) {
			var baseDir = this.getRootDir();
			if (file.indexOf(baseDir) !== 0) {
				return null;
			}
			var inFile = file.substring(baseDir.length + 1);
			var hierarchy = inFile.length ? inFile.split('/') : [""];
			if (hierarchy[hierarchy.length - 1].length === 0) {
				hierarchy.pop();
			}
			var node = this.__root;
			for (var i = 0; i < hierarchy.length; i++) {
				if (!_.find(node.getChildren().toArray(), function (child) {
					if (child.getName() === hierarchy[i]) {
						node = child;
						return true;
					}
					return false;
				})) {
					return null;
				}
			}
			return node;
		},

		/**
		* Updates a directory
		* @param file {String} directory to update
		*/
		updateDirectory : function (file) {
			this.__fileBrowsers.forEach(function (browser) {
				var nodeId = browser.__getFileNode(file);
				if (nodeId) {
					browser.__expandDirectoryListing(nodeId);
				}
			});
		},

		/**
		* Updates directories for all matching file browsers
		* @param files {Array} array of directories/files
		*/
		__updateDirectories : function (files) {
			_.uniq(files).forEach(this.updateDirectory, this);
		},

		/**
		* sorting function to
		* @param a {String} first element to compare
		* @param b {String} second element to compare
		* @return {Boolean} returns true if a < b
		*/
		__caseInsensitiveSort : function (a, b) {
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		},

		/**
		* populates directory node with contained files
		* @param node {Object} directory node to populate
		*/
		__expandDirectoryListing : function(node) {
			var directory = node.getFullName();
			var children = node.getChildren();
			desk.FileSystem.readDir(directory, function (err, files) {
				children.removeAll();
				files.sort(this.__caseInsensitiveSort)
				files.forEach(function (file) {
					file.fullName = directory + "/" + file.name;
					if (file.isDirectory) {
						file.children = [];
						file.loading = false;
						var model = qx.data.marshal.Json.createModel(file);
						children.push(model);
						model.getChildren().push(
							qx.data.marshal.Json.createModel({name: "Loading", loading : false})
						);
					}
				});
				files.forEach(function (file) {
					if (!file.isDirectory) {
						file.loading = false;
						children.push(qx.data.marshal.Json.createModel(file));
					}
				});
				this.__files.refresh();
			}, this);
		}
	}
});

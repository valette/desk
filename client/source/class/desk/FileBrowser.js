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
	* @param baseDir {String} directory to browse. Defaluts to "data"
	* @param standAlone {bool} defines whether the container should be
	* embedded in a window or not (default : false).
	* 
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

		var that = this;

		var delegate = {
			bindItem : function(controller, item, index) {
				controller.bindDefaultProperties(item, index);
				controller.bindProperty("size", "size", null, item, index);
				//controller.bindProperty("mtime", "mtime", null, item, index);

		/*		controller.bindProperty("", "open", {
					converter : function(value, model, source, target) {
						var isOpen = target.isOpen();
						//console.log("open : " + isOpen);
						if (isOpen && !value.getLoaded()) {
							value.setLoaded(true);

							value.getChildren().removeAll();
							console.log("here");
							that.__expandDirectoryListing(value);
						}
						return isOpen;
					}
				}, item, index);*/
			}
		};

		this.__files = new qx.ui.tree.VirtualTree(null, "name", "children");
	//	this.__files.setDelegate(delegate);
	/*	this.__files.setIconPath("icon");
		this.__files.setIconOptions({
			converter : function(value, model) {
				console.log(value);
				console.log(model);
				if (value == "default") {
					if (model.getChildren) {
						return "icon/22/places/folder.png";
					} else {
						var image = "desk/tris.png";//"icon/22/mimetypes/office-document.png";
						/*switch (desk.FileSystem.getFileExtension(model.getName())) {
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
						}*//*
						return image;
					}
				} else {
					return "icon/22/mimetypes/office-document.png";
				}
			}
		});*/
		this.__files.set({
			draggable : true,
			droppable : true,
			showTopLevelOpenCloseIcons : true,
			selectionMode : "multi"
		});
		this.__files.addListener("open", this.__onTreeOpen, this);

        if (this.__standAlone) {
            this.add(this.__getShortcutsContainer());
        }

		this.add(this.__files, {flex: 1});
	//	this.__createFilter();

		// add root directory
		this.updateRoot(baseDir);

		this.setFileHandler(this.__defaultFileHandler);
		desk.Actions.init(this.__createDefaultStaticActions, this);

		this.__files.addListener("dbltap", this.__onDbltap, this);
		this.__files.addListener("dragstart", this.__onDragstart);
		this.__files.addListener("droprequest", this.__onDropRequest, this);
		this.__files.addListener('drop', this.__onDrop, this);

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
		this.__files.getDataModel().dispose();
		this.__files.dispose();
		qx.util.DisposeUtil.destroyContainer(this);
		var browsers = this.__fileBrowsers;
		for (var i = 0; i < browsers.length; i++) {
			if (browsers[i] === this) {
				browsers.splice(i, 1);
				return;
			}
		}
	},

	members : {
		__focusedRow : null,

		__createFilter : function () {
			// create the filter bar
			var filterBox = new qx.ui.container.Composite();
			filterBox.setLayout(new qx.ui.layout.HBox(10));
			var dataModel = this.__files.getDataModel();

			var filterText = new qx.ui.basic.Label("Filter files :");
			filterBox.add(filterText);
			var filterField = new qx.ui.form.TextField();
			filterField.setValue("");
			filterField.addListener("input", function() {
				dataModel.setData();
			},this);
			filterBox.add(filterField, {flex:1});
			this.__filterField = filterField;

			var resetButton = new qx.ui.form.Button("Reset filter");
			resetButton.setAllowGrowY(false);
			resetButton.addListener("execute",function(e){
				filterField.setValue("");
				dataModel.setData();
			});

			filterBox.add(resetButton);
			dataModel.setFilter(function(node) {
				if (!node.getChildren) {
					var label = node.label;
					return label.toLowerCase().indexOf(filterField.getValue().toLowerCase()) != -1;
				}
				return true;
			}.bind(this));
			if(this.__standAlone) {
				this.add(filterBox);
			}
		},

		__onDbltap :  function (e) {
			var node = e.getTarget();
			if (node && node.getModel && e.isLeftPressed() && !e.isCtrlOrCommandPressed()) {
				if (!node.getChildren && this.__fileHandler) {
					this.__fileHandler(node.getModel().getFullName());
				}
			}
		},

		__onTreeOpen : function (e) {
			var node = e.getData();
			this.__expandDirectoryListing(node);
		},

		__savedSelection : null,

		__onDragstart : function(e) {
			e.addAction("move");
			e.addType("fileBrowser");
			e.addType("file");
		},

		__onDropRequest : function(e) {
			var type = e.getCurrentType();
			switch (type) {
			case "file":
				e.addData(type, e.getDragTarget().getModel());
				break;
			case "fileBrowser":
				e.addData(type, this);
				break;
			default :
				break;
			}
		},

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
			destination = target.getFullName();
			if (!target.getChildren) {
				destination = desk.FileSystem.getFileDirectory(destination);
			}
console.log(files);
console.log(destination);
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

        __getShortcutsContainer : function() {
            var container = new qx.ui.container.Composite();
            container.setLayout(new qx.ui.layout.HBox(5));
            var settings = desk.Actions.getInstance().getSettings();
            var dataDirs = settings.dataDirs;
            var permissions = settings.permissions;
            var dirs = Object.keys(dataDirs);
            dirs.sort();
            dirs.forEach(function (dir) {
                if ((dir === "cache") || 
					((permissions === 0) && (dir ==="actions"))) {
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
				})
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
			if (newRoot) {
				this.__baseDir = newRoot;
			}

			this.__root = qx.data.marshal.Json.createModel({
				name: this.__baseDir,
				fullName : this.__baseDir,
				children: [{name : "loading", size : 0, mtime : 0}],
				icon: "default",
				loaded: false
			}, true);

			if (this.__window) {
				this.__window.setCaption(newRoot);
			}
			this.__files.setModel(this.__root);
			this.__files.openNode(this.__root);
		},

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

		__volViewSimpleAction : function (node) {
			if (!node.getChildren) {
				new desk.VolViewSimple(node.getFullName());
			} else {
				alert("Cannot view a directory!");
			}
		},

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

		__newDirectoryAction : function (node) {
			var dir = node.getFullName();
			if (!node.getChildren) {
				dir = desk.FileSystem.getFileDirectory(dir);
			}
			var newDir = prompt('Name of the directory to create','new_dir');
			if (!newDir) return;
			console.log("new dir : " + dir + '/' + newDir);
			desk.Actions.getInstance().launchAction({
				"action" : "create_directory",
				"directory" : dir + '/' + newDir},
				function () {
					this.updateDirectory(dir);
			}, this);
		},

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

		__viewEditAction : function (node) {
			if (!node.getChildren) {
				new desk.TextEditor(node.getFullName());;
			}
		},

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

			if (desk.Actions.getInstance().getPermissionsLevel()<1)
				return;

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
			var location = this.__actionNames.indexOf(actionName);
			if (location == -1) {
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
			return (this.__files);
		},

		/**
		* Returns an array containing currently selected files
		* @return {Array} array of files (strings)
		*/
		getSelectedFiles : function () {
			return this.__files.getSelection().toArray().map(function (node) {
				return node.getFullName();
			}, this);
		},

		__getNodeMTime : function (node) {
			return (this.__files.getDataModel().getColumnData(node.nodeId, 1));
		},

		__getNodeURL : function (node) {
			return (desk.FileSystem.getFileURL(this.__getNodeFile(node)));
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

		__getFileNode : function (file) {
			var baseDir = this.getRootDir();
			console.log("get node from  : " + file);
			if (file.indexOf(baseDir) !== 0) {
				return null;
			}
			var inFile = file.substring(baseDir.length + 1);
			var hierarchy = inFile.length ? inFile.split('/') : [""];
			if (hierarchy[hierarchy.length - 1].length === 0) {
				hierarchy.pop();
			}
			console.log(hierarchy);
			var node = this.__root;
			for (var i = 0; i < hierarchy.length; i++) {
				if (!_.find(node.getChildren().toArray(), function (child) {
					console.log(child.getName() + " **** " + hierarchy[i]);
					if (child.getName() === hierarchy[i]) {
						console.log("ok");
						node = child;
						return true;
					}
					return false;
				})) {
					console.log("no");
					return null;
				}
			}
			console.log("yes");
			console.log(node);
			return node;
		},

		/**
		* Updates a directory
		* @param file {String} directory to update
		*/
		updateDirectory : function (file) {
			console.log(file);
			this.__fileBrowsers.forEach(function (browser) {
				var nodeId = browser.__getFileNode(file);
				if (nodeId) {
					browser.__expandDirectoryListing(nodeId);
				}
			});
		},

		__updateDirectories : function (files) {
			_.uniq(files).forEach(this.updateDirectory, this);
		},

		__caseInsensitiveSort : function (a, b) {
			return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
		},

		__readFileList : function (files, directory) {
			var dataModel = this.__files.getDataModel();
			var filesArray = [];
			var directoriesArray = [];
			var modificationTimes = [];
			var sizes = [];
			var node = this.__getFileNode(directory);
			if (node === null) {
				return;
			}
			var nodeId = node.nodeId;
			dataModel.prune(nodeId,false);

			files.forEach(function (file) {
				var fileName = file.name;

				if (!file.isDirectory) {
					filesArray.push(fileName);
					sizes[fileName] = file.size;
				} else {
					directoriesArray.push(fileName);
				}
				modificationTimes[fileName] = file.mtime;
			});
			directoriesArray.sort(this.__caseInsensitiveSort);
			filesArray.sort(this.__caseInsensitiveSort);

			directoriesArray.forEach(function (directory) {
				dataModel.addBranch(nodeId , directory);
			});

			filesArray.forEach(function (file) {
				var image = null;
				switch (desk.FileSystem.getFileExtension(file)) {
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
				var newNode = dataModel.addLeaf(nodeId, file, image);
				dataModel.setColumnData(newNode, 1, modificationTimes[file]);
				dataModel.setColumnData(newNode, 2, sizes[file]);
			});
			dataModel.setData();
		},

		__expandDirectoryListing : function(node) {
			var directory = node.getFullName();
			var children = node.getChildren();
			children.removeAll();
			desk.FileSystem.readDir(directory, function (err, files) {
				files.sort(this.__caseInsensitiveSort)
				files.forEach(function (file) {
					file.fullName = directory + "/" + file.name;
					if (file.isDirectory) {
						file.children = [{name : "loading", size : 0, mtime : 0}];
						file.loaded = false;
						children.push(qx.data.marshal.Json.createModel(file));
					}
				});
				files.forEach(function (file) {
					if (!file.isDirectory) {
						file.loaded = true;
						children.push(qx.data.marshal.Json.createModel(file));
					}
				});
				this.__files.refresh();
			}, this);
		}
	}
});

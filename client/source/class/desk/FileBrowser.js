/**
 * A file browser, with customizable launch options
 * 
 * @ignore (async.forEach)
 * @lint ignoreDeprecated (alert)
 * @lint ignoreDeprecated (confirm)
 * @asset(desk/tris.png)
 * @asset(desk/img.png)
*/

qx.Class.define("desk.FileBrowser", 
{
	extend : qx.ui.container.Composite,
	/**
	* Creates a new file browser
	* @param baseDir {String} directory to browse. Defaluts to "data"
	* @param standAlone {bool} defines whether the container should be
	* embedded in a window or not (default : true).
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

		if (standAlone === false) {
			this.__standAlone = false;
		} else {
            standAlone = true;   
		}

		qx.Class.include(qx.ui.treevirtual.TreeVirtual, qx.ui.treevirtual.MNode);

		this.__actionCallbacks = [];
		this.__actionNames = [];

		var virtualTree = new qx.ui.treevirtual.TreeVirtual(
			["files","mTime","size"],
			{initiallyHiddenColumns : [1, 2]});
		this.__virtualTree = virtualTree;
		virtualTree.setSelectionMode(qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);
		virtualTree.setUseTreeLines(false);

		virtualTree.set({
			rowHeight: 22,
			alwaysShowOpenCloseSymbol : true,
			columnVisibilityButtonVisible : true,
			draggable : true,
			statusBarVisible : false
		});

		this.__actions = desk.Actions.getInstance();

        if (standAlone) {
            this.add(this.__getShortcutsContainer());
        }

		this.add(virtualTree, {flex: 1});
		this.__createFilter();

		// add root directory
		this.updateRoot(baseDir);

		this.setFileHandler(this.__defaultFileHandler);
		desk.Actions.init(this.__createDefaultStaticActions, this);

		virtualTree.addListener("cellDblclick", this.__onCellDblclick, this);
		virtualTree.addListener("treeOpenWhileEmpty", this.__onTreeOpen, this);
		virtualTree.addListener("treeOpenWithContent", this.__onTreeOpen, this);
		virtualTree.addListener("dragstart", this.__onDragstart);
		virtualTree.addListener("droprequest", this.__onDropRequest, this);
		virtualTree.setDroppable(true);
		virtualTree.addListener('drop', this.__onDrop, this);

		if (this.__standAlone) {
			var win = new qx.ui.window.Window();
			win.set({ShowMinimize : false,
					layout : new qx.ui.layout.VBox(),
					useMoveFrame : true,
					caption : this.__baseDir,
					width : 400,
					height : 500});
			win.add(this, {flex : 1});
			this.__window = win;
			win.open();
		}
	},

	destruct : function(){
		if (this.__standAlone) {
			this.__window.destroy();
		}
		this.__virtualTree.getDataModel().dispose();
		this.__virtualTree.dispose();
		qx.util.DisposeUtil.destroyContainer(this);
	},

	members : {
		__createFilter : function () {
			// create the filter bar
			var filterBox = new qx.ui.container.Composite();
			filterBox.setLayout(new qx.ui.layout.HBox(10));
			var dataModel = this.__virtualTree.getDataModel();

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
			var self = this;
			dataModel.setFilter(function(node) {
				if (self.__isNodeLeaf(node)) {
					var label = node.label;
					return label.toLowerCase().indexOf(filterField.getValue().toLowerCase()) != -1;
				}
				return true;
			});
			if(this.__standAlone) {
				this.add(filterBox);
			}
		},

		__onCellDblclick :  function (e) {
			var node = this.__virtualTree.getDataModel().getNodeFromRow(e.getRow());
			this.__openNode(node);
		},

		__onTreeOpen : function (e) {
			// maybe there's a bug in qooxdoo : this event is triggered for any node (leaf or branch)
			var node = e.getData();
			if (this.__isNodeLeaf(node)) {
				return;
			}
			this.__expandDirectoryListing(node.nodeId);
		},

		__onDragstart : function(e) {
			e.addAction("move");
			e.addType("fileBrowser");
			e.addType("text");
		},

		__onDropRequest : function(e) {
			var type = e.getCurrentType();
			switch (type)
			{
			case "text":
				e.addData(type, this.getSelectedFiles()[0]);
				break;
			case "fileBrowser":
				e.addData(type, this);
				break;
			default :
				break;
			}
		},

		__onDrop : function (e) {
			if (e.supportsType('fileBrowser')) {
				var browser = e.getData('fileBrowser');
				var files = browser.getSelectedFiles();
				var row = this.__virtualTree.getFocusedRow();
				var node = this.__virtualTree.getDataModel().getNodeFromRow(row);

				var nodeId = node.nodeId;
				if (this.__isNodeLeaf(node)) {
					nodeId = node.parentNodeId;
				}
				var destination = this.__getNodeFile(nodeId);
				var filesString = '';
				for (var i = 0; i < files.length; i++) {
					filesString += files[i] + '\n';
				}
				var actionType = prompt('Copy or move? \n0 : copy,  1 : move', '0');
				if (actionType === '1') {
					actionType = 'move';
				}
				else {
					actionType = 'copy';
				}

				if (confirm ('Are you sure you want to ' + actionType + ' move these files:\n' +
                        filesString + 'to :\n' + destination)) {
                    var that = this;
                    async.forEach(files, function (file, callback) {
                        desk.Actions.getInstance().launchAction({
                                action : actionType,
								source : file,
								destination : destination},
							function () {
                                callback(null);
							});
						}, function (err) {
                            var directories = [];
							for (var i = 0; i != files.length; i++) {
								directories.push(browser.__getFileDirectory(files[i]));
							}
							directories.push(destination);
							that.__updateDirectories(directories);
					});
				}
			}
		},

		// array to store all file browsers, usefull for updates
		__fileBrowsers : [],

		// defines whether the file browser is a standalone one
		// i.e. whether it needs to create a window
		__standAlone : true,

		// the window containing the widget when in standalone mode
		__window : null,
		__fileHandler : null,
		__baseDir : null,
		__virtualTree : null,
		__rootId : null,
		__filterField : null,

		__actionNames : null,
		__actionCallbacks : null,
		__actions : null,
		__actionsMenuButton : null,

        __changeRootDir : function (event) {
            this.updateRoot(event.getTarget().getLabel());
        },

        __getShortcutsContainer : function() {
            var container = new qx.ui.container.Composite();
            container.setLayout(new qx.ui.layout.HBox(5));
            var settings = desk.Actions.getInstance().getSettings();
            var dataDirs = settings.dataDirs;
            var permissions = settings.permissions;
            var dirs = Object.keys(dataDirs);
            dirs.sort();
            for (var i = 0; i != dirs.length; i++) {
                var dir = dirs[i];
                if (dir === "cache") {
					continue;
				}
				if ((permissions === 0) && (dir ==="actions")){
					continue;
				}
                var button = new qx.ui.form.Button(dir);
                button.addListener("execute", this.__changeRootDir, this);
                container.add(button, {flex : 1});
                var menu = new qx.ui.menu.Menu();
                var openButton = new qx.ui.menu.Button('open in new window');
                openButton.setUserData('dir', dir);
                openButton.addListener('execute', function (e) {
					var browser = new desk.FileBrowser(e.getTarget().getUserData('dir'));
					browser.getWindow().center();
				})
				menu.add(openButton);
				button.setContextMenu(menu);
            }
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
			return file+"."+sessionType+"."+sessionId;
		},

		/**
		* Updates/changes the root
		* @param newRoot {String} new root
		*/
		updateRoot : function (newRoot) {
            if (newRoot) {
                this.__baseDir = newRoot;
                var dataModel = this.__virtualTree.getDataModel();
                dataModel.clearData();
                this.__rootId = dataModel.addBranch(null, this.__baseDir, true);
                if (this.__window) {
                    this.__window.setCaption(newRoot);
                }
            }
			this.__expandDirectoryListing(this.__rootId);
		},

		__isNodeLeaf : function (node) {
			return node.type === qx.ui.treevirtual.MTreePrimitive.Type.LEAF;
		},

		__defaultFileHandler : function (file) {
			var extension = desk.FileSystem.getFileExtension(file);
			switch (extension)
			{
			case 'log':
			case 'txt':
			case 'js':
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
			case "png":
			case "jpg":
			case "bmp":
				new desk.ImageViewer(file);
				break;
			case "xml":
				desk.FileSystem.readFile(file, function (request) {
					var xmlDoc = request.getResponse();
					if (xmlDoc.getElementsByTagName("mesh").length !== 0) {
						new desk.MeshViewer(file);
					} else {
						alert ('xml file of unknown type!');
					}
				});
				break;
			case "mhd":
				new desk.VolumeViewer(file);
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
			if (this.__isNodeLeaf(node)) {
				new desk.VolViewSimple(this.__getNodeFile(node));
			} else {
				alert("Cannot view a directory!");
			}
		},

		__downloadAction : function (node) {
			if (this.__isNodeLeaf(node)) {
				new qx.html.Iframe(desk.FileSystem.getActionURL('download') +
					'?file=' + this.__getNodeFile(node));
			} else {
				alert("Cannot download a directory!");
			}
		},

		__uploadAction : function (node) {
			var nodeId = node.nodeId;
			if (this.__isNodeLeaf(node)) {
				nodeId = node.parentNodeId;
			}
			var uploader = new desk.Uploader(this.__getNodeFile(nodeId));
			uploader.addListener("upload", function () {
				this.__expandDirectoryListing(nodeId);
			}, this);
		},

		__newDirectoryAction : function (node) {
			if (this.__isNodeLeaf(node)) {
				node = node.parentNodeId;
			} else {
				node = node.nodeId;
			}
			var dir = prompt('Name of the directory to create','new_dir');
			if (dir) {
				this.__actions.launchAction(
					{"action" : "create_directory",
					"directory" : this.__getNodeFile(node) + '/' + dir},
					function () {
						this.__expandDirectoryListing(node);
				}, this);
			}
		},

		__deleteAction : function (node) {
			var nodes = this.__getSelectedNodes();
			var message = 'Are you shure you want to delete those files/directories? \n';
			var files = [];
			for (var i = 0; i < nodes.length; i++) {
				var file = this.__getNodeFile(nodes[i]);
				files.push(this.__getFileDirectory(file));
				message +=  file + '\n';
			}
			if (confirm(message)) {
				var self = this;
				async.forEach(nodes, function (node, callback) {
					var file = self.__getNodeFile(node.nodeId);
					if (this.__isNodeLeaf(node)) {
						self.__actions.launchAction({
							action : 'delete_file',
							file_name : file},
							function () {
								callback(null);
						});
					} else {
						self.__actions.launchAction({
							action : 'delete_directory',
							directory : file},
							function () {
								callback(null);
						});
					}
				}, function (err) {
					self.__updateDirectories(files);
				});
			}
		},

		__renameAction : function (node) {
			var file = this.__getNodeFile(node.nodeId);
			var newFile = prompt('enter new file name : ', desk.FileSystem.getFileName(file));
			if ( newFile !== null) {
				newFile = desk.FileSystem.getFileDirectory(file) + newFile;
				desk.Actions.getInstance().launchAction({
						action : "move",
						source : file,
						destination : newFile
					},
					function () {
						this.__expandDirectoryListing(node.parentNodeId);
				}, this);
			}
		},

		__newFileAction : function (node) {
			var file = desk.FileSystem.getFileName(this.__getNodeFile(node.nodeId));
			if (this.__isNodeLeaf(node)) {
				alert ('error : select a file, not a directory');
			}
			file = this.__getNodeFile(node.nodeId);
			var baseName = desk.FileSystem.getFileName(file);
			var nameLength = baseName.length;
			baseName = baseName.substring(0, baseName.length - 3) + 'txt';
			baseName = prompt('enter new file name : ', baseName);
			if (baseName !== null) {
				var self = this;
				desk.FileSystem.writeFile( desk.FileSystem.getFileDirectory(file) + baseName,
					'edit me',
					function () {self.__expandDirectoryListing(node.parentNodeId);
				});
			}
		},

		__viewEditAction : function (node) {
			if (this.__isNodeLeaf(node)) {
				new desk.TextEditor(this.__getNodeFile(node));
			}
		},

		__createDefaultStaticActions : function ()
		{
			this.__virtualTree.setContextMenuFromDataCellsOnly(true);
			var menu = new qx.ui.menu.Menu();

			// the default "open" button
			var openButton = new qx.ui.menu.Button("Open");
			openButton.addListener("execute", function (){
				this.__openNode (this.__getSelectedNodes()[0]);}, this);
			menu.add(openButton);
			menu.addSeparator();

			var actionsButton = new qx.ui.menu.Button("Actions");
			menu.add(actionsButton);
			menu.addSeparator();

			this.__virtualTree.setContextMenu(menu);
			qx.util.DisposeUtil.disposeTriggeredBy(menu, this);
			this.__virtualTree.addListener("contextmenu", function (e) {
				actionsButton.setMenu(this.__actions.getActionsMenu(this));
			}, this);

			if (this.__actions.getPermissionsLevel()<1)
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
			button.addListener("execute", function () {
				var buttonFileBrowser = this.getUserData("fileBrowser");
				var buttonActionName = this.getUserData("actionName");
				var node = buttonFileBrowser.__getSelectedNodes()[0];
				buttonFileBrowser.__actionCallbacks[buttonActionName].call(context, node);
			}, button);
			this.__virtualTree.getContextMenu().add(button);
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
			return (this.__virtualTree);
		},

		__getSelectedNodes : function () {
			return (this.__virtualTree.getSelectedNodes());
		},

		/**
		* Returns an array containing currently selected files
		* @return {Array} array of files (strings)
		*/
		getSelectedFiles : function () {
			var selectedNodes = this.__getSelectedNodes();
			var files = [];
			for (var i = 0; i < selectedNodes.length; i++) {
				files.push(this.__getNodeFile(selectedNodes[i]));
			}
			return files;
		},

		__getNodeMTime : function (node) {
			return (this.__virtualTree.getDataModel().getColumnData(node.nodeId, 1));
		},

		__getNodeURL : function (node) {
			return (desk.FileSystem.getFileURL(this.__getNodeFile(node)));
		},

		__getNodeFile : function (node) {
			var hierarchy = this.__virtualTree.getHierarchy(node);
			return (hierarchy.join("\/"));
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
			if (file.indexOf(baseDir) !== 0) {
				return null;
			}
			var inFile = file.substring(baseDir.length + 1);
			var hierarchy;
			if (inFile.length !== 0) {
				hierarchy = inFile.split('/');
			} else {
				hierarchy = [];
			}
			
			var nodeId = this.__rootId;
			var data = this.__virtualTree.getDataModel().getData();
			if (!data) {
				console.log("__getFileNode : data=null file = " + file); 
				return null;
			}
			var node = data[nodeId];
			for (var i = 0; i != hierarchy.length; i++) {
				var children = node.children;
				var found = false;
				for (var j = 0; j!= children.length; j++) {
					var testNode = data[children[j]];
					if (testNode.label === hierarchy[i]) {
						node = testNode;
						found = true;
						break;
					}
				}
				if (!found) {
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
			var browsers = this.__fileBrowsers;
			for (var i = 0; i != browsers.length; i++) {
				var browser = browsers[i];
				var nodeId = browser.__getFileNode(file);
				if (nodeId) {
					browser.__expandDirectoryListing(nodeId);
				}
			}
		},

		__getFileDirectory : function (file) {
			var node = this.__getFileNode(file);
			if (!node) {
				return null;
			}
			return this.__getNodeFile(node.parentNodeId);
		},

		__updateDirectories : function (files) {
			var foldersObject = {};
			var foldersArray = [];
			for (var i = 0; i < files.length; i++) {
				var folder = files[i];
				if (foldersObject[folder] === undefined) {
					foldersObject[folder] = true;
					foldersArray.push(folder);
				}
			}
			for (i = 0; i < foldersArray.length; i++) {
				this.updateDirectory(foldersArray[i]);
			}
		},

		__openNode : function (node) {
			if (this.__isNodeLeaf(node)) {
				if (this.__fileHandler) {
					this.__fileHandler(this.__getNodeFile(node));
				}
			}
			else {
				this.__virtualTree.nodeToggleOpened(node);
			}
		},

		__caseInsensitiveSort : function (a, b) {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		},

		__readFileList : function (files, directory) {
			var dataModel = this.__virtualTree.getDataModel();
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

			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				var fileName = file.name;

				if (!file.isDirectory) {
					filesArray.push(fileName);
					sizes[fileName] = file.size;
				} else {
					directoriesArray.push(fileName);
				}
				modificationTimes[fileName] = file.mtime;
			}
			directoriesArray.sort(this.__caseInsensitiveSort);
			filesArray.sort(this.__caseInsensitiveSort);

			for (i = 0; i < directoriesArray.length; i++) {
				dataModel.addBranch(nodeId , directoriesArray[i]);
			}

			for (i = 0; i < filesArray.length; i++) {
				var newNode;
				var image = null;
				switch (desk.FileSystem.getFileExtension(filesArray[i]))
				{
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
				newNode = dataModel.addLeaf(nodeId, filesArray[i], image);
				dataModel.setColumnData(newNode, 1, modificationTimes[filesArray[i]]);
				dataModel.setColumnData(newNode, 2, sizes[filesArray[i]]);
			}
			dataModel.setData();
		},

		__expandDirectoryListing : function(nodeId) {
			var directory = this.__getNodeFile(nodeId);
			desk.FileSystem.readDir(directory, function (files) {
				this.__readFileList(files, directory);
			}, this);
		}
	}
});

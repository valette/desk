/*
#asset(desk/tris.png)
#asset(desk/img.png)
*/

qx.Class.define("desk.FileBrowser", 
{
	extend : qx.ui.container.Composite,

	construct : function(baseDir, standAlone)
	{
		if (baseDir) {
			if(baseDir.substr(-1) == '/') {
				baseDir = baseDir.substr(0, baseDir.length - 1);
			}
		} else {
            baseDir = 'data';
		}

		this.base(arguments);
		this.__fileBrowsers.push(this);

		this.setLayout(new qx.ui.layout.VBox(8));

		if ( standAlone === false ) {
			this.__standAlone = false;
		} else {
            standAlone = true;   
		}

		qx.Class.include(qx.ui.treevirtual.TreeVirtual,
			qx.ui.treevirtual.MNode);

		this.__actionCallbacks=[];
		this.__actionNames=[];

		var virtualTree = new qx.ui.treevirtual.TreeVirtual(["files","mTime","size"],
			{initiallyHiddenColumns : [1, 2]});
		this.__virtualTree=virtualTree;
		virtualTree.setSelectionMode(qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);

		virtualTree.set({
			rowHeight: 22,
			alwaysShowOpenCloseSymbol : true,
			columnVisibilityButtonVisible : true,
			draggable : true,
			statusBarVisible : false});

		var dataModel = virtualTree.getDataModel();

		this.__actions=desk.Actions.getInstance();

		// create the filter bar
		var filterBox = new qx.ui.container.Composite();
		filterBox.setLayout(new qx.ui.layout.HBox(10));

		var filterText = new qx.ui.basic.Label("Filter files :");
		filterBox.add(filterText);
		var filterField = new qx.ui.form.TextField();
		filterField.setValue("");
		filterField.addListener("input", function() {
			dataModel.setData();
			},this);
		filterBox.add(filterField, {flex:1});
		this.__filterField = filterField;

		var filter = qx.lang.Function.bind(function(node) {
			if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
				var label = node.label;
				return label.toLowerCase().indexOf(filterField.getValue().toLowerCase()) != -1;
			}
			return true;
		}, this);

		var resetButton=new qx.ui.form.Button("Reset filter");
		resetButton.setAllowGrowY(false);
		resetButton.addListener("execute",function(e){
			filterField.setValue("");
			dataModel.setData();
		});

		filterBox.add(resetButton);
		dataModel.setFilter(filter);

        if (standAlone) {
            this.add(this.__getShortcutsContainer());
        }

		this.add(virtualTree,{flex: 1});
		if(this.__standAlone) {
			this.add(filterBox);
		}

		// add root directory
		this.updateRoot(baseDir);

		this.__createDoubleClickActions();

		// events handling
		var _this = this;
		desk.Actions.init(function () {
			_this.__createDefaultStaticActions();
		});

		virtualTree.addListener("cellDblclick", function (e) {
			var node=this.__virtualTree.getDataModel().getNodeFromRow(e.getRow());
			this.__openNode(node);
		}, this);

		virtualTree.addListener("treeOpenWhileEmpty",function (e) {
			this.__expandDirectoryListing(e.getData().nodeId);
		}, this);

		virtualTree.addListener("treeOpenWithContent",function (e) {
			this.__expandDirectoryListing(e.getData().nodeId);
		}, this);

		// drag and drop support
		virtualTree.addListener("dragstart", function(e) {
			e.addAction("move");
			e.addType("fileBrowser");
			e.addType("text");
		});

		virtualTree.addListener("droprequest", function(e) {
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
		}, this);

		virtualTree.setDroppable(true);
		virtualTree.addListener('drop', function (e) {
			if (e.supportsType('fileBrowser')) {
				var browser = e.getData('fileBrowser');
				var files = browser.getSelectedFiles();
				var row = this.__virtualTree.getFocusedRow();
				var node = this.__virtualTree.getDataModel().getNodeFromRow(row);

				var nodeId = node.nodeId;
				if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					nodeId = node.parentNodeId;
				}
				var destination = this.__getNodeFile(nodeId);
				var filesString = '';
				for (var i = 0; i < files.length; i++) {
					filesString += files[i] + '\n';
				}
				var actionType = prompt('Copy or move? \n0 : copy,  1 : move', '0');
				if (actionType == '1') {
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
		}, this);

		if (this.__standAlone) {
			var window = new qx.ui.window.Window();
			window.set({ShowMinimize : false,
					layout : new qx.ui.layout.VBox(),
					useMoveFrame : true,
					caption : this.__baseDir,
					width : 400,
					height : 500});
			window.add(this, {flex : 1});
			this.__window = window;
			window.open();
		}

		return (this);
	},

	members : {
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
            var dataDirs = desk.Actions.getInstance().getSettings().dataDirs;
            var dirs = Object.keys(dataDirs);
            for (var i = 0; i != dirs.length; i++) {
                var dir = dirs[i];
                var button = new qx.ui.form.Button(dir);
                button.addListener("execute", this.__changeRootDir, this);
                container.add(button, {flex : 1});
            }
            return container;
		},

		getWindow : function() {
			return this.__window;
		},

		getFileFilter : function() {
			return this.__filterField;
		},
		
		// returns the directory for the given file, session type and Id
		getSessionDirectory : function (file,sessionType,sessionId) {
			return file+"."+sessionType+"."+sessionId;
		},

		updateRoot : function (newRoot) {
            if (newRoot) {
                this.__baseDir = newRoot;
                var dataModel = this.__virtualTree.getDataModel();
                dataModel.clearData();
                this.__rootId = dataModel.addBranch(null, this.__baseDir, true);
            }
			this.__expandDirectoryListing(this.__rootId);
		},

		__createDoubleClickActions : function () {
			this.setFileHandler(function (file) {
				var extension=file.substring(file.lastIndexOf("."), file.length);
				switch (extension)
				{
				case '.log':
				case '.txt':
				case '.js':
					new desk.TextEditor (file);
					break;
				case ".vtk":
				case ".ply":
				case ".obj":
				case ".stl":
				case ".ctm":
				case ".off":
					new desk.MeshViewer(file);
					break;
				case ".png":
				case ".jpg":
				case ".bmp":
					new desk.ImageViewer(file);
					break;
				case ".xml":
					desk.FileSystem.readFile(file, function (request) {
						var xmlDoc = request.getResponse();
						if (xmlDoc.getElementsByTagName("mesh").length !== 0) {
							new desk.MeshViewer(file);
						}
						else {
							alert ('xml file of unknown type!');
						}
					});
					break;
				case ".mhd":
					var viewer = new desk.VolumeViewer(file);
					break;
				case ".json":
					desk.Action.CREATEFROMFILE(file);
					break;
				default:
					alert("no file handler exists for extension "+extension);
					break;
				}				
			});
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
			this.__virtualTree.addListener("contextmenu", function (e) {
				actionsButton.setMenu(this.__actions.getActionsMenu(this));
			}, this);

			if (this.__actions.getPermissionsLevel()<1)
				return;

			this.addAction("VolViewSimple", function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					new desk.VolViewSimple(this.__getNodeFile(node));
				else
					alert("Cannot view a directory!");
			}, this);

			this.addAction("download",function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					new qx.html.Iframe(desk.FileSystem.getActionURL('download') +
						'?file=' + this.__getNodeFile(node));
				} 
				else {
					alert("Cannot download a directory!");
				}
			}, this);

			this.addAction("upload",function (node) {
				var nodeId=node.nodeId;
				if (node.type === qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					nodeId = node.parentNodeId;
				}
				var uploader = new desk.Uploader(this.__getNodeFile(nodeId));
				uploader.addListener("upload", function () {
					this.__expandDirectoryListing(nodeId);
				}, this);
			}, this);
			
			this.addAction("view/edit text", function (node) {
				if (node.type === qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					new desk.TextEditor(this.__getNodeFile(node));
				}
			}, this);

			this.addAction("new directory", function (node) {
				if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
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
			}, this);

			this.addAction("delete", function (node) {
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
                        if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
                            self.__actions.launchAction({
                                action : 'delete_file',
                                file : file},
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
			}, this);

			this.addAction('rename', function (node) {
				var file = this.__getNodeFile(node.nodeId);
				var newFile = prompt('enter new file name : ', desk.FileSystem.getFileName(file));
				if ( newFile !== null) {
					newFile = desk.FileSystem.getFileDirectory(file) + newFile;
					desk.Actions.getInstance().launchAction(
						{ action : "move",
							source : file,
							destination : newFile},
						function () {
                        this.__expandDirectoryListing(node.parentNodeId);
                    }, this);
				}
			}, this);

			this.addAction('new file', function (node) {
				var file = desk.FileSystem.getFileName(this.__getNodeFile(node.nodeId));
				if (node.type !== qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					alert ('error : select a file, not a directory');
				}
				file = this.__getNodeFile(node.nodeId);
				var baseName = desk.FileSystem.getFileName(file);
				var nameLength = baseName.length;
				baseName = baseName.substring(0, baseName.length - 3) + 'txt';
				baseName = prompt('enter new file name : ', baseName);
				if ( baseName !== null) {
                    var self = this;
					desk.FileSystem.writeFile( desk.FileSystem.getFileDirectory(file) + baseName,
						'edit me',
                        function () {self.__expandDirectoryListing(node.parentNodeId);
                    });
				}
			}, this);
		},

		addAction : function (actionName, callback, context)
		{
			var location=this.__actionNames.indexOf(actionName);
			if (location==-1) {
				this.__actionNames.push(actionName);
			} else {
				console.log ('Warning : action "' + actionName + '" already exists, is overwritten!');
			}

			this.__actionCallbacks[actionName] = callback;

			var button = new qx.ui.menu.Button(actionName);
			button.setUserData("fileBrowser",this);
			button.setUserData("actionName",actionName);
			button.addListener("execute", function () {
				var buttonFileBrowser = this.getUserData("fileBrowser");
				var buttonActionName = this.getUserData("actionName");
				var node = buttonFileBrowser.__getSelectedNodes()[0];
				buttonFileBrowser.__actionCallbacks[buttonActionName].call(context, node);
			}, button);
			this.__virtualTree.getContextMenu().add(button);
		},

		setFileHandler : function (callback) {
			this.__fileHandler=callback;
		},

		getTree : function () {
			return (this.__virtualTree);
		},

		__getSelectedNodes : function () {
			return (this.__virtualTree.getSelectedNodes());
		},

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
			}
			else {
				hierarchy = [];
			}
			
			var nodeId = this.__rootId;
			var data = this.__virtualTree.getDataModel().getData();
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
			return (node);
		},

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
			if (node.type !== qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
				return this.__getNodeFile(node);
			}
			return this.__getNodeFile(node.parentNodeId);
		},

		__updateDirectories : function (files) {
			var foldersObject = {};
			var foldersArray = [];
			var i;
			for (i = 0; i < files.length; i++) {
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
			if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
				if (this.__fileHandler)
						this.__fileHandler(this.__getNodeFile(node));
			}
			else
				this.__virtualTree.nodeToggleOpened(node);
		},

		__expandDirectoryListing : function(nodeId) {
			var directory = this.__getNodeFile(nodeId);
			var dataModel = this.__virtualTree.getDataModel();

			desk.FileSystem.readDir(directory, readFileList, this);

			function readFileList(files)
			{
				var filesArray = [];
				var directoriesArray = [];
				var modificationTimes = [];
				var sizes = [];
				var node = this.__getFileNode(directory);
				if (node === null) {
					return;
				}
				nodeId = node.nodeId;
				dataModel.prune(nodeId,false);

				for (var i = 0; i < files.length; i++) {
					var file = files[i];
					var fileName = file.name;

					if (!file.isDirectory) {
						filesArray.push(fileName);
						sizes[fileName] = file.size;
					}
					else {
						directoriesArray.push(fileName);
					}
					modificationTimes[fileName] = file.mtime;
				}
				directoriesArray.sort();
				filesArray.sort();

				for (i = 0; i < directoriesArray.length; i++)
					dataModel.addBranch(nodeId , directoriesArray[i]);

				for (i = 0; i < filesArray.length; i++) {
					var newNode;
					switch (filesArray[i].substring(filesArray[i].length-4, filesArray[i].length))
					{
					case ".vtk":
					case ".ply":
					case ".obj":
					case ".stl":
						newNode = dataModel.addLeaf(nodeId, filesArray[i],"desk/tris.png");
						break;
					case ".mhd":
					case ".jpg":
					case ".png":
						newNode = dataModel.addLeaf(nodeId, filesArray[i],"desk/img.png");
						break;
					default:
						newNode = dataModel.addLeaf(nodeId, filesArray[i]);
						break;
					}
					dataModel.setColumnData(newNode, 1, modificationTimes[filesArray[i]]);
					dataModel.setColumnData(newNode, 2, sizes[filesArray[i]]);
				}
				dataModel.setData();
			}
		}
	}
});

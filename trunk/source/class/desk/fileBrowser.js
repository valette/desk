/*
#asset(desk/tris.png)
#asset(desk/img.png)
*/

qx.Class.define("desk.fileBrowser", 
{
	extend : qx.ui.container.Composite,

	construct : function(baseDir, standAlone)
	{
		this.base(arguments);
		if (baseDir!=null) {
			this.__baseDir=baseDir;
		}

		this.setLayout(new qx.ui.layout.VBox());

		if ( standAlone === false ) {
			this.__standAlone = false;
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
//			width  : 400,
			rowHeight: 22,
			alwaysShowOpenCloseSymbol : true,
			columnVisibilityButtonVisible : true,
			draggable : true,
			statusBarVisible : false});

		var dataModel = virtualTree.getDataModel();

		this.__actions=desk.actions.getInstance();

		// create the filter bar
		var filterBox = new qx.ui.container.Composite;
		filterBox.setLayout(new qx.ui.layout.HBox(10));
///////////////////////////////////////////////////////////////////////////////////////////////
		if(this.__standAlone)
			this.add(filterBox);//, {flex:1});
		var filterText=new qx.ui.basic.Label("Filter files :");
		filterBox.add(filterText);
		var filterField = new qx.ui.form.TextField();
		filterField.setValue("");
		filterField.addListener("input", function() {
			dataModel.setData();
			},this);
		filterBox.add(filterField, {flex:1});
		this.__filterField = filterField;

		var filter = qx.lang.Function.bind(function(node)
			{
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

		this.add(virtualTree,{flex: 1});


		// add root directory
		this.__rootId = dataModel.addBranch(null, this.__baseDir, true);
		this.updateRoot();

		this.__createDoubleClickActions();

		// events handling
		if (this.__actions.isReady()) {
			this.__createDefaultStaticActions();
		}
		else {
			this.__actions.addListenerOnce("changeReady", function (e) {
				this.__createDefaultStaticActions();
			}, this);
		}

		virtualTree.addListener("cellDblclick", function (e) {
			var node=this.__virtualTree.getDataModel().getNodeFromRow(e.getRow());
			this.openNode(node);
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
					e.addData(type, this.getNodeFile(this.getSelectedNode()));
					break;
				case "fileBrowser":
					e.addData(type, this);
					break;
				case "fileNode":
					e.addData(type, this.getSelectedNode());
					break;
				default :
					alert ("type "+type+"not supported for drag and drop");
				}
		}, this);

		if (this.__standAlone)
		{
			var window=new qx.ui.window.Window();
			window.setLayout(new qx.ui.layout.VBox());
			this.__window=window;
			window.setShowMinimize(false);
			window.setUseMoveFrame(true);
			window.setCaption("files");
			window.setWidth(400);
			window.setHeight(500);
			window.add(this, {flex : 1});
			this.__window.open();
		}

		return (this);
	},

	members : {
		// defines whether the file browser is a standalone one
		// i.e. whether it needs to create a window
		__standAlone : true,

		// the window containing the widget when in standalone mode
		__window : null,
		__fileHandler : null,
		__baseDir : "data",
		__virtualTree : null,
		__rootId : null,
		__filterField : null,

		__actionNames : null,
		__actionCallbacks : null,
		__actions : null,
		__actionsMenuButton : null,

		__updateDirectoryInProgress : null,

		getWindow : function() {
			return this.__window;
		},
		getFileFilter : function() {
			return this.__filterField;
		},
		
		// returns the directory for the given file, session type and Id
		getSessionDirectory : function (file,sessionType,sessionId)
		{
			return file+"."+sessionType+"."+sessionId;
		},

		updateRoot : function ()
		{
			this.__expandDirectoryListing(this.__rootId);
		},

		__createDoubleClickActions : function () {
			var myBrowser=this;
			function fileClicked(node) {
				var modificationTime=myBrowser.getNodeMTime(node);
				var file=myBrowser.getNodeFile(node);
				var fileURL=myBrowser.getFileURL(file);
				var extension=file.substring(file.lastIndexOf("."), file.length);
				switch (extension)
				{
				case ".vtk":
				case ".ply":
				case ".obj":
				case ".stl":
				case ".ctm":
				case ".off":
					new desk.meshView(file, modificationTime);
//					qx.core.Init.getApplication().getRoot().add(meshView);
					break;
				case ".png":
				case ".jpg":
				case ".bmp":
					new desk.imageView(file);
//					qx.core.Init.getApplication().getRoot().add(imageView);
					break;
				case ".xml":
					var xmlhttp=new XMLHttpRequest();
					xmlhttp.open("GET",fileURL+"?nocache=" +modificationTime,false);
					xmlhttp.send();
					var xmlDoc=xmlhttp.responseXML;
					
					if (xmlDoc.getElementsByTagName("mesh").length!=0)
					{
						new desk.meshView(file, modificationTime);
//						qx.core.Init.getApplication().getRoot().add(meshView);
					}
			/*		else if (xmlDoc.getElementsByTagName("volume").length!=0)
					{
						var volView=new desk.volView(file, myBrowser, modificationTime);
						//~ var volView=new desk.volMaster(file, modificationTime); //~ orion test
//						qx.core.Init.getApplication().getRoot().add(volView);
					}*/
					else
						alert ("xml file of unknown type!");
					break;
				case ".mhd":
				//		var coordinates =  {viewers : [{c:0,r:0}, {c:1,r:0}, {c:1,r:1}],
				//							volList : {c:0,r:1} };
						var volMaster = new desk.volMaster( file );
						var volWindow = volMaster.getWindow();
						
					break;
				case ".json":
					desk.action.CREATEFROMFILE(myBrowser.getNodeFile(node));
					break;
				default:
					alert("no file handler exists for extension "+extension);
				}
				
			}
			myBrowser.setFileHandler(fileClicked);
		},

		__createDefaultStaticActions : function ()
		{
			if (this.__actions.getPermissionsLevel()<1)
				return;

			var myBrowser=this;
			myBrowser.addAction("redo action", function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					desk.action.CREATEFROMFILE(myBrowser.getNodeFile(node));
				else
					desk.action.CREATEFROMFILE(myBrowser.getNodeFile(node)+"/parameters.txt");
			});

			myBrowser.addAction("volViewSimple", function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					new desk.volViewSimple(myBrowser.getNodeFile(node), myBrowser);
				else
					alert("Cannot view a directory!");
			});

			myBrowser.addAction("sliceView", function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					new desk.sliceView(myBrowser.getNodeFile(node), myBrowser);
				else
					alert("Cannot view a directory!");
			});

			myBrowser.addAction("download",function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
				{
					document.getElementById('myIFrm').src =
						myBrowser.getFileURL(myBrowser.getNodeFile(node));
				} 
				else
					alert("Cannot download a directory!");
			});

			myBrowser.addAction("upload",function (node) {
				var nodeId=node.nodeId;
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					nodeId=node.parentNodeId;
				}
				var uploader=new desk.Uploader(myBrowser.getNodeFile(nodeId));
				uploader.addListener("upload", function () {
					myBrowser.__expandDirectoryListing(nodeId);
				})
			});

			myBrowser.addAction("dicom2meta",function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
				{
					alert("Cannot convert a DICOM file alone");
				} 
				else
				{
			/*		function getAnswer(e)
					{
						//var req = e.getTarget();
						//var response=req.getResponseText().split("\n")[0];
					}*/
					var parameterMap={
						"action" : "dicom2meta",
						"sourceDirectory" : myBrowser.getNodeFile(node),
						"outputDirectory" : myBrowser.getNodeFile(node)};
					myBrowser.__actions.launchAction(parameterMap);//, getAnswer, this);
				}
			});
			
			myBrowser.addAction("view/edit text", function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					new desk.textEditor(myBrowser.getNodeFile(node));
				}
			});

			myBrowser.addAction("info",function (node) {
				alert ("file name : "+myBrowser.getNodeFile(node)
					+"\n file URL : "+myBrowser.__getNodeURL(node));
			});

			myBrowser.addAction("update",function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					myBrowser.__expandDirectoryListing(node.parentNodeId);
				else
					myBrowser.__expandDirectoryListing(node.nodeId);
			});
		},

		addAction : function (actionName, callback)
		{
			var location=this.__actionNames.indexOf(actionName);
			if (location==-1)
			{
				this.__actionNames.push(actionName);
			}
			else
			{
				console.log ("Warning : action \""+actionName+"\" already exists, is overwritten!");
			}

			this.__actionCallbacks[actionName]=callback;
			this.__updateContextMenu();
		},

		setFileHandler : function (callback) {
			this.__fileHandler=callback;
		},

		getTree : function ()
		{
			return (this.__virtualTree);
		},

		getSelectedNode : function (e)
		{
			return (this.__virtualTree.getSelectedNodes()[0]);
		},

		getSelectedNodes : function (e)
		{
			return (this.__virtualTree.getSelectedNodes());
		},

		getNodeMTime : function (node)
		{
			return (this.__virtualTree.getDataModel().getColumnData(node.nodeId, 1));
		},

		__getNodeURL : function (node)
		{
			return (this.getFileURL(this.getNodeFile(node)));
		},

		getFileURL : function (file)
		{
			return this.__actions.getFileURL(file);
		},

		getNodeFile : function (node)
		{
			var hierarchy=this.__virtualTree.getHierarchy(node);
			return (hierarchy.join("\/"));
		},

		openNode : function (node) {
			if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
			{
				if (this.__fileHandler!=null)
						this.__fileHandler(node);
			}
			else
				this.__virtualTree.nodeToggleOpened(node);
		},

		__updateContextMenu : function()
		{
			this.__virtualTree.setContextMenuFromDataCellsOnly(true);

			var menu = new qx.ui.menu.Menu;

			// the default "open" button
			var openButton = new qx.ui.menu.Button("Open");
			openButton.addListener("execute", function (){
				this.openNode (this.getSelectedNode());}, this);
			menu.add(openButton);

			menu.addSeparator();

			var actionsButton=new qx.ui.menu.Button("Actions");
			menu.add(actionsButton);
			menu.addSeparator();
			// other actions buttons
			for (var i=0;i<this.__actionNames.length;i++)
			{
				var actionName=this.__actionNames[i];
				var button = new qx.ui.menu.Button(actionName);
				button.setUserData("fileBrowser",this);
				button.setUserData("actionName",actionName);

				button.addListener("execute", function () {
					var buttonFileBrowser=this.getUserData("fileBrowser");
					var buttonActionName=this.getUserData("actionName");
					var node=buttonFileBrowser.getSelectedNode();
					buttonFileBrowser.__actionCallbacks[buttonActionName](node);
					}, button);
				menu.add(button);
			}

			this.__virtualTree.setContextMenu(menu);
			this.__virtualTree.addListener("contextmenu", function (e) {
				actionsButton.setMenu(this.__actions.getActionsMenu(this));
				}, this);
		},
		

		__expandDirectoryListing : function(node) {
			if (this.__updateDirectoryInProgress==true)
			{
				console.log("tried to update directory while update is already in progress");
				return;
			}
			this.__updateDirectoryInProgress=true;

			var dataModel=this.__virtualTree.getDataModel();
			dataModel.prune(node,false);

			// Instantiate request
			var req = new qx.io.request.Xhr();
			req.setUrl(this.__actions.baseURL+"php/listDir.php");
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData({"dir" : this.getNodeFile(node)});
			req.addListener("success", readFileList, this);
			req.send();

			function readFileList(e)
			{
				var req = e.getTarget();
				var files=req.getResponseText().split("\n");
				var filesArray=new Array();
				var directoriesArray=new Array();
				var modificationTimes=new Array();
				var sizes=new Array();
				for (var i=0;i<files.length;i++)
				{
					var splitfile=files[i].split(" ");
					var fileName=splitfile[0];
					if (fileName!="")
					{
						if (splitfile[1]=="file")
						{
							filesArray.push(fileName);
							sizes[fileName]=parseInt(splitfile[3]);
						}
						else
							directoriesArray.push(fileName);

						modificationTimes[fileName]=parseInt(splitfile[2]);
					}
				}
				directoriesArray.sort();
				filesArray.sort();

				for (var i=0;i<directoriesArray.length;i++)
					dataModel.addBranch(node	, directoriesArray[i]);

				for (var i=0;i<filesArray.length;i++)
				{
					var newNode;
					switch (filesArray[i].substring(filesArray[i].length-4, filesArray[i].length))
					{
					case ".vtk":
					case ".ply":
					case ".obj":
					case ".stl":
						newNode=dataModel.addLeaf(node, filesArray[i],"desk/tris.png");
						break;
					case ".mhd":
					case ".jpg":
					case ".png":
						newNode=dataModel.addLeaf(node, filesArray[i],"desk/img.png");
						break;
					default:
						newNode=dataModel.addLeaf(node, filesArray[i]);
					}
					dataModel.setColumnData(newNode, 1, modificationTimes[filesArray[i]]);
					dataModel.setColumnData(newNode, 2, sizes[filesArray[i]]);
				}
				dataModel.setData();
				this.__updateDirectoryInProgress=false;
			}
		}
	}
});

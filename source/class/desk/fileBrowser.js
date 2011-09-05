qx.Class.define("desk.fileBrowser", 
{
  extend : qx.ui.window.Window,

	construct : function(container, baseDir)
	{
		this.base(arguments);
		if (baseDir!=null)
			this.__baseDir=baseDir;

		qx.Class.include(qx.ui.treevirtual.TreeVirtual,
			qx.ui.treevirtual.MNode);

		this.__actionCallbacks=[];
		this.__actionNames=[];

		var virtualTree = new qx.ui.treevirtual.TreeVirtual(["files","mTime","size"],
			{initiallyHiddenColumns : [1, 2]});
		this.__virtualTree=virtualTree;
		virtualTree.setSelectionMode(qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);

		virtualTree.set({
			width  : 400,
			rowHeight: 22,
			alwaysShowOpenCloseSymbol : true,
			columnVisibilityButtonVisible : true,
			draggable : true});

		var dataModel = virtualTree.getDataModel();

		this.__actionsHandler=desk.actions.ACTIONSHANDLER;

		if (container==null)
		{
			this.setLayout(new qx.ui.layout.VBox());
			this.setShowClose(false);
			this.setShowMinimize(false);
			this.setUseMoveFrame(true);
			this.setCaption("files");
			this.setHeight(700);

			//create menu
			var menu=new qx.ui.menu.Menu;

/*			var uploadButton = new qx.ui.menu.Button("Upload");
			uploadButton.addListener("execute", function (e){alert ("Not implemented!");}, this);
			menu.add(uploadButton);
			menu.addSeparator();

			this.__actionsMenuButton=new qx.ui.menu.Button("Actions", null , null);
			menu.add(this.__actionsMenuButton);

			var actionsButton = new qx.ui.form.MenuButton("Actions", null, menu);
			this.add(actionsButton);*/

			// create the filter bar
			var filterBox = new qx.ui.container.Composite;
			filterBox.setLayout(new qx.ui.layout.HBox(10));
			this.add(filterBox);//, {flex:1});
			var filterText=new qx.ui.basic.Label("Filter files :");
			filterBox.add(filterText);
			var filterField = new qx.ui.form.TextField();
			filterField.setValue("");
			filterField.addListener("input", function() {
				dataModel.setData();
				},this);
			filterBox.add(filterField, {flex:1});

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
			this.open();
		}
		else
			container.add(virtualTree, {flex : 1});

		// add root directory
		this.__rootId = dataModel.addBranch(null, this.__baseDir, true);
		this.updateRoot();

		// events handling
		this.createDefaultStaticActions();

		virtualTree.addListener("cellDblclick", function (e) {
			var node=this.getEventNode(e);
			this.openNode(node);}, this);

		virtualTree.addListener("treeOpenWhileEmpty",function (e) {
			this.expandDirectoryListing(e.getData().nodeId);}, this);
		virtualTree.addListener("treeOpenWithContent",function (e) {
			this.expandDirectoryListing(e.getData().nodeId);}, this);

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
					e.addData(type, this.getNodePath(this.getSelectedNode()));
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

		return (this);
	},

	members : {
		__fileHandler : null,
		__baseURL : "/visu/desk/php/",
		__baseDir : "data",
		__virtualTree : null,
		__rootId : null,

		__actionNames : null,
		__actionCallbacks : null,
		__actionsHandler : null,
		__actionsMenuButton : null,

		__updateDirectoryInProgress : null,

		updateRoot : function ()
		{
			this.expandDirectoryListing(this.__rootId);
		},

		getActions : function ()
		{
			return this.__actionsHandler;
		},

		createDefaultStaticActions : function ()
		{
			var myBrowser=this;
			function fileClicked(node) {
				var modificationTime=myBrowser.getNodeMTime(node);
				var file=myBrowser.getNodeURL(node);
				var extension=file.substring(file.length-4, file.length);
				switch (extension)
				{
				case ".vtk":
					var meshView=new desk.meshView(file);
					qx.core.Init.getApplication().getRoot().add(meshView);
					break;
				case ".ply":
				case ".obj":
				case ".stl":
					var meshView=new desk.meshView(node,myBrowser);
					qx.core.Init.getApplication().getRoot().add(meshView);
					break;
				case ".png":
				case ".jpg":
				case ".bmp":
					var imageView=new desk.imageView(file);
					qx.core.Init.getApplication().getRoot().add(imageView);
					break;
				case ".xml":
					var xmlhttp=new XMLHttpRequest();
					xmlhttp.open("GET",file+"?nocache=" + myBrowser.getNodeMTime(node),false);
					xmlhttp.send();
					var xmlDoc=xmlhttp.responseXML;
					
					if (xmlDoc.getElementsByTagName("mesh").length!=0)
					{
						var meshView=new desk.meshView(file);
						qx.core.Init.getApplication().getRoot().add(meshView);
					}
					else if (xmlDoc.getElementsByTagName("volume").length!=0)
					{
						var volView=new desk.volView(file);
						qx.core.Init.getApplication().getRoot().add(volView);
					}
					else
						alert ("xml file of unknown type!");
					break;
				case ".mhd":
					var volView=new desk.volView(node, myBrowser);
					qx.core.Init.getApplication().getRoot().add(volView);
					break;
				case ".par":
					myBrowser.getActions().createActionWindowFromURL(myBrowser.getNodeURL(node));
					break;
				default:
					alert("no file handler exists for extension "+extension);
				}
				
			}

			myBrowser.setFileHandler(fileClicked);

			myBrowser.addAction("redo action", function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					myBrowser.__actionsHandler.createActionWindowFromURL(
						myBrowser.getNodeURL(node));
				else
					myBrowser.__actionsHandler.createActionWindowFromURL(
						myBrowser.getNodeURL(node)+"\/parameters.txt");});

			myBrowser.addAction("segment", function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					var volView=new desk.gcSegmentation(node, myBrowser);
				else
					alert("Cannot segment a directory!");});

			myBrowser.addAction("download",function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
				{
					var oIFrm = document.getElementById('myIFrm');
					oIFrm.src = "/visu/desk/php/download.php?fileName="+myBrowser.getNodePath(node);
				} 
				else
					alert("Cannot download a directory!");});

			myBrowser.addAction("view/edit text", function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					var volView=new desk.textEditor(node, myBrowser);});

			myBrowser.addAction("info",function (node) {
				alert ("file name : "+myBrowser.getNodePath(node)
					+"\n file URL : "+myBrowser.getNodeURL(node));});

			myBrowser.addAction("update",function (node) {
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
					myBrowser.expandDirectoryListing(node.parentNodeId);
				else
					myBrowser.expandDirectoryListing(node.nodeId);});
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
			this.updateContextMenu();
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

		getEventNode : function (e)
		{
			return (this.__virtualTree.getDataModel().getNodeFromRow(e.getRow()));
		},

		getNodeMTime : function (node)
		{
			return (this.__virtualTree.getDataModel().getColumnData(node.nodeId, 1));
		},

		getNodeURL : function (node)
		{
			return (this.__baseURL+this.getNodePath(node));
		},

		getNodePath : function (node)
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

		updateContextMenu : function()
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
			actionsButton.addListener("click", function (e) {
				this.__actionsHandler.openActionsMenu(e, this);
					}, this);

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
		},

		expandDirectoryListing : function(node) {
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
			req.setUrl("/visu/desk/php/listDir.php");
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData({"dir" : this.getNodePath(node)});
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

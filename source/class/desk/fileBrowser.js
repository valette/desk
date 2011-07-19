qx.Class.define("desk.fileBrowser", 
{
  extend : qx.ui.window.Window,

	construct : function()
	{
		this.base(arguments);

		this.setLayout(new qx.ui.layout.VBox());
		this.setShowClose(false);
		this.setShowMinimize(false);
		this.setUseMoveFrame(true);
		this.setCaption("files");
		this.setHeight(400);
		this.open();

		var virtualTree = new qx.ui.treevirtual.TreeVirtual(["files","mTime","size"],
			{initiallyHiddenColumns : [1]});

		virtualTree.set({
			width  : 400,
			rowHeight: 22,
			alwaysShowOpenCloseSymbol : true,
			columnVisibilityButtonVisible : false});
		var dataModel = virtualTree.getDataModel();

		var textField = new qx.ui.form.TextField();
		textField.setValue("");
		textField.addListener("input", function() {
			dataModel.setData();
			},this);
		this.add(textField);

		// Set the filter
		var filter = qx.lang.Function.bind(function(node)
			{
				if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					var label = node.label;
					return label.indexOf(textField.getValue()) != -1;
				}
				return true;
			}, this);
		dataModel.setFilter(filter);

		this.add(virtualTree,{flex: 1});

		// add root directory
		var dataRootId = dataModel.addBranch(null, this.__baseDir, true);
		this.expandDirectoryListing(dataRootId);

		this.__virtualTree=virtualTree;

		// events handling

		this.updateContextMenu();

		virtualTree.addListener("cellContextmenu", function(e) {
			this.__rightClickedNode=this.getEventNode(e);}, this);

		virtualTree.addListener("cellDblclick", function (e) {
			var node=this.getEventNode(e);
			this.openNode(node);}, this);

		virtualTree.addListener("treeOpenWhileEmpty",function (e) {
			this.expandDirectoryListing(e.getData().nodeId);}, this);
		virtualTree.addListener("treeOpenWithContent",function (e) {
			this.expandDirectoryListing(e.getData().nodeId);}, this);

///////////////////////////
/*		var form, upload;

		form = new desk.UploadForm("upload", "http://vip.creatis.insa-lyon.fr:8080/visu/upload/uploadtest.pl");
		form.setLayout(new qx.ui.layout.HBox());
		form.addListener("completed", function(e) 
		{ 
		  alert("complete");
		});

		upload = new desk.UploadButton("file", "Upload");
		upload.addListener("changeFileName", function(e)
		{
		  if (e.getData() != "") form.send();
		});
		form.add(upload);
		this.add(form);*/
//////////////////////////

		return (this);
	},

	members : {
		__fileHandler : null,
		__baseURL : "http://vip.creatis.insa-lyon.fr:8080/visu/",
		__baseDir : "data",
		__virtualTree : null,
		__rightClickedNode : null,

		__actionNames : [],
		__actionCallbacks : [],

		addAction : function (actionName, callback)
		{
			var location=this.__actionNames.indexOf(actionName);
			if (location==-1)
			{
				this.__actionNames.push(actionName);
			}
			else
				alert ("Warning : action "+actionName+" already exists, is overwritten!");

			this.__actionCallbacks[actionName]=callback;
			this.updateContextMenu();
		},

		setFileHandler : function (callback) {
			this.__fileHandler=callback;
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
				this.__virtualTree.getDataModel().setState(node.nodeId,{bOpened : true});
		},

		updateContextMenu : function()
		{
			this.__virtualTree.setContextMenuFromDataCellsOnly(true);

			var menu = new qx.ui.menu.Menu;

			// the default "open" button
			var openButton = new qx.ui.menu.Button("Open");
			openButton.addListener("execute", function (){
				var node=this.__rightClickedNode;
				this.openNode (node);
				this.__rightClickedNode=null;}, this);
			menu.add(openButton);

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
					var node=buttonFileBrowser.__rightClickedNode;
					buttonFileBrowser.__rightClickedNode=null;
					buttonFileBrowser.__actionCallbacks[buttonActionName](node);
					}, button);
				menu.add(button);
			}
			this.__virtualTree.setContextMenu(menu);
		},

		expandDirectoryListing : function(node) {
			var dataModel=this.__virtualTree.getDataModel();
			dataModel.prune(node,false);

			// Instantiate request
			var req = new qx.io.request.Xhr();
			req.setUrl("/visu/listDir.php");
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
					var newNode=dataModel.addLeaf(node, filesArray[i]);
					dataModel.setColumnData(newNode, 1, modificationTimes[filesArray[i]]);
					dataModel.setColumnData(newNode, 2, sizes[filesArray[i]]);
				}
				dataModel.setData();
			}
		}
	}
});

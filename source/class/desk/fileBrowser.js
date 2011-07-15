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
		this.open();

		var virtualTree = new qx.ui.treevirtual.TreeVirtual(["Tree","mTime"],
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
		var dataRootId = dataModel.addBranch(null, this.__baseDir, true);

		this.__virtualTree=virtualTree;
		this.expandDirectoryListing(dataRootId);
		var fileBrowser=this;

		function myCallbackForFolders(e)
		{
			fileBrowser.expandDirectoryListing(e.getData().nodeId);
		}

		var rightClickOnNode = function(e) {
			this.__rightClickedNode=this.getEventNode(e);
		};


		var dblClickOnNode = function(e) {
			var node=this.getEventNode(e);
			this.openNode(node);
		};

		virtualTree.setContextMenuFromDataCellsOnly(true);
		virtualTree.setContextMenu(fileBrowser.getContextMenu());
		virtualTree.addListener("cellContextmenu", rightClickOnNode, this);
		virtualTree.addListener("cellDblclick", dblClickOnNode, this);
		virtualTree.addListener("treeOpenWhileEmpty",myCallbackForFolders);
		virtualTree.addListener("treeOpenWithContent",myCallbackForFolders);

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

		extractMeshes : function () {
			var node=this.__rightClickedNode;
			var file=node.label;
			this.__rightClickedNode=null;

			var extension=file.substring(file.length-4, file.length);
			if (extension!=".mhd")
				alert ("Error ! extension "+extension+" not supported!");
			else
			{
				var meshView=new desk.meshView(node, this);
				qx.core.Init.getApplication().getRoot().add(meshView);
			}
		},

		getContextMenu : function()
		{
			var menu = new qx.ui.menu.Menu;

			var openButton = new qx.ui.menu.Button("Open");
			openButton.addListener("execute", function (){
				this.openNode (this.__rightClickedNode);
				this.__rightClickedNode=null;}, this);
			menu.add(openButton);

			var meshButton = new qx.ui.menu.Button("Extract surfaces");
			meshButton.addListener("execute", this.extractMeshes, this);
			menu.add(meshButton);

			return menu;
		},

		expandDirectoryListing : function(node) {
			var dataModel=this.__virtualTree.getDataModel();
			dataModel.prune(node,false);

			var ajax = new XMLHttpRequest();
			ajax.onreadystatechange = function()
			{
				if(this.readyState == 4 && this.status == 200)
				{
					//	alert("ajax.responseText : " + ajax.responseText);
					var files=ajax.responseText.split("\n");
					var filesArray=new Array();
					var directoriesArray=new Array();
					var modificationTimes=new Array();
					for (var i=0;i<files.length;i++)
					{
						var splitfile=files[i].split(" ");
						var fileName=splitfile[0];
						if (fileName!="")
						{
							if (splitfile[1]=="file")
								filesArray.push(fileName);
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
					}
					dataModel.setData();
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					// fetched the wrong page or network error...
					alert('"Fetched the wrong page" OR "Network error"');
				}
			};
			ajax.open("POST", "/visu/listdir.php", true);
			ajax.send(this.getNodePath(node));
		}
	}
});

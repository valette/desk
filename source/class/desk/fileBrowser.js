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

		qx.Class.include(qx.ui.treevirtual.TreeVirtual,
			qx.ui.treevirtual.MNode);

		var virtualTree = new qx.ui.treevirtual.TreeVirtual(["Tree","mTime"],
			{initiallyHiddenColumns : [1]});

		virtualTree.set({
			width  : 400,
			rowHeight: 22,
			alwaysShowOpenCloseSymbol : true,
			columnVisibilityButtonVisible : false});

		this.add(virtualTree,{flex: 1});
		var dataModel = virtualTree.getDataModel();
		var dataRootId = dataModel.addBranch(null, this.__baseDir, true);

		this.__virtualTree=virtualTree;

		this.expandDirectoryListing(dataRootId);
		var fileBrowser=this;

		function myCallbackForFolders(e)
		{
			fileBrowser.expandDirectoryListing(e.getData().nodeId);
		}

		function myCallbackForFiles(e)
		{
				var selectedNodes = e.getData();
				var node=selectedNodes[0];
				if (node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
				{
					if (fileBrowser.__fileHandler!=null)
						fileBrowser.__fileHandler(node);
				}
				else
					fileBrowser.expandDirectoryListing(node.nodeId);
		}

		var logCellEvent = function(e) {
	//	alert (e+"**"+e.getRow());
			var node=this.__virtualTree.getDataModel().getRowData(e.getRow());
			alert ("node : "+node+"**"+node.nodeId);//+"** handler : "+this.__fileHandler);
			if ((this.__fileHandler!=null)
					&&(node.type==qx.ui.treevirtual.MTreePrimitive.Type.LEAF))
					this.__fileHandler(node);
//        alert (e.getType()+"**"+e.nodeId);
      };
		virtualTree.addListener("changeSelection",myCallbackForFiles);
//		virtualTree.addListener("cellClick", logCellEvent, this);

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

//		root.addListener("click", function(event){
//			this.expandDirectoryListing(this);
//			},root);
		return (this);
	},

	members : {
		__fileHandler : null,
		__baseURL : "http://vip.creatis.insa-lyon.fr:8080/visu/",
		__baseDir : "data",
		__virtualTree : null,

		setFileHandler : function (callback) {
			this.__fileHandler=callback;
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
			var nodePath="";
			for (var i=0;i<hierarchy.length;i++)
			{
				nodePath+=hierarchy[i];
				if (i<hierarchy.length-1)
					nodePath+="\/";
			}
			return (nodePath);
		},

		extractMeshes : function () {
			var file=this.getLabel();
			var extension=file.substring(file.length-4, file.length);
			if (extension!=".mhd")
				alert ("Error ! extension "+extension+" not supported!");
			else
			{
				var meshView=new desk.meshView(this);
				qx.core.Init.getApplication().getRoot().add(meshView);
			}
		},

		getContextMenu : function(node)
		{
			var menu = new qx.ui.menu.Menu;
			var meshButton = new qx.ui.menu.Button("Extract surfaces");
			meshButton.addListener("execute", this.extractMeshes, node);
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
//						filenode.addListener("click", function(event){
//							if (fileBrowser.__fileHandler!=null)
//							fileBrowser.__fileHandler(this);},filenode);
//						filenode.setContextMenu(fileBrowser.getContextMenu(filenode));
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

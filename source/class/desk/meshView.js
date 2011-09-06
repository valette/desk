qx.Class.define("desk.meshView", 
{
  extend : qx.ui.window.Window,

	construct : function(file, fileBrowser)
	{
		this.base(arguments);

		this.setLayout(new qx.ui.layout.VBox());
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);
		this.setContentPadding(2);
		this.setCaption(file);
		this.open();

		var meshView=this;
		if (fileBrowser!=null)
		{
			this.setCaption(fileBrowser.getNodeURL(file));
			//file is a tree node...
			var node=file;
			var file=fileBrowser.getNodePath(node);
			var extension=file.substring(file.length-4, file.length);
			switch (extension)
			{
			case ".xml":
				this.setCaption(node.label);
				var ajax = new XMLHttpRequest();
				ajax.onreadystatechange = function()
				{
					if(this.readyState == 4 && this.status == 200)
					{
						var sha1=ajax.responseText.split("\n")[0];
						meshView.openFile("\/visu\/visu_cache\/"+sha1+"\/"+"meshes.xml");
					}
					else if (this.readyState == 4 && this.status != 200)
					{
						// fetched the wrong page or network error...
						alert('"Fetched the wrong page" OR "Network error"');
					}
				};
				var label = new qx.ui.basic.Label("Extracting meshes, wait...").set({
					font : new qx.bom.Font(28, ["Verdana", "sans-serif"])
					});
				this.add(label, {flex : 1});
				ajax.open("POST", "\/visu\/desk\/php\/volumeAnalysis.php", true);
				ajax.send(file);
				break;
			case ".ply":
			case ".obj":
			case ".stl":
				var parameterMap={
					"action" : "mesh2vtk",
					"input_file" : file,
					"output_directory" : "cache\/"};
				fileBrowser.getActions().launchAction(parameterMap, getAnswer, this);

				function getAnswer(e)
				{
					var req = e.getTarget();
					var splitResponse=req.getResponseText().split("\n");
					var outputDir=splitResponse[0];
					console.log(req.getResponseText());
					var mtime=splitResponse[splitResponse.length-3];
					meshView.openFile("\/visu\/desk\/php\/"+outputDir+"\/"+"mesh.vtk",mtime);
				}
				break;
			default	:
				alert ("extension "+extension+" not supported for mesh viewer");
			}
		}
		else
		{
			this.setCaption(file);
			this.openFile(file);
		}
		return (this);
	},

	statics : {
		LINKEDWINDOW : null
	},

	members : {
		__iframe : null,

		openFile : function (file, mtime) {
			this.removeAll();

			this.__iframe = new qx.ui.embed.Iframe().set({
				width: 400,
				height: 400,
				minWidth: 200,
				minHeight: 150,
				decorator:null});
		
			this.__iframe.setFrameName('o3dframe');

			if (qx.core.Environment.get("browser.name")=="firefox")
			{
			// quirk for firefox which oes not handle iframes correctly
				if (mtime!=null)
					this.__iframe.setSource("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?mesh="+file+
						"&width=400&height=400&mtime="+mtime);
				else
					this.__iframe.setSource("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?mesh="+file+
						"&width=400&height=400&mtime="+mtime);

				this.__iframe.addListenerOnce("load", function(e) { 
				    this.addListener("resize", 
					function(event) {this.__iframe.getWindow().resizeClient(this.getWidth()-7,this.getHeight()-32);},this);
				    }, this);
			}
			else
			{
				if (mtime!=null)
					this.__iframe.setSource("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?mesh="+file+"&mtime="+mtime);
				else
					this.__iframe.setSource("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?mesh="+file);
			}

			this.add(this.__iframe,{flex: 1});

			this.addListener("mouseout", 
				function(event) {this.__iframe.getWindow().g_scene.stopDragging();},this);

			this.addListener("keypress", 
				function(event) {this.__iframe.getWindow().keyPressed(event.getKeyCode());},this);

			this.addListener("keypress", function(event) {
				if (event.getKeyIdentifier()=="S")
					desk.meshView.LINKEDWINDOW=this;
				},this);

			this.addListener("click", function(event) {
				var window=desk.meshView.LINKEDWINDOW;
				if ((window!=null)&&(window!=this))
				{
					this.__iframe.getWindow().g_scene.bind(window.__iframe.getWindow().g_scene);
					window.__iframe.getWindow().g_scene.bind(this.__iframe.getWindow().g_scene);
					this.__iframe.getWindow().g_scene.cameracontroller.onChange();
					desk.meshView.LINKEDWINDOW=null;
				}},this);

			this.setDroppable(true);
			this.addListener("drop", function(e) {
					var fileBrowser=e.getData("fileBrowser");
					var nodes=fileBrowser.getSelectedNodes();
					var scene=this.getScene();
					var numberOfMeshes=nodes.length;

					for (var i=0;i<nodes.length;i++)
					{
						var fileNode=nodes[i];
						var fileName=fileBrowser.getNodeURL(fileNode);
						scene.loadMesh(fileName, function (){
							numberOfMeshes--;
							if (numberOfMeshes==0)
								scene.render();});
					}
					// activate the window
					var windowManager=qx.core.Init.getApplication().getRoot().getWindowManager();
					windowManager.bringToFront(this);
				}, this);
		},

		getScene : function() {
				return this.__iframe.getWindow().g_scene;
		}
	}
});

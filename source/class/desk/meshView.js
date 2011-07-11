qx.Class.define("desk.meshView", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
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
		if (file.getTree!=null)
		{
			//file is a tree node...
			var node=file;
			this.setCaption(node.getLabel());
			var fileBrowser=node.getTree().getUserData("fileBrowser");
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
			ajax.open("POST", "/visu/volumeAnalysis.php", true);
			ajax.send(fileBrowser.getNodePath(node));
		}
		else
		{
			this.setCaption(file);
			this.openFile(file);
		}
		return (this);
	},

	members : {
		__iframe : null,

		openFile : function (file) {
			this.removeAll();

			this.__iframe = new qx.ui.embed.Iframe().set({
				width: 400,
				height: 400,
				minWidth: 200,
				minHeight: 150,
				decorator:null});
		
			this.__iframe.setFrameName('o3dframe');
			this.__iframe.setSource("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?"+file);
			this.add(this.__iframe,{flex: 1});
			this.addListener("mouseout", 
				function(event) {this.__iframe.getWindow().g_scene.stopDragging();},this);
			this.addListener("keypress", 
				function(event) {this.__iframe.getWindow().keyPressed(event.getKeyCode());},this);

			},

		getScene : function() {
				return this.__iframe.getWindow().g_scene;
		}
	}
});

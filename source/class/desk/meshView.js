qx.Class.define("desk.meshView", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
	{
		this.base(arguments);

		var layout = new qx.ui.layout.VBox();
		this.setLayout(layout);
		this.setAllowClose(true);
		this.setAllowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setContentPadding(2);
		this.open();

		this.__iframe = new qx.ui.embed.Iframe().set({
			width: 400,
			height: 400,
			decorator:null,
			source: "http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?"+file
			});
		this.add(this.__iframe,{flex: 1});
		this.addListener("mouseout", function(event) {this.__iframe.getWindow().g_scene.stopDragging();},this);
	},

	members : {
		__iframe : null,

		getScene : function() {
			return this.__iframe.getWindow().g_scene;
		}
	}
});

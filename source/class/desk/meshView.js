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

		this.__iframe = new qx.ui.embed.Iframe().set({
			width: 400,
			height: 400,
			minWidth: 200,
			minHeight: 150,
			decorator:null});
		
		this.__iframe.setFrameName('o3dframe');
		this.__iframe.setSource("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?"+file);
		this.add(this.__iframe,{flex: 1});
		this.addListener("mouseout", function(event) {this.__iframe.getWindow().g_scene.stopDragging();},this);
		this.addListener("keypress", function(event) {
			this.__iframe.getWindow().keyPressed(event.getKeyCode());},this);
		return (this);
	},

	members : {
		__iframe : null,

		getScene : function() {
			return this.__iframe.getWindow().g_scene;
		}
	}
});

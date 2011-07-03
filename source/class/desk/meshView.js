var MyGlobalWindowReference=0;

qx.Class.define("desk.meshView", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
	{
		this.base(arguments);//, "twitter", "twitter/t_small-c.png");

		// hide the window buttons
		this.setShowClose(true);
		this.setShowMaximize(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		// adjust size
		this.setWidth(400);
		this.setHeight(400);

		var layout = new qx.ui.layout.VBox();
		this.setContentPadding(2);
		this.setLayout(layout);

		var html1 = "<div id=\"o3d\" style=\"width: 100\%; height: 100\%;\"><\/div>";
		this._embed1 = new qx.ui.embed.Html(html1);
		//      embed1.setDecorator("main");
		this.add(this._embed1);
		this.open();

		this.addListener("close",uninit, this);
		this.addListener("appear",init, this);


		function resizeClient() {
			this._embed1.setWidth(this.getWidth());
			this._embed1.setHeight(this.getHeight());
			this._scene.resize();
			this._scene.render();

			function workaround_render()
			{
				this._scene.render();
			}
//			var t=setTimeout(workaround_render,500);
		}

		function init() {
			MyGlobalWindowReference=this;
			o3djs.webgl.makeClients(initStep2);
		}

		function initStep2(clientElements) {
			alert(MyGlobalWindowReference._scene);
			MyGlobalWindowReference._scene=o3djs.renderscene.createRenderScene(clientElements[0]);
		//	MyGlobalWindowReference._scene.render();
			MyGlobalWindowReference._scene.resize();
			MyGlobalWindowReference._scene.addMeshes("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/ADAM/adam.xml");
			MyGlobalWindowReference.addListener("resize",resizeClient,MyGlobalWindowReference);
//			MyLocalScene=0;
		}


		function uninit() {
			if (this._scene.client) {
			this._scene.client.cleanup();
			}
		}
	},

  members : {
    __list : null,
    __textarea : null,

    
    getList : function() {
      return this.__list;
    },
    
    
    clearPostMessage : function() {
      this.__textarea.setValue(null);
    }
  }
});

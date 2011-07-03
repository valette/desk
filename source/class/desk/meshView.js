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

		var layout = new qx.ui.layout.Basic();
		this.setContentPadding(2);
		this.setLayout(layout);

		this.open();
		var html1 = "<div id=\"container\" style=\"width: 100\%; height: 100\%;\"><\/div>";
		this._embed1 = new qx.ui.embed.Html(html1);
		this._embed1.setWidth(400);
		this._embed1.setHeight(400);
		this.add(this._embed1);

//		this.addListener("close",uninit, this);
		this._embed1.addListener("appear",init, this);

		function init() {
			var container;
			var camera, scene, renderer;
			// scene and camera

			scene = new THREE.Scene();
			scene.fog = new THREE.FogExp2( 0xffffff, 0.002 );

			camera = new THREE.TrackballCamera({

				fov: 60, 
				aspect: this.getWidth() / this.getHeight(),
				near: 1,
				far: 1e3,

				rotateSpeed: 1.0,
				zoomSpeed: 1.2,
				panSpeed: 0.8,

				noZoom: false,
				noPan: false,

				staticMoving: true,
				dynamicDampingFactor: 0.3,

				keys: [ 65, 83, 68 ]

			});

			camera.position.z = 500;

			// world

			var cube = new THREE.CubeGeometry( 20, 60, 20 );
			
			cube.vertices[ 0 ].position.multiplyScalar( 0.01 );
			cube.vertices[ 1 ].position.multiplyScalar( 0.01 );
			cube.vertices[ 4 ].position.multiplyScalar( 0.01 );
			cube.vertices[ 5 ].position.multiplyScalar( 0.01 );
			
			var material =  new THREE.MeshLambertMaterial( { color:0xffffff } );

			for( var i = 0; i < 50; i++ ) {
				
				var mesh = new THREE.Mesh( cube, material );
				mesh.position.set(( Math.random() - 0.5 ) * 1000,
								  ( Math.random() - 0.5 ) * 1000,
								  ( Math.random() - 0.5 ) * 1000 );
								  
				mesh.updateMatrix();
				mesh.matrixAutoUpdate = false;
				scene.addChild( mesh );
				
			}

			// lights

			light = new THREE.DirectionalLight( 0xffffff );
			light.position.set( 1, 1, 1 );
			scene.addChild( light );

			light = new THREE.DirectionalLight( 0x002288 );
			light.position.set( -1, -1, -1 );
			scene.addChild( light );

			light = new THREE.AmbientLight( 0x222222 );
			scene.addChild( light );


			// renderer

			renderer = new THREE.WebGLRenderer( { antialias: false } );
			renderer.setClearColorHex( 0xffffff, 1 );
			renderer.setSize( this.getWidth(), this.getHeight() );

			container = document.getElementById( 'container' );
			container.appendChild( renderer.domElement );


			setInterval( loop, 1000 / 60 );


			function loop() {
				renderer.render( scene, camera );
			}

		}


		function uninit() {
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

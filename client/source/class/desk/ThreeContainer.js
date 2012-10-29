/*
#ignore(THREE.*)
#ignore(THREE)
#ignore(requestAnimationFrame)
#ignore(Detector)
#ignore(Uint8Array)
@lint ignoreGlobal(THREE)
*/

qx.Class.define("desk.ThreeContainer", 
{
	extend : qx.ui.container.Composite,

	construct : function()
	{
		this.base(arguments);
		this.setLayout(new qx.ui.layout.Canvas());
		var threeCanvas = new qx.ui.embed.Canvas();
		this.add(threeCanvas, {width : "100%", height : "100%"});
		this.__threeCanvas = threeCanvas;

		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		var scene = new THREE.Scene();
		var camera = new THREE.PerspectiveCamera(60,1, 0.01, 1e10);
		var controls = new THREE.TrackballControls2(camera,threeCanvas.getContentElement().getCanvas());

		this.__controls=controls;
		controls.zoomSpeed = 6;
		this.__scene=scene;
		this.__camera=camera;
		scene.add(camera);

		// lights
		var dirLight = new THREE.DirectionalLight( 0xcccccc );
		dirLight.position.set( 200, 200, 1000 ).normalize();
		camera.add( dirLight );
		camera.add( dirLight.target );
		var ambientLight = new THREE.AmbientLight(0x555555);
		scene.add( ambientLight );

		// renderer
		var renderer = new THREE.WebGLRenderer(
			{ canvas : threeCanvas.getContentElement().getCanvas(),
			antialias: true } 
		);
		this.__renderer=renderer;
		renderer.setClearColorHex( 0xffffff, 1 );
//		resizeHTML.apply(this);

		threeCanvas.addListener("resize",this.__resizeThreeCanvas, this);
		return this;
	},

	members :
	{
		__renderFunction : null,
		__renderingTriggered : false,

		render : function ( force ) {
			var _this=this;

			if (this.__renderFunction==null) {
				this.__renderFunction=
					function () {
						_this.__renderer.render( _this.__scene, _this.__camera );
						_this.__renderingTriggered = false;
				};
			}
			if (force==true) {
				this.__renderFunction();
				return;
			}			

			if (!this.__renderingTriggered) {
				this.__renderingTriggered=true;
				requestAnimationFrame(this.__renderFunction);
			}
		},

		__resizeThreeCanvas : function () {		
			var elementSize = this.__threeCanvas.getInnerSize();
			this.__threeCanvasSize = elementSize;
			if (elementSize == null) {
				return;
			}
			this.__renderer.setSize(  elementSize.width , elementSize.height );
			this.__camera.aspect=elementSize.width / elementSize.height;
			this.__camera.updateProjectionMatrix();
			this.__controls.setSize( elementSize.width , elementSize.height );
			this.render();
		},

		getCanvas : function() {
			return this.__threeCanvas;
		},

		getScene : function() {
			return this.__scene;
		},

		getCamera : function() {
			return this.__camera;
		},

		getControls : function() {
			return this.__controls;
		},

		getRenderer : function () {
			return this.__renderer;
		},

		snapshot : function (factor) {
			if (!factor) {
				factor = 1;
			}

			var width = this.getWidth();
			var height = this.getHeight();
			var renderer = this.__renderer;
		//	if (factor === 1) {
				this.render(true);
				var strData = renderer.domElement.toDataURL("image/png");
				var saveData = strData.replace("image/png", "image/octet-stream");
				document.location.href = saveData;
		//	}
	/*		else {
				this.addListenerOnce("resize", function() {
				console.log('test');
					var strData = renderer.domElement.toDataURL("image/png");
					var saveData = strData.replace("image/png", "image/octet-stream");
					document.location.href = saveData;
					this.set({width: width, height : height});
				}, this);
				this.set({width: width*factor, height : height*factor});
			}*/
		},

		__threeCanvas : null,
		__threeCanvasSize : null,
		__scene : null,
		__camera : null,
		__controls : null,
		__renderer : null
	}
	
});

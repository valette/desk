/**
* A container which includes a THREE.js scene, camera, controls and renderer
 * @ignore(THREE.Scene)
 * @ignore(THREE.PerspectiveCamera)
 * @ignore(THREE.TrackballControls2)
 * @ignore(THREE.DirectionalLight)
 * @ignore(THREE.AmbientLight)
 * @ignore(THREE.WebGLRenderer)
 * @ignore(Detector.webgl)
 * @ignore(Detector.addGetWebGLMessage)
 * @ignore(THREE.Vector3)
 * @ignore(THREE.Mesh)
 * @ignore(THREE.Box3)
 * @ignore(requestAnimationFrame)
*/
qx.Class.define("desk.ThreeContainer", 
{
	extend : qx.ui.container.Composite,

	/**
	 * Constructor
	*/
	construct : function()
	{
		this.base(arguments);
		var canvas = new qx.ui.layout.Canvas()
		this.setLayout(canvas);
		qx.util.DisposeUtil.disposeTriggeredBy(canvas, this);
		var threeCanvas = new qx.ui.embed.Canvas();
		this.add(threeCanvas, {width : "100%", height : "100%"});
		this.__threeCanvas = threeCanvas;

		if (!Detector.webgl) Detector.addGetWebGLMessage();

		var scene = new THREE.Scene();
		var camera = new THREE.PerspectiveCamera(60,1, 0.01, 1e10);
		var controls = new THREE.TrackballControls2(camera,threeCanvas.getContentElement().getCanvas());

		this.__controls = controls;
		controls.zoomSpeed = 6;
		this.__scene = scene;
		this.__camera = camera;
		scene.add(camera);

		// lights
		var dirLight = new THREE.DirectionalLight( 0xcccccc );
		dirLight.position.set(200, 200, 1000).normalize();
		camera.add(dirLight);
		camera.add(dirLight.target);
		var ambientLight = new THREE.AmbientLight(0x555555);
		scene.add(ambientLight);

		// renderer
		var renderer = new THREE.WebGLRenderer(
			{canvas : threeCanvas.getContentElement().getCanvas(),
			antialias: true} 
		);
		this.__renderer = renderer;
		renderer.setClearColorHex(0xffffff, 1);

		threeCanvas.addListener("resize", this.__resizeThreeCanvas, this);
		this.__setupFullscreen();
	},

	destruct : function(){
		//clean the scene
		this.__scene = null;
		this.__renderer = null;
		this.__threeCanvas.destroy();
		this.__threeCanvas = null;
		this.__camera = null;
		this.__controls = null;
	},

	properties : {
		/**
		* in fullscreen mode, the container covers the entire browser window
		*/
		fullscreen : { init : false, check: "Boolean", event : "changeFullscreen"}
	},

	events : {
		// fired after each render
		"render" : "qx.event.type.Event"
	},

	members : {
		__renderFunction : null,
		__renderingTriggered : false,

		__setupFullscreen : function () {
			var parent, width, height;
			this.addListener('changeFullscreen', function (e) {
				if (!e.getData()) {
					this.set({height : height, width : width});
					parent.add(this);
				} else {
					height = this.getHeight();
					width = this.getWidth();
					parent = this.getLayoutParent();
					this.set ({width : window.innerWidth,
							height : window.innerHeight,
							zIndex : 10000000});
					qx.core.Init.getApplication().getRoot().add(this);
				}
			});
			this.addListener('keypress', function (event) {
				if (event.getKeyIdentifier() === 'F') {
					this.toggleFullscreen();
				}
			}, this);
		},

		/**
		* Renders the scene
		* @param force {Boolean} forces display (i.e. does not use
		* requestAnimationFrame())
		*/
		render : function ( force ) {
			var _this = this;
			if (!this.__renderFunction) {
				this.__renderFunction =	function () {
					if (!_this.__renderer) {
						// there is a race condition :
						// rendering can be triggered after widget deletion
						return;
					}
					_this.__renderer.render( _this.__scene, _this.__camera );
					_this.__renderingTriggered = false;
					_this.fireEvent('render');
				};
			}
			if (force) {
				this.__renderFunction();
				return;
			}			

			if (!this.__renderingTriggered) {
				this.__renderingTriggered = true;
				requestAnimationFrame(this.__renderFunction);
			}
		},

		__resizeThreeCanvas : function () {		
			var elementSize = this.__threeCanvas.getInnerSize();
			this.__threeCanvasSize = elementSize;
			if (!elementSize) {
				return;
			}
			this.__renderer.setSize(elementSize.width, elementSize.height);
			this.__camera.aspect = elementSize.width / elementSize.height;
			this.__camera.updateProjectionMatrix();
			this.__controls.setSize(elementSize.width, elementSize.height);
			this.render();
		},

		/**
		* Returns the canvas containing the output
		* @return {qx.ui.embed.Canvas} canvas containing the scene
		*/
		getCanvas : function() {
			return this.__threeCanvas;
		},

		/**
		* Returns the scene
		* @return {THREE.Scene} scene
		*/
		getScene : function() {
			return this.__scene;
		},

		/**
		* Returns the camera
		* @return {THREE.Camera} the camera
		*/
		getCamera : function() {
			return this.__camera;
		},

		/**
		* Returns the controls
		* @return {THREE.TrackballControls2} the controls
		*/
		getControls : function() {
			return this.__controls;
		},

		/**
		* Returns the renderer
		* @return {THREE.WebGLRenderer} the controls
		*/
		getRenderer : function () {
			return this.__renderer;
		},

		// stores the scene bounding box diagonal length, usefull for updating
		__boudingBoxDiagonalLength : 0,

		/**
		* resets the camera to view all objects in the scene
		*/
		resetView : function () {
			this.__boudingBoxDiagonalLength = 0;
			this.viewAll();
		},

		/**
		* Sets the camera to view all objects in the scene
		*/
		viewAll : function () {
			var bbox = new THREE.Box3();
			var found;
			this.__scene.traverse(function(child){
				if (child.geometry) {
					var geometry = child.geometry;
					if (!geometry.boundingBox) {
						geometry.computeBoundingBox();
					}
					bbox.union(geometry.boundingBox);
					found = true;
				}
			});

			if (!found) {
				return;
			}

			var min = bbox.min;
			var max = bbox.max;

			var center = min.clone().add(max).multiplyScalar(0.5);
			var bbdiaglength = Math.sqrt(max.clone().sub(min).lengthSq());

			var camera = this.__camera;
			var controls = this.__controls;

			if (this.__boudingBoxDiagonalLength === 0) {
				this.__boudingBoxDiagonalLength = bbdiaglength;
				camera.position.copy(center);
				camera.position.z -= bbdiaglength;
				camera.up.set(0,1,0);
				controls.target.copy(center);
			} else {
				var ratio = bbdiaglength / this.__boudingBoxDiagonalLength;
				this.__boudingBoxDiagonalLength = bbdiaglength;
				camera.position.sub(controls.target)
					.multiplyScalar(ratio)
					.add(controls.target);
			}
			controls.update();
			this.render();
		},

		/**
		* Triggers a snapshot of the scene which will be downloaded by the browser
		*/
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

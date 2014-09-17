/**
* A container which includes a THREE.js scene, camera, controls and renderer
 * @ignore(THREE.*)
 * @ignore(Detector.*)
 * @ignore(requestAnimationFrame)
 * @ignore(Blob)
 * @ignore(Uint8Array)
*/
qx.Class.define("desk.ThreeContainer", 
{
	extend : qx.ui.container.Composite,

	/**
	 * Constructor
	*/
	construct : function() {
		this.base(arguments);
		this.setLayout(new qx.ui.layout.Canvas());

		var threeCanvas = this.__threeCanvas = this.__garbageContainer.getChildren()[0] || new qx.ui.embed.Canvas();
		threeCanvas.set({syncDimension : true, zIndex : 0});
		var canvas = threeCanvas.getContentElement().getCanvas();

		if (!Detector.webgl) Detector.addGetWebGLMessage();

		var scene = this.__scene = new THREE.Scene();
		var camera = this.__camera = new THREE.PerspectiveCamera(60,1, 0.01, 1e10);
		var controls = this.__controls = new THREE.TrackballControls2(camera, canvas);
		controls.zoomSpeed = 6;
		scene.add(camera);

		// lights
		var dirLight = new THREE.DirectionalLight( 0xcccccc );
		dirLight.position.set(200, 200, 1000).normalize();
		camera.add(dirLight);
		camera.add(dirLight.target);
		scene.add(new THREE.AmbientLight(0x555555));

		// renderer
		var renderer = this.__renderer = new THREE.WebGLRenderer({
			canvas : canvas, antialias: true, alpha : true,
			premultipliedAlpha : false, devicePixelRatio: 1});
		renderer.setClearColor( 0xffffff, 1 );

		this.__listenerId = threeCanvas.addListener("resize", this.__resizeThreeCanvas, this);
		this.add(threeCanvas, {width : "100%", height : "100%"});
		this.__resizeThreeCanvas();
		this.__setupFullscreen();
	},

	destruct : function(){
		this.__threeCanvas.removeListenerById(this.__listenerId);
		this.__garbageContainer.add(this.__threeCanvas);

		var ctx = this.__threeCanvas.getContentElement().getCanvas().getContext("webgl");
		// clean webgl context;
		// from https://www.khronos.org/registry/webgl/sdk/debug/webgl-debug.js
		var numAttribs = ctx.getParameter(ctx.MAX_VERTEX_ATTRIBS);
		var tmp = ctx.createBuffer();
		ctx.bindBuffer(ctx.ARRAY_BUFFER, tmp);
		for (var ii = 0; ii < numAttribs; ++ii) {
			ctx.disableVertexAttribArray(ii);
			ctx.vertexAttribPointer(ii, 4, ctx.FLOAT, false, 0, 0);
			ctx.vertexAttrib1f(ii, 0);
		}
		ctx.deleteBuffer(tmp);

		var numTextureUnits = ctx.getParameter(ctx.MAX_TEXTURE_IMAGE_UNITS);
		for (var ii = 0; ii < numTextureUnits; ++ii) {
			ctx.activeTexture(ctx.TEXTURE0 + ii);
			ctx.bindTexture(ctx.TEXTURE_CUBE_MAP, null);
			ctx.bindTexture(ctx.TEXTURE_2D, null);
		}

		ctx.activeTexture(ctx.TEXTURE0);
		ctx.useProgram(null);
		ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
		ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null);
		ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
		ctx.bindRenderbuffer(ctx.RENDERBUFFER, null);
		ctx.disable(ctx.BLEND);
		ctx.disable(ctx.CULL_FACE);
		ctx.disable(ctx.DEPTH_TEST);
		ctx.disable(ctx.DITHER);
		ctx.disable(ctx.SCISSOR_TEST);
		ctx.blendColor(0, 0, 0, 0);
		ctx.blendEquation(ctx.FUNC_ADD);
		ctx.blendFunc(ctx.ONE, ctx.ZERO);
		ctx.clearColor(0, 0, 0, 0);
		ctx.clearDepth(1);
		ctx.clearStencil(-1);
		ctx.colorMask(true, true, true, true);
		ctx.cullFace(ctx.BACK);
		ctx.depthFunc(ctx.LESS);
		ctx.depthMask(true);
		ctx.depthRange(0, 1);
		ctx.frontFace(ctx.CCW);
		ctx.hint(ctx.GENERATE_MIPMAP_HINT, ctx.DONT_CARE);
		ctx.lineWidth(1);
		ctx.pixelStorei(ctx.PACK_ALIGNMENT, 4);
		ctx.pixelStorei(ctx.UNPACK_ALIGNMENT, 4);
		ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);
		ctx.pixelStorei(ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		// TODO: Delete this IF.
		if (ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL) {
			ctx.pixelStorei(ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL, ctx.BROWSER_DEFAULT_WEBGL);
		}
		ctx.polygonOffset(0, 0);
		ctx.sampleCoverage(1, false);
		ctx.scissor(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.stencilFunc(ctx.ALWAYS, 0, 0xFFFFFFFF);
		ctx.stencilMask(0xFFFFFFFF);
		ctx.stencilOp(ctx.KEEP, ctx.KEEP, ctx.KEEP);
		ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT | ctx.STENCIL_BUFFER_BIT);

		// TODO: This should NOT be needed but Firefox fails with 'hint'
		while(ctx.getError());


		//clean the scene
		this._deleteMembers(this.__scene);
		this.__scene = null;
		this._deleteMembers(this.__renderer);
		this.__renderer = null;
		this.__threeCanvas = null;
		this._deleteMembers(this.__camera);
		this.__camera = null;
		this._deleteMembers(this.__controls);
		this.__controls = null;
	},

	properties : {
		/**
		* in fullscreen mode, the container covers the entire browser window
		*/
		fullscreen : {init : false, check: "Boolean", event : "changeFullscreen"}
	},

	events : {
		// fired before each render
		"beforeRender" : "qx.event.type.Event",

		// fired after each render
		"render" : "qx.event.type.Event"
	},

	members : {
		_deleteMembers : function (object) {
			var members = Object.keys(object);
			for (var i = 0; i < members.length; i++) {
				if (members[i] === "children") {
					object.children.length = 0;
				} else {
					delete object[members[i]];
				}
			}
		},

		__garbageContainer : new qx.ui.container.Composite(new qx.ui.layout.HBox()),
		__listenerId : null,

		__setupFullscreen : function () {
			var parent, width, height, color, alpha;
			this.addListener('changeFullscreen', function (e) {
				if (!e.getData()) {
					this.set({height : height, width : width});
					this.__renderer.setClearColor(color, alpha);
					parent.add(this);
				} else {
					height = this.getHeight();
					width = this.getWidth();
					parent = this.getLayoutParent();
					this.set ({width : window.innerWidth,
							height : window.innerHeight,
							zIndex : 500000});
					qx.core.Init.getApplication().getRoot().add(this);
					alpha = this.__renderer.getClearAlpha();
					color = this.__renderer.getClearColor();
					this.__renderer.setClearColor(color, 1);
				}
			}, this);
			this.addListener('keydown', function (event) {
				if ((event.getTarget() == this.getCanvas()) &&
                    (event.getKeyIdentifier() === 'F')) {
					this.toggleFullscreen();
				}
			}, this);
		},

		/**
		* Renders the scene
		* @param immediate {Boolean} triggers immediate rendering (without requestAnimationFrame)
		* @param callback {Function} optional callback when rendering is done
		*/
		render : function (immediate, callback) {
			var doRender = function () {
				this.__render();
				if (typeof callback === "function") {
					callback();
				}
			}.bind(this);

			if (immediate) {
				doRender();
				return;
			}

			if (this.__renderingTriggered) return;
			this.__renderingTriggered = true;
			requestAnimationFrame(doRender);
		},

		__renderingTriggered : null,

		__render : function () {
			this.__renderingTriggered = false;
			this.fireEvent("beforeRender");
			if (!this.__renderer) return;
			this.__renderer.render(this.__scene, this.__camera);
			this.fireEvent('render');
		},

		__resizeThreeCanvas : function () {
			var width = this.__threeCanvas.getCanvasWidth();
			var height = this.__threeCanvas.getCanvasHeight();
			this.__renderer.setViewport(0, 0, width, height);
			this.__camera.aspect = width / height;
			this.__camera.updateProjectionMatrix();
			this.__controls.setSize(width, height);
			this.__controls.update();
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

			this.__scene.traverse(function(child){
				var geometry = child.geometry;
				if (geometry) {
					if (!geometry.boundingBox) {
						geometry.computeBoundingBox();
					}
					bbox.union(geometry.boundingBox.clone().translate(child.position));
				} else {
					if (child.boundingBox) {
						bbox.union(child.boundingBox.clone().translate(child.position));
					}
				}
			});

			if (bbox.empty()) {
				return;
			}

			var bbdl = bbox.size().length();

			var camera = this.__camera;
			var controls = this.__controls;

			if (this.__boudingBoxDiagonalLength === 0) {
				var center = bbox.center();
				this.__boudingBoxDiagonalLength = bbdl;
				camera.position.copy(center);
				camera.position.z -= bbdl;
				camera.up.set(0,1,0);
				controls.target.copy(center);
			} else {
				var ratio = bbdl / this.__boudingBoxDiagonalLength;
				this.__boudingBoxDiagonalLength = bbdl;
				camera.position.sub(controls.target)
					.multiplyScalar(ratio)
					.add(controls.target);
			}

			camera.near = bbdl / 1000;
			camera.far = bbdl * 10;
			camera.updateProjectionMatrix();
			controls.update();
			this.render();
		},

		/**
		* Triggers a snapshot of the scene which will be downloaded by the browser
		* @param factor {Number} size multiplication factor e.g. when set to 2, the 
		* image dimensions will be twice the current scene dimensions. Default : 1
		*/
		snapshot : function (factor) {
			factor = factor || 1;

			if (factor !== 1) {
				var width = this.__threeCanvas.getCanvasWidth();
				var height = this.__threeCanvas.getCanvasHeight();
				this.__threeCanvas.setSyncDimension(false);
				var newHeight = Math.round(height * factor);
				var newWidth = Math.round(width * factor);
				this.__renderer.setSize(newWidth, newHeight);
				this.__camera.aspect = newWidth / newHeight;
				this.__camera.updateProjectionMatrix();
			}

			this.render(true);
			var strData = this.__renderer.domElement.toDataURL("image/png");
			var binary = atob(strData.split(',')[1]);
			var array = [];
			for(var i = 0; i < binary.length; i++) {
				array.push(binary.charCodeAt(i));
			}
			var blob =  new Blob([new Uint8Array(array)], {type: 'image/png'});
			var a = document.createElement('a');
			a.href = window.URL.createObjectURL(blob);
			var date = new Date();
			a.download = "snapshot-"+ date.getFullYear() + "-" +
				(date.getMonth() + 1) + "-"+ date.getDate() + "_" +
				date.getHours() + "h" + date.getMinutes() + "mn" +
				date.getSeconds() + "s" +  ".png";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			if (factor !== 1) {
				this.__renderer.setSize(width, height);
				this.__camera.aspect = width / height;
				this.__camera.updateProjectionMatrix();
				this.__threeCanvas.setSyncDimension(true);
				this.render();
			}
		},

		__threeCanvas : null,
		__scene : null,
		__camera : null,
		__controls : null,
		__renderer : null
	}
	
});

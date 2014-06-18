/**
* A widget containing a THREE.scene to visualize 3D meshes
* 
* @asset(desk/camera-photo.png)
* @ignore(THREE.Mesh)
* @ignore(THREE.Vector2)
* @ignore(THREE.Vector3)
* @ignore(THREE.Face3)
* @ignore(THREE.DoubleSide)
* @ignore(THREE.Projector)
* @ignore(THREE.Raycaster)
* @ignore(THREE.VTKLoader)
* @ignore(THREE.Geometry)
* @ignore(THREE.PlaneGeometry)
* @ignore(THREE.MeshPhongMaterial)
* @ignore(THREE.WireframeHelper)
* @ignore(THREE.Color)
* @ignore(THREE.CTMLoader)
* @ignore(requestAnimationFrame)
* @ignore(Detector)
* @ignore(Uint8Array)
* @lint ignoreDeprecated(alert)
* @ignore(desk.MeshTools)
* @ignore (THREE.ParticleSystem)
* @ignore (THREE.Line)
* @ignore (async.queue)
* @ignore (async.each)
* @ignore (async.whilst)
* @ignore (_.throttle)
* @ignore (_.without)
*/
qx.Class.define("desk.SceneContainer", 
{
    extend : desk.ThreeContainer,
	include : desk.LinkMixin,

	construct : function(file, parameters, callback, context)
	{
        this.base(arguments);
        this.__files = [];
		qx.Class.include(qx.ui.treevirtual.TreeVirtual, qx.ui.treevirtual.MNode);
        parameters = parameters || {};

		if (parameters.convertVTK !== undefined) {
			this.setConvertVTK(parameters.convertVTK);
		}

		var leftContainer = this.__leftContainer = new qx.ui.container.Composite();
		leftContainer.setLayout(new qx.ui.layout.VBox());
		this.add(leftContainer, {left : 0, top : 30});
		leftContainer.setVisibility("excluded");

		this.addListener("mousedown", this.__onMouseDown, this);
		this.addListener("mousemove", this.__onMouseMove, this);
		this.addListener("mouseup", this.__onMouseUp, this);
		this.addListener("mousewheel", this.__onMouseWheel, this);

		this.addListener('keydown', function (event) {
			if ((event.getTarget() == this.getCanvas()) &&
                (event.getKeyIdentifier() === 'G')) {

				var mesh = this.__pickMeshes(this.getMeshes());
				if (!mesh) return;
				var controls = this.getControls();
                var init = controls.target.clone();
                var fin = mesh.point.clone();
                var current = init.clone();
                var count = 0;
                var numberOfFrames = 30;
                async.whilst(
                    function () { return count < 30; },
                    function (callback) {
                        controls.target.addVectors(
                            fin.clone().multiplyScalar(count / 30),
                            init.clone().multiplyScalar(1 - (count / 30))
                            );
                        controls.update();
                        this.render();
                        setTimeout(callback, 10);
                        count++;
                        this.__propagateLinks();
                    }.bind(this),
                    function (err) {}
                );
			}
		}, this);


		var button = new qx.ui.form.Button("+").set({opacity : 0.5, width : 30});
		this.add (button, {left : 0, top : 0});
		button.addListener("execute", function () {
			if (leftContainer.getVisibility() === "visible") {
				leftContainer.setVisibility("excluded");
				button.setLabel("+");
			} else {
				leftContainer.setVisibility("visible");
				button.setLabel("-");
				var ren = this.__meshesTree.getDataRowRenderer();
				var color = this.getRenderer().getClearColor();
				var colors = ren._colors;
				colors.colNormal = "rgb(" + (255 * (1 - color.r)) + "," +
					(255 * (1 - color.g)) + "," + (255 * (1 - color.b)) + ")";
				colors.bgcolEven = colors.bgcolOdd = colors.horLine = "transparent";
				colors.bgcolFocused = "rgba(249, 249, 249, 0.5)";
				colors.bgcolFocusedSelected = "rgba(60, 100, 170, 0.5)";
				colors.bgcolSelected = "rgba(51, 94, 168, 0.5)";
			}
		}, this);

		var buttonsContainer = new qx.ui.container.Composite();
		buttonsContainer.setLayout(new qx.ui.layout.HBox());
		buttonsContainer.add(this.__getDragLabel(), {flex : 1});
		buttonsContainer.add(this.__getSaveViewButton(), {flex : 1});
		buttonsContainer.add(this.__getResetViewButton(), {flex : 1});
		buttonsContainer.add(this.__getSnapshotButton());
		leftContainer.add(buttonsContainer);

		this.__meshesTree = new qx.ui.treevirtual.TreeVirtual(["meshes"]);
		this.__meshesTree.setBackgroundColor("transparent");
		this.__meshesTree.setSelectionMode(qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);
		this.__meshesTree.set({
			width  : 180,
			rowHeight: 22,
			columnVisibilityButtonVisible : false,
            statusBarVisible : false		
		});

        leftContainer.add(this.__meshesTree,{flex : 1});
//		leftContainer.add(this.__getFilterContainer());

		this.__meshesTree.setContextMenu(this.__getContextMenu());

		this.__ctmLoader = new THREE.CTMLoader(this.getRenderer().context);
		this.__vtkLoader = new THREE.VTKLoader();

		this.__queue= async.queue(this.__urlLoad.bind(this), 10);

		this.__setData = _.throttle(function () {
			this.__meshesTree.getDataModel().setData();
		}.bind(this), 500);

		if (file) {
			this.addFile(file, parameters, callback, context);
			window.setCaption(file);
		}
		this.__addDropSupport();
		this.__volumeSlices = [];
	},

	destruct : function(){
		this.__setData = function () {};
		qx.util.DisposeUtil.destroyContainer(this.__leftContainer);
		this.removeAllMeshes();
		this.unlink();
		this.__meshesTree.dispose();
		this.__meshesTree.getDataModel().dispose();
		this.__ctmLoader = null;
	},

	properties : {
		/**
		 * if true, .vtk files will be converted to .ctm files before loading
		 */
		convertVTK : {init : true, check: "Boolean"},
		
		/**
		 * allows picking with mouse instead of rotation, pan, etc..
		 */
		 pickMode : {init : false, check: "Boolean"}
	},

	events : {
		"close" : "qx.event.type.Event",
		/**
		 * Fired whenever a mesh is removed. Attached data is the removed mesh
		 */
		"meshRemoved" : "qx.event.type.Data",
		/**
		 * Fired whenever picking is performed (in pick mode only)
		 */
		"pick" : "qx.event.type.Data"
		},

	members : {
		// array containing all loaded meshes
        __files : null,
		
		// a treeVirtual element storing all meshes
		__meshesTree : null,

		// a async.queue to load meshes
		__queue : null,

		// a THREE.VTKLoader
        __vtkLoader : null,

		// a THREE.CTMLLoader
        __ctmLoader : null,

		__setData : null,

		__leftContainer : null,

		getMeshes : function() {
			var meshes = [];
			var scene = this.getScene();
			if (scene) {
				scene.traverse(function(child){
					if (child.userData.__customProperties) {
						meshes.push(child);
					}
				});
			}
			return meshes;
		},

        __addLeaf : function (parameters) {
			parameters = parameters || {};
			var dataModel = this.__meshesTree.getDataModel();
			parameters.label = parameters.label || "mesh";
			var parent = parameters.parent;
			var leaf = dataModel.addLeaf(parent, parameters.label, null);
			this.__setData();
			return leaf;
		},

		__getMeshFromNode : function (node) {
			var leaf = this.__meshesTree.nodeGet(node);
			if (leaf) {
				if (leaf.__customProperties) {
					return leaf.__customProperties.mesh;
				}
			}
			return null;
		},

		addMesh : function (mesh, parameters) {
			parameters = parameters || {};
			this.getScene().add(mesh);
			var leaf = parameters.leaf;
			if (leaf === undefined) {
				parameters.leaf = leaf = this.__addLeaf(parameters);
			}
			parameters.mesh = mesh;
			this.__meshesTree.nodeGet(leaf).__customProperties = parameters;
			mesh.userData.__customProperties = parameters;
			if (parameters.updateCamera !== false) {
				this.viewAll();
			}
		},

		__getFilterContainer : function () {
			var dataModel = this.__meshesTree.getDataModel();
			var container = new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.HBox(10));
			var filterText = new qx.ui.basic.Label("search");
			container.add(filterText);

			var filterField = new qx.ui.form.TextField();
			filterField.set({value : "", backgroundColor : "transparent"});
			filterField.addListener("input", function() {
				this.__meshesTree.getDataModel().setData()
				this.render();
			}, this);
			container.add(filterField);

			var filter = qx.lang.Function.bind(function(node) {
				if (node.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					var label = node.label;
					var mesh = this.__getMeshFromNode(node);
					var visibility = false;
					if (label.toLowerCase().indexOf(filterField.getValue().toLowerCase()) != -1) {
						visibility = true;
					}
					if (mesh) {
						mesh.visible = visibility;
					}
					return visibility;
				}
				return true;
			}, this);

			var resetButton = new qx.ui.form.Button("Reset filter");
			resetButton.setAllowGrowY(false);
			resetButton.addListener("execute",function(e){
				filterField.setValue("");
			}, this);

			container.add(resetButton);
			dataModel.setFilter(filter);
			return container;
		},

		__readFile : function (file, parameters, callback) {
            parameters = parameters || {};
			var label = parameters.label || desk.FileSystem.getFileName(file);
			var leafParameters = {label : label};
			leafParameters.parent = parameters.parent;
            var leaf = this.__addLeaf(leafParameters);
            parameters.leaf = leaf;

			switch (desk.FileSystem.getFileExtension(file)) {
            case "vtk":
				if (!this.isConvertVTK()) {
					this.__loadFile(file, parameters, callback);
					break;
				}
			case "ply":
			case "obj":
			case "stl":
			case "off":
				desk.Actions.getInstance().launchAction({
                    "action" : "mesh2ctm",
					"input_mesh" : file,
					"output_directory" : 'cache/'},
                    function (response) {
                       var outputDir = response.outputDirectory;
                        parameters.mtime = response.MTime;
                        this.__loadFile(outputDir + '/mesh.ctm', parameters, callback);
				}, this);
				break;

			case "ctm":
				this.__loadFile(file, parameters, callback);
				break;
			default : 
				alert("error : file " + file + " cannot be displayed by mesh viewer");
			}
		},

		__loadFile : function (file, parameters, callback) {
			parameters.mtime = parameters.mtime || Math.random();
			parameters.url = desk.FileSystem.getFileURL(file);
			this.loadURL(parameters, callback);
		},


		update : function () {
            var files = this.__files;
            this.__files = [];
			this.removeAllMeshes();
            this.__meshesTree.getDataModel().clearData();
            for (var i = 0; i < files.length ; i++) {
                this.addFile(files[i]);
            }
		},

		__propagateLinks : function () {
			this.applyToOtherLinks(function (me) {
				var controls = this.getControls();
				controls.copy(me.getControls());
				controls.update();
				this.render();
			});
		},

		/**
		 * Removes all meshes in the scene
		 * @param dispose {Boolean} dispose meshes to avoid memory leaks (default : true)
		 */
		removeAllMeshes : function (dispose) {
			this.removeMeshes(this.getMeshes(), dispose);
		},

		__parseXMLData : function (file, rootDocument, parameters, callback) {
			var meshes = rootDocument.getElementsByTagName("mesh");
			var rootElement = rootDocument.childNodes[0];
			if (rootElement.hasAttribute("timestamp")) {
				parameters.mtime = parseFloat(rootElement.getAttribute("timestamp"));
			} else {
				parameters.mtime = Math.random();
			}

			var dataModel = this.__meshesTree.getDataModel();
			var leaf = dataModel.addBranch(null, desk.FileSystem.getFileName(file), null);
			this.__setData();

			var path = desk.FileSystem.getFileDirectory(file);
			async.each(meshes, function (mesh, callback) {
				var meshParameters = {parent : leaf};
				if (mesh.hasAttribute("color")) {
					var colorstring = mesh.getAttribute("color");
					var colors = colorstring.split(" ");
					var color = [];
					while (colors.length < 3) {
						colors.push('1');
					}
					if (colors.length < 4) {
						colors.push('1');
					}
					
					if ( colors.length < 5) {
						colors.push('0');
					}
					
					for (var j = 0; j < 4; j++) {
						color[j] = parseFloat(colors[j]);
					}
					color[4] = parseInt(colors[4], 10);
					meshParameters.color = color;
				}

				var xmlName;
				if (mesh.hasAttribute("Mesh")) {
					xmlName = mesh.getAttribute("Mesh");
				} else {
					xmlName = mesh.getAttribute("mesh");
				}
				this.__readFile(path + "/" + xmlName, meshParameters, callback);
			}.bind(this), callback);
		},

		/**
		 * Loads a file in the scene.
		 * @param file {String} input file
		 * @param parameters {Object} optionnal display options
		 * @param callback {Function} callback when done
		 * @param context {Object} optional context for the callback
		 */
		addFile : function (file, parameters, callback, context) {
            parameters = parameters || {};
            this.__files.push(file);
            parameters.file = file;

			switch (desk.FileSystem.getFileExtension(file)) {
				case "ply":
				case "obj":
				case "stl":
				case "vtk":
				case "ctm":
				case "off":
					this.__readFile (file, parameters, function (mesh) {
						if (typeof callback === 'function') {
							callback.apply(context, [mesh]);
						}
					});
					break;
				case "xml":
					desk.FileSystem.readFile(file, function (error, result){
						if (error) {
							alert("Error while reading " + file + "\n" + error);
							throw (error);
						}
						this.__parseXMLData(file, result, parameters, callback);
					}, this);
					break;
				case "json" : 
					desk.FileSystem.readFile(file, function (error, result){
						if (error) {
							alert("Error while reading " + file + "\n" + error);
							throw (error);
						}
						if (result.viewpoint) {
							var controls = this.getControls();
							controls.setState(result.viewpoint);
							setTimeout(function () {
								this.render();
								this.__propagateLinks();
							}.bind(this), 50);
						};
					}, this);
					break;
				default : 
					alert ("error : meshviewer cannot read " + file);
					break;
			}
		},

		/**
		 * Attaches a set of desk.VolumeSlice to the scene
		 * @param volumeSlices {Array} Array of deskVolumeSlice;
		 * @return {Array} array of THREE.Mesh
		 */
		attachVolumeSlices : function (volumeSlices) {
			var meshes = [];
			for (var i = 0; i < volumeSlices.length; i++) {
				meshes.push(this.attachVolumeSlice(volumeSlices[i]));
			}
			return meshes;
		},

		__volumeSlices : null,

		/**
		 * Attaches a set of desk.VolumeSlice to the scene
		 * @param volumeSlice {desk.VolumeSlice} volume slice to attach;
		 * @return {THREE.Mesh} the created mesh;
		 */
		attachVolumeSlice : function (volumeSlice) {
			var geometry = new THREE.PlaneGeometry( 1, 1);
			var material = volumeSlice.getMaterial();
			material.side = THREE.DoubleSide;
			var mesh = new THREE.Mesh(geometry,material);

			function updateTexture() {
				var coords = volumeSlice.getCornersCoordinates();
				for (var i = 0; i < 4; i++) {
					geometry.vertices[i].set(coords[3*i], coords[3*i+1], coords[3*i+2]);
				}
				geometry.computeFaceNormals();
				geometry.computeBoundingSphere();
				geometry.computeBoundingBox();
				geometry.verticesNeedUpdate = true;
				this.render(true);
			}

			var listenerId = volumeSlice.addListener('changeImage', updateTexture, this);
            this.addMesh(mesh, {label : 'View ' + (volumeSlice.getOrientation()+1),
                volumeSlice : volumeSlice, updateCamera : false
            });
			updateTexture.apply(this);

			mesh.addEventListener("removedFromScene", function () {
				volumeSlice.removeListenerById(listenerId);
				this.__volumeSlices = _.without(this.__volumeSlices, mesh);
			}.bind(this));
			this.__volumeSlices.push(mesh);
			return mesh;
		},

		__addDropSupport : function () {
			this.setDroppable(true);
			this.addListener("drop", function(e) {
				if (e.supportsType("fileBrowser")) {
					var files = e.getData("fileBrowser").getSelectedFiles();
					for (var i = 0; i < files.length; i++) {
						this.addFile(files[i]);
					}
				}
				if (e.supportsType("volumeSlices")) {
					this.attachVolumeSlices(e.getData("volumeSlices"));
				}
			}, this);
		},

		__draggingInProgress : false,

		__onMouseDown : function (event) {
			if (event.getTarget() != this.getCanvas()) return;
			this.capture();
			this.__draggingInProgress = true;
			if (this.isPickMode()) {
				var mesh = this.__pickMeshes(this.getMeshes());
				if (mesh) {
					this.fireDataEvent("pick", mesh);
					return;
				}
			}
			var origin = this.getContentLocation();
			var button = 0;
			if (event.isRightPressed() || 
				(event.isCtrlPressed() && !event.isShiftPressed())) {
				button = 1;
			}
			else if ( event.isMiddlePressed() ||
				(event.isShiftPressed() && !event.isCtrlPressed())) {
				button = 2;
			}
			else if (event.isCtrlPressed() && event.isShiftPressed()) {
				button = 3;
			}

			this.getControls().mouseDown(button,
				event.getDocumentLeft() - origin.left,
				event.getDocumentTop() - origin.top);
		},

        __x : null,

        __y : null,

		__onMouseMove : function (event) {
			this.__x = event.getDocumentLeft();
			this.__y = event.getDocumentTop();

			if (this.__draggingInProgress) {
				if (this.isPickMode()) {
					var mesh = this.__pickMeshes(this.getMeshes());
					if (mesh) {
						this.fireDataEvent("pick", mesh);
						return;
					}
				}
				var origin = this.getContentLocation();
				this.getControls().mouseMove(event.getDocumentLeft() - origin.left,
					event.getDocumentTop() - origin.top);
				this.render();
				this.__propagateLinks();
			}
		},

		__onMouseUp : function (event) {
			this.releaseCapture();
			this.__draggingInProgress = false;
			this.getControls().mouseUp();
		},

		__pickMeshes : function (meshes) {
			var origin = this.getContentLocation();
			var x = this.__x - origin.left;
			var y = this.__y - origin.top;

			var elementSize = this.getInnerSize();
			var x2 = ( x / elementSize.width ) * 2 - 1;
			var y2 = - ( y / elementSize.height ) * 2 + 1;

			var projector = new THREE.Projector();
			var vector = new THREE.Vector3( x2, y2, 0.5 );
			var camera = this.getCamera();
			projector.unprojectVector(vector, camera);

			var ray = new THREE.Raycaster(camera.position,
				vector.sub(camera.position).normalize());

			var intersection =  ray.intersectObjects(meshes);
			var closest = null;
			var distance = 1e10;
			intersection.forEach(function (inter) {
				if (inter.distance < distance) {
					distance = inter.distance;
					closest = inter;
				}
			});
			return closest;
		},

		__onMouseWheel : function (event) {
			if (event.getTarget() != this.getCanvas()) return;
			var intersects = this.__pickMeshes(this.__volumeSlices);
			if (intersects) {
				var volumeSlice = intersects.object.userData.__customProperties.volumeSlice;
				var maximum = volumeSlice.getNumberOfSlices() - 1;
				var delta = 1;
				if (event.getWheelDelta() < 0) delta = -1;
				var newValue = volumeSlice.getSlice() + delta;
				volumeSlice.setSlice(Math.max(Math.min(newValue, maximum), 0));
			}
		},

		loadURL : function (parameters, callback) {
			this.__queue.push(parameters, callback);
		},

        addGeometry : function (geometry, parameters) {
            parameters = parameters || {label : 'geometry'};
			geometry.computeBoundingBox();

			var color = parameters.color || [];
            for (var i = color.length; i < 3; i++) {
                color.push(1);
            }
            if (color.length < 4) {
                color.push(1);
            }
            if (color.length < 5) {
                color.push(0);
            }
			var threecolor = new THREE.Color().setRGB(color[0],color[1],color[2]);

			var material =  new THREE.MeshPhongMaterial({
                color : threecolor.getHex(),
                opacity : color[3]
            });
			var factor = 0.3;
			material.ambient = new THREE.Color().setRGB(
				factor*threecolor.r,factor*threecolor.g,factor*threecolor.b);
			material.shininess = 5;
			material.specular = new THREE.Color( 0x303030 );
			if (color[3] < 0.999) {
				material.transparent = true;
			}
            material.side = THREE.DoubleSide;
			var mesh = new THREE.Mesh(geometry, material );
			mesh.renderDepth = color[4];
            this.addMesh( mesh, parameters );
            return mesh;
        },

		__urlLoad : function (parameters, callback) {
			var loader;
			if (desk.FileSystem.getFileExtension(parameters.url) === "vtk") {
				loader = this.__vtkLoader;
			} else {
				loader = this.__ctmLoader;
			}

			loader.load (parameters.url + "?nocache=" + parameters.mtime, function (geometry) {
				var mesh = this.addGeometry(geometry, parameters);
				if (typeof callback === 'function') {
					callback(mesh);
				}
			}.bind(this), {useWorker : true});
		},

		__getSnapshotButton : function () {
			var factor = 1;
			var menu = new qx.ui.menu.Menu();
			[1, 2, 3, 4].forEach(function (f) {
				var button = new qx.ui.menu.Button("x" + f);
				button.addListener("execute", function (){
					factor = f;
				},this);
				menu.add(button);
			});

			var button = new qx.ui.form.Button(null, "desk/camera-photo.png");
			button.addListener("execute", function(e) {
				this.snapshot(factor);
			}, this);

			button.setContextMenu(menu);
			qx.util.DisposeUtil.disposeTriggeredBy(menu, this);
			return button;
		},

		__getResetViewButton : function () {
			var button = new qx.ui.form.Button("reset view");
			button.addListener("execute", this.resetView, this);
			return button;
		},

		__getSaveViewButton : function () {
			var button = new qx.ui.form.Button("save view");
			button.addListener("execute", function () {
				var file = prompt("Enter file name to save camera view point", "data/viewpoint.json")
				if (file != null) {
					button.setEnabled(false);
					desk.FileSystem.writeFile(file,
						JSON.stringify({viewpoint : this.getControls().getState()}), 
						function () {
							button.setEnabled(true);
					});
				}
			}, this);
			return button;
		},

		__getDragLabel : function () {
			var dragLabel = new qx.ui.basic.Label("Link").set({
                decorator: "button-box", width : 30, height : 30});
			// drag and drop support
			dragLabel.setDraggable(true);
			dragLabel.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("meshView");
				});

			dragLabel.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					if (type === "meshView") {
						e.addData(type, this);
					}
				}, this);

			// enable linking between viewers by drag and drop
			this.setDroppable(true);
			this.addListener("drop", function(e) {
				if (e.supportsType("meshView")) {
					var meshView=e.getData("meshView");
					this.link(meshView);
					meshView.__propagateLinks();
				}
			},this);

			var menu = new qx.ui.menu.Menu();

			var unlinkButton = new qx.ui.menu.Button("unlink");
			unlinkButton.addListener("execute", this.unlink, this);
			menu.add(unlinkButton);
			dragLabel.setContextMenu(menu);
			qx.util.DisposeUtil.disposeTriggeredBy(menu, this);
			return dragLabel;
		},

		__getPropertyWidget : function (parentWindow){
			var meshesTree=this.__meshesTree;
			
			var mainContainer = new qx.ui.container.Composite();
			mainContainer.setLayout(new qx.ui.layout.VBox());

			var topBox = new qx.ui.container.Composite();
			topBox.setLayout(new qx.ui.layout.HBox());
			var bottomBox = new qx.ui.container.Composite();
			bottomBox.setLayout(new qx.ui.layout.HBox());
			mainContainer.add(topBox);
			mainContainer.add(bottomBox);

			var colorSelector=new qx.ui.control.ColorSelector();
			bottomBox.add(colorSelector);//, {flex:1});

			var renderDepthLabel=new qx.ui.basic.Label("Render Depth");
			topBox.add(renderDepthLabel);

			var renderDepthSpinner=new qx.ui.form.Spinner(-100, 0,100);
			topBox.add(renderDepthSpinner);

			topBox.add(new qx.ui.core.Spacer(10, 20),{flex:1});
			if (parentWindow) {
				var alwaysOnTopCheckBox=new qx.ui.form.CheckBox("this window always on top");
				alwaysOnTopCheckBox.setValue(true);
				parentWindow.setAlwaysOnTop(true);
				alwaysOnTopCheckBox.addListener('changeValue',function (e){
					parentWindow.setAlwaysOnTop(alwaysOnTopCheckBox.getValue());
					});
				topBox.add(alwaysOnTopCheckBox);
			}
			var ratio=255;
			var opacitySlider=new qx.ui.form.Slider();
			opacitySlider.setMinimum(0);
			opacitySlider.setMaximum(ratio);
			opacitySlider.setWidth(30);
			opacitySlider.setOrientation("vertical");
			bottomBox.add(opacitySlider);

			var enableUpdate = true;
			var updateWidgets = function (event) {
				enableUpdate = false;
				var selectedNode = meshesTree.getSelectedNodes()[0];
				if (selectedNode.type === qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
					var firstSelectedMesh = this.__getMeshFromNode(selectedNode);
					var color=firstSelectedMesh.material.color;
					if (!color) return;
					colorSelector.setRed(Math.round(ratio*color.r));
					colorSelector.setGreen(Math.round(ratio*color.g));
					colorSelector.setBlue(Math.round(ratio*color.b));
					colorSelector.setPreviousColor(Math.round(ratio*color.r),
							Math.round(ratio*color.g),Math.round(ratio*color.b));
					opacitySlider.setValue(Math.round(firstSelectedMesh.material.opacity*ratio));
                    if (firstSelectedMesh.renderDepth) {
                        renderDepthSpinner.setValue(firstSelectedMesh.renderDepth);
                    }
					enableUpdate=true;
				}
			};
			
			updateWidgets.apply(this);

			meshesTree.addListener("changeSelection",updateWidgets, this);

			opacitySlider.addListener("changeValue", function(event){
				if (enableUpdate) {
					var opacity=opacitySlider.getValue()/ratio;
                    this.getSelectedMeshes().forEach(function (mesh){
						mesh.material.opacity=opacity;
						if (opacity<1) {
							mesh.material.transparent=true;
						} else {
							mesh.material.transparent=false;
						}
                    });
					this.render();
				}
			}, this);

			colorSelector.addListener("changeValue", function(event){
				if (enableUpdate) {
                    this.getSelectedMeshes().forEach(function (mesh){
						mesh.material.color.setRGB (colorSelector.getRed()/ratio,
									colorSelector.getGreen()/ratio,
									colorSelector.getBlue()/ratio);
					});
					this.render();
				}
			}, this);

			renderDepthSpinner.addListener("changeValue", function(event){
				if (enableUpdate) {
                    this.getSelectedMeshes().forEach(function (mesh){
                        mesh.renderDepth = renderDepthSpinner.getValue();
                    });
					this.render();
				}
			}, this);
			return (mainContainer);
		},

        getSelectedMeshes : function () {
            var meshes = [];
            this.__meshesTree.getSelectedNodes().forEach(function (node) {
                var mesh = this.__getMeshFromNode(node);
                if (mesh) {
					meshes.push(mesh);
                }
			}, this);
            return meshes;
        },

		/**
		 * Removes all meshes in the scene
		 * @param meshes {Array} Array of meshes to remove
		 * @param dispose {Boolean} dispose mesh to avoid memory leaks (default : true)
		 */
		removeMeshes : function (meshes, dispose) {
			for (var i = 0; i < meshes.length; i++) {
				this.__removeMesh(meshes[i], true, dispose);
			}
			this.__setData();
		},

		/**
		 * Removes all meshes in the scene
		 * @param mesh {THREE.Mesh} mesh to remove
		 * @param dispose {Boolean} dispose mesh to avoid memory leaks (default : true)
		 */
		removeMesh : function (mesh, dispose) {
			this.__removeMesh(mesh, false, dispose);
		},

		__removeMesh : function (mesh, doNotSetData, dispose) {
			var parameters = mesh.userData.__customProperties;
			var keepGeometry = false;
			var keepMaterial = false;

			this.getScene().remove(mesh);

			if (parameters) {
				var leaf = parameters.leaf;
				delete leaf.__customProperties;
				this.__meshesTree.getDataModel().prune(leaf, true);
				parameters.mesh = 0;

				delete mesh.userData.__customProperties;
				if (!doNotSetData) {
					this.__setData();
				}
				keepGeometry = parameters.keepGeometry;
				keepMaterial = parameters.keepMaterial;
			}

			if (!keepGeometry && dispose !== false) {
				mesh.geometry.dispose();
			}
			if (!keepMaterial && dispose !== false) {
				var map = mesh.material.map;
				if (map) {
					map.dispose();
				}
				mesh.material.dispose();
				var uniforms = Object.keys(mesh.material.uniforms);
				for (var i = 0; i != uniforms.length; i++) {
					var uniform = mesh.material.uniforms[uniforms[i]].value;
					if (uniform) {
						if (typeof uniform.dispose === "function") {
							uniform.dispose();
						}
					}
				}
			}
			//mesh.dispose();
			this.fireDataEvent("meshRemoved", mesh);
			if (dispose !== false) {
				this._deleteMembers(mesh);
			}
        },

		__animator : null,

		__getContextMenu : function() {
			//context menu to edit meshes appearance
			var menu = new qx.ui.menu.Menu();

			var propertiesButton = new qx.ui.menu.Button("properties");
			propertiesButton.addListener("execute", function (){
				var node = this.__meshesTree.getSelectedNodes()[0];
				var mesh = this.__getMeshFromNode(node);
				console.log(mesh);
				var geometry = mesh.geometry;
				var numVertices = 0, numTriangles = 0;
				if ( geometry instanceof THREE.Geometry ) {
					numVertices = geometry.vertices.length;
					numTriangles = geometry.faces.length;
				} else {
					numVertices = geometry.attributes.position.numItems / 3;
					if (geometry.attributes.index) {
						numTriangles = geometry.attributes.index.array.length / 3;
					}
				}
				alert ("Mesh with " + numVertices + " vertices and " +
						numTriangles + " triangles");
			}, this);
			menu.add(propertiesButton);

			var appearanceButton = new qx.ui.menu.Button("appearance");
			appearanceButton.addListener("execute", function (){
				var propertyWindow = new qx.ui.window.Window();
				propertyWindow.setLayout(new qx.ui.layout.HBox());
				propertyWindow.add(this.__getPropertyWidget(propertyWindow));
				propertyWindow.open();
				propertyWindow.addListener('close', function () {
					qx.util.DisposeUtil.destroyContainer(propertyWindow.getChildren()[0]);
					propertyWindow.destroy();
				});
			}, this);
			menu.add(appearanceButton);

			var showButton = new qx.ui.menu.Button("show/hide");
			showButton.addListener("execute", function (){
                this.getSelectedMeshes().forEach(function (mesh) {
					var visible = !mesh.visible;
					mesh.visible = visible;
					var edges = mesh.userData.edges;
					if (edges) edges.visible = visible;
                });
				this.render();
			},this);
			menu.add(showButton);

			var edgesButton = new qx.ui.menu.Button("show/hide edges");
			edgesButton.addListener("execute", function (){
				var self = this;

				function removeEdges() {
					var edges = this.userData.edges;
					self.getScene().remove(edges);
					edges.geometry.dispose();
					self._deleteMembers(edges);
					this.removeEventListener("removedFromScene", removeEdges);
					delete this.userData.edges;
				}

                this.getSelectedMeshes().forEach(function (mesh) {
					var edges = mesh.userData.edges;
					if (edges) {
						removeEdges.apply(mesh)
					} else {
						edges = new THREE.WireframeHelper(mesh);
						var material = edges.material;
						material.color.setRGB(0,0,0);
						mesh.userData.edges = edges;
						mesh.addEventListener("removedFromScene", removeEdges);
						self.getScene().add(edges);
					}
				});
				this.render();
			},this);
			menu.add(edgesButton);

			var removeButton = new qx.ui.menu.Button("remove");
			removeButton.addListener("execute", function (){
				this.removeMeshes(this.getSelectedMeshes());
				this.render();		
			},this);
			menu.add(removeButton);
			
			var analysisButton = new qx.ui.menu.Button("Mesh Tools");
			analysisButton.addListener("execute", function (){
				var meshes=this.__meshesTree.getSelectedNodes();
				for (var i=0;i<meshes.length;i++) {
					if (meshes[i].type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
						var meshId=meshes[i].nodeId;
						var mesh=this.getMeshes()[meshId];
						var meshTools = new desk.MeshTools( {meshViewer:this, specMesh:mesh} );
					}
				}
			},this);
			menu.add(analysisButton);
			
			var animateButton = new qx.ui.menu.Button('animate');
			animateButton.addListener('execute', function () {
				var nodes = this.__meshesTree.getSelectedNodes();
				if (!this.__animator) {
					this.__animator = new desk.Animator(this);
					this.__animator.addListener('close', function () {
						this.__animator = null;
					}, this);
				}

				for (var i = 0; i !=nodes.length; i++) {
                    var node = nodes[i];
					this.__animator.addObject(this.__getMeshFromNode(node), node.label);
				}
			},this);
			menu.add(animateButton);
			
			var optionalButtons = [propertiesButton, appearanceButton,
				analysisButton, animateButton];
			
			//// hide all menu buttons but the "show" and "hide" buttons for the volumeSlices
			menu.addListener("appear", function() {
				var nodes = this.__meshesTree.getSelectedNodes();
				if (!nodes) {
					return;
				}
				var selNode = nodes[0];
				if (!selNode) {
					return;
				}

				var visibility = "visible"
				var leaf = this.__meshesTree.nodeGet(selNode);
				if(leaf && leaf.__customProperties && leaf.__customProperties.volumeSlice) {
					visibility = "excluded";
				}

				optionalButtons.forEach(function (button) {
					button.setVisibility(visibility);
				});
			}, this);

			qx.util.DisposeUtil.disposeTriggeredBy(menu, this);
			return menu;
		}
	}
});

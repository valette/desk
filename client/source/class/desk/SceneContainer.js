/**
* A widget containing a THREE.scene to visualize 3D meshes
* 
* @asset(desk/camera-photo.png)
* @asset(qx/icon/${qx.icontheme}/16/categories/system.png) 
* @ignore(THREE.*)
* @ignore(requestAnimationFrame)
* @ignore(Detector)
* @ignore(Uint8Array)
* @lint ignoreDeprecated(alert)
* @ignore(desk.MeshTools)
* @ignore (async.*)
* @ignore (_.*)
*/
qx.Class.define("desk.SceneContainer", 
{
    extend : desk.ThreeContainer,
	include : desk.LinkMixin,

	construct : function(file, parameters, callback, context)
	{
        this.base(arguments);
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
			if ((event.getTarget() !== this.getCanvas()) ||
                (event.getKeyIdentifier() !== 'G')) {
					return;
			}

			var mesh = this.__pickMeshes(this.getMeshes());
			if (mesh === Infinity) return;
			console.log("picked mesh : ");
			console.log(mesh);
			var controls = this.getControls();
			var init = controls.target.clone();
			var fin = mesh.point.clone();
			var current = init.clone();
			var count = 0;
			var nFrames = 30;
			async.whilst(
				function () { return count < nFrames; },
				function (callback) {
					controls.target.addVectors(
						fin.clone().multiplyScalar(count / nFrames),
						init.clone().multiplyScalar(1 - (count / nFrames))
						);
					controls.update();
					this.render();
					setTimeout(callback, 10);
					count++;
					this.__propagateLinks();
				}.bind(this),
				function () {}
			);

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
				var ren = this.__meshes.getDataRowRenderer();
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

		var buttons = new qx.ui.container.Composite(new qx.ui.layout.HBox());
		buttons.add(this.__getDragLabel(), {flex : 1});
		buttons.add(this.__getSaveViewButton(), {flex : 1});
		buttons.add(this.__getResetViewButton(), {flex : 1});
		buttons.add(this.__getSnapshotButton());
		buttons.add(this.__getCameraPropertiesButton());
		leftContainer.add(buttons);

		this.__meshes = new qx.ui.treevirtual.TreeVirtual(["meshes"]);
		this.__meshes.setBackgroundColor("transparent");
		this.__meshes.setSelectionMode(qx.ui.treevirtual.TreeVirtual.SelectionMode.MULTIPLE_INTERVAL);
		this.__meshes.set({
			width  : 180,
			rowHeight: 22,
			columnVisibilityButtonVisible : false,
            statusBarVisible : false		
		});

        leftContainer.add(this.__meshes,{flex : 1});
//		leftContainer.add(this.__getFilterContainer());

		this.__meshes.setContextMenu(this.__getContextMenu());

		if (THREE.CTMLoader) {
			this.__ctmLoader = new THREE.CTMLoader(this.getRenderer().context);
		}
		this.__vtkLoader = new THREE.VTKLoader();

		this.__queue = async.queue(this.__urlLoad.bind(this), 10);

		this.__setData = _.throttle(this.__meshes.getDataModel().setData.
			bind(this.__meshes.getDataModel()), 500);

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
		this.__meshes.dispose();
		this.__meshes.getDataModel().dispose();
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
		// a treeVirtual element storing all meshes
		__meshes : null,

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
			if (!this.getScene()) return;

			this.getScene().traverse(function(child) {
				if (child.userData.viewerProperties) {
					meshes.push(child);
				}
			});
			return meshes;
		},

        __addLeaf : function (opt) {
			opt = opt || {};
			var dataModel = this.__meshes.getDataModel();
			opt.label = opt.label || "mesh";
			var parent = opt.parent;
			var leaf = dataModel.addLeaf(parent, opt.label, null);
			this.__setData();
			return leaf;
		},

		__getMeshFromNode : function (node) {
			var leaf = this.__meshes.nodeGet(node);
			return leaf && leaf.viewerProperties && leaf.viewerProperties.mesh;
		},

		addMesh : function (mesh, opt) {
			opt = opt || {};
			(opt.parentObject || this.getScene()).add(mesh);
			var leaf = opt.leaf = opt.leaf || this.__addLeaf(opt);
			opt.mesh = mesh;
			this.__meshes.nodeGet(leaf).viewerProperties = opt;
			mesh.userData.viewerProperties = opt;
			if (opt.updateCamera !== false) {
				this.viewAll();
			}
		},

		__getFilterContainer : function () {
			var dataModel = this.__meshes.getDataModel();
			var container = new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.HBox(10));
			var filterText = new qx.ui.basic.Label("search");
			container.add(filterText);

			var filterField = new qx.ui.form.TextField();
			filterField.set({value : "", backgroundColor : "transparent"});
			filterField.addListener("input", function() {
				this.__meshes.getDataModel().setData()
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

		__readFile : function (file, opt, callback) {
            opt = opt || {};
            opt.leaf = this.__addLeaf({parent : opt.parent,
				label : opt.label || desk.FileSystem.getFileName(file)});

			switch (desk.FileSystem.getFileExtension(file)) {
            case "vtk":
				if (!this.isConvertVTK() || opt.convert === false) {
					this.__loadFile(file, opt, callback);
					break;
				}
			case "ply":
			case "obj":
			case "stl":
			case "off":
				desk.Actions.getInstance().launchAction({
                    "action" : "mesh2ctm",
					"input_mesh" : file},
                    function (response) {
                       var outputDir = response.outputDirectory;
                        opt.mtime = response.MTime;
                        this.__loadFile(outputDir + '/mesh.ctm', opt, callback);
				}, this);
				break;

			case "ctm":
				this.__loadFile(file, opt, callback);
				break;
			default : 
				alert("error : file " + file + " cannot be displayed by mesh viewer");
			}
		},

		__loadFile : function (file, opt, callback) {
			opt.mtime = opt.mtime || Math.random();
			opt.url = desk.FileSystem.getFileURL(file);
			this.loadURL(opt, callback);
		},

		update : function () {
			var files = _.filter(this.getMeshes(), function (mesh) {
				return mesh.userData.viewerProperties.file != undefined;
			});
			this.removeAllMeshes();
			this.__meshes.getDataModel().clearData();
			files.forEach(function (file) {this.addFile(file);}, this);
		},

		__propagateLinks : function () {
			this.getLinks().forEach(function (link) {
				if (this === link) return;
				var controls = link.getControls();
				controls.copy(this.getControls());
				controls.update();
				link.render();
			}, this);
		},

		/**
		 * Removes all meshes in the scene
		 * @param dispose {Boolean} dispose meshes to avoid memory leaks (default : true)
		 */
		removeAllMeshes : function (dispose) {
			this.removeMeshes(this.getMeshes(), dispose);
		},

		__parseXMLData : function (file, xml, params, callback) {
			var root = xml.childNodes[0];
			params.mtime = root.hasAttribute("timestamp")?
				parseFloat(root.getAttribute("timestamp")) : Math.random();

			var dataModel = this.__meshes.getDataModel();
			var leaf = dataModel.addBranch(null, desk.FileSystem.getFileName(file), null);
			this.__setData();
			var object = new THREE.Object3D();
			params.leaf = leaf;
			params.file = file;
			this.addMesh(object, params);

			var path = desk.FileSystem.getFileDirectory(file);
			async.each(xml.getElementsByTagName("mesh"), function (mesh, callback) {
				var meshParameters = {parent : leaf, parentObject : object};
				if (mesh.hasAttribute("color")) {
					var color = mesh.getAttribute("color").split(" ").map(
						function (color) {
							return parseFloat(color);
						}
					);
					meshParameters.color = color;
					meshParameters.renderDepth = color[4];
				}

				if (mesh.hasAttribute("Mesh")) {
					var xmlName = mesh.getAttribute("Mesh");
				} else {
					xmlName = mesh.getAttribute("mesh");
				}
				this.__readFile(path + "/" + xmlName, meshParameters,
					function () {callback();});
			}.bind(this), function () {
				callback(object);
			});
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
			callback = callback || function () {};

            parameters.file = file;

			function after (mesh) {callback.call(context, mesh);}

			switch (desk.FileSystem.getFileExtension(file)) {
				case "ply":
				case "obj":
				case "stl":
				case "vtk":
				case "ctm":
				case "off":
					this.__readFile (file, parameters, after);
					break;
				case "xml":
					desk.FileSystem.readFile(file, function (error, result){
						if (error) {
							alert("Error while reading " + file + "\n" + error);
							throw (error);
						}
						this.__parseXMLData(file, result, parameters, after);
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
			return volumeSlices.map(function (slice) {
				return this.attachVolumeSlice(slice);
			}, this);
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
				geometry.vertices.forEach(function (vertex, i) {
					vertex.set(coords[3*i], coords[3*i+1], coords[3*i+2]);
				});
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
					e.getData("fileBrowser").getSelectedFiles().
						forEach(function (file) {this.addFile(file);}, this);
				} else if (e.supportsType("volumeSlices")) {
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
				if (mesh !== Infinity) {
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
					if (mesh !== Infinity) {
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
			return _.min(intersection, function (inter) {
				return inter.distance;
			});
		},

		__onMouseWheel : function (event) {
			if (event.getTarget() != this.getCanvas()) return;
			var intersects = this.__pickMeshes(this.__volumeSlices);
			var delta = event.getWheelDelta() > 0 ? 1 : -1;
			if (intersects != Infinity) {
				var slice = intersects.object.userData.viewerProperties.volumeSlice;
				var maximum = slice.getNumberOfSlices() - 1;
				var newValue = slice.getSlice() + delta;
				slice.setSlice(Math.max(Math.min(newValue, maximum), 0));
			} else {
				var controls = this.getControls();
				controls.mouseDown(1, 0, 0);
				controls.mouseMove(0, 0.05 * delta * this.getInnerSize().height);
				controls.mouseUp();
				this.render();
			}
		},

		loadURL : function (parameters, callback) {
			this.__queue.push(parameters, callback || function () {});
		},

        addGeometry : function (geometry, parameters) {
            parameters = parameters || {label : 'geometry'};
			geometry.computeBoundingBox();

			var color = parameters.color || [1, 1, 1, 1];
 
			if (typeof parameters.opacity !== "undefined") {
				color[3] = parameters.opacity;
			}

			var col = new THREE.Color(color[0], color[1], color[2]);

			var material =  new THREE.MeshPhongMaterial({
				color : col.getHex(), opacity : color[3]});
			material.ambient = new THREE.Color().copy(col).multiplyScalar(0.3);
			material.shininess = 5;
			material.specular = new THREE.Color( 0x303030 );
			if (color[3] < 0.999) {
				material.transparent = true;
			}
			material.side = THREE.DoubleSide;

			var mesh = new THREE.Mesh(geometry, material );
			if (geometry.attributes && geometry.attributes.color) {
				mesh.material.vertexColors = THREE.VertexColors;
			}
			mesh.renderDepth = parameters.renderDepth || 0
            this.addMesh( mesh, parameters );
            return mesh;
        },

		__ctmWorkers : [],

		__urlLoad : function (opt, callback) {
			if (desk.FileSystem.getFileExtension(opt.url) === "vtk") {
				this.__vtkLoader.load (opt.url + "?nocache=" + opt.mtime,
					function (geometry) {
						callback (this.addGeometry(geometry, opt));
				}.bind(this));
			} else {
				if (this.__ctmWorkers.length) {
					var worker = this.__ctmWorkers[0];
					this.__ctmWorkers.shift();
				} else {
					worker = this.__ctmLoader.createWorker();
				}

				this.__ctmLoader.load (opt.url + "?nocache=" + opt.mtime, function (geometry) {
					this.__ctmWorkers.push(worker);
					callback (this.addGeometry(geometry, opt));
				}.bind(this), {useWorker : true, worker : worker});
			}
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
				if (!file) {return;}
				button.setEnabled(false);
				desk.FileSystem.writeFile(file,
					JSON.stringify({viewpoint : this.getControls().getState()}), 
					function () {
						button.setEnabled(true);
				});
			}, this);
			return button;
		},

		__getCameraPropertiesButton : function () {
			var button = new qx.ui.form.MenuButton(null, "icon/16/categories/system.png");
			button.addListener("execute", function () {
				var win = new qx.ui.window.Window();
				win.setLayout(new qx.ui.layout.VBox());
				["near", "far"].forEach(function (field) {
					var container = new qx.ui.container.Composite(new qx.ui.layout.HBox());
					container.add(new qx.ui.basic.Label(field));
					var form = new qx.ui.form.TextField(this.getCamera()[field].toString());
					container.add(form);
					win.add(container);
					form.addListener("changeValue", function () {
						this.getCamera()[field] = parseFloat(form.getValue());
						this.getCamera().updateProjectionMatrix();
						this.render();
					}, this);
				}, this);
				win.open();
				win.center();
				win.addListener('close', function () {
					win.destroy();
				});
			}, this);
			return button;
		},

		__getDragLabel : function () {
			var label = new qx.ui.basic.Label("Link").set({
                decorator: "button-box", width : 30, height : 30});
			// drag and drop support
			label.setDraggable(true);
			label.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("meshView");
				});

			label.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					if (type === "meshView") {
						e.addData(type, this);
					}
				}, this);

			// enable linking between viewers by drag and drop
			this.setDroppable(true);
			this.addListener("drop", function(e) {
				if (!e.supportsType("meshView")) {return}
				var meshView = e.getData("meshView");
				this.link(meshView);
				meshView.__propagateLinks();
			},this);

			var menu = new qx.ui.menu.Menu();

			var unlinkButton = new qx.ui.menu.Button("unlink");
			unlinkButton.addListener("execute", this.unlink, this);
			menu.add(unlinkButton);
			label.setContextMenu(menu);
			qx.util.DisposeUtil.disposeTriggeredBy(menu, this);
			return label;
		},

		__getPropertyWidget : function (parentWindow){
			var meshesTree = this.__meshes;
			
			var mainContainer = new qx.ui.container.Composite();
			mainContainer.setLayout(new qx.ui.layout.VBox());

			var topBox = new qx.ui.container.Composite();
			topBox.setLayout(new qx.ui.layout.HBox());
			var bottomBox = new qx.ui.container.Composite();
			bottomBox.setLayout(new qx.ui.layout.HBox());
			mainContainer.add(topBox);
			mainContainer.add(bottomBox);

			var colorSelector = new qx.ui.control.ColorSelector();
			bottomBox.add(colorSelector);//, {flex:1});

			var renderDepthLabel = new qx.ui.basic.Label("Render Depth");
			topBox.add(renderDepthLabel);

			var renderDepthSpinner=new qx.ui.form.Spinner(-100, 0,100);
			topBox.add(renderDepthSpinner);

			topBox.add(new qx.ui.core.Spacer(10, 20),{flex:1});
			if (parentWindow) {
				var alwaysOnTopCheckBox = new qx.ui.form.CheckBox("this window always on top");
				alwaysOnTopCheckBox.setValue(true);
				parentWindow.setAlwaysOnTop(true);
				alwaysOnTopCheckBox.addListener('changeValue',function (e){
					parentWindow.setAlwaysOnTop(alwaysOnTopCheckBox.getValue());
					});
				topBox.add(alwaysOnTopCheckBox);
			}
			var ratio = 255;
			var opacitySlider = new qx.ui.form.Slider();
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

		/**
		 * Returns an array of selected meshes in the list
		 * @return {Array} array of THREE.Mesh
		 */
        getSelectedMeshes : function () {
            var meshes = [];
            this.__meshes.getSelectedNodes().forEach(function (node) {
                var mesh = this.__getMeshFromNode(node);
                if (mesh) meshes.push(mesh);
			}, this);
            return meshes;
        },

		/**
		 * Removes all meshes in the scene
		 * @param meshes {Array} Array of meshes to remove
		 * @param dispose {Boolean} dispose mesh to avoid memory leaks (default : true)
		 */
		removeMeshes : function (meshes, dispose) {
			meshes.forEach(function (mesh) {
				this.removeMesh(mesh, dispose);
			}, this);
		},

		/**
		 * Removes a mesh from the scene
		 * @param mesh {THREE.Mesh} mesh to remove
		 * @param dispose {Boolean} dispose mesh to avoid memory leaks (default : true)
		 */
		removeMesh : function (mesh, dispose) {
			var parameters = mesh.userData.viewerProperties;
			var keepGeometry = false;
			var keepMaterial = false;

			mesh.parent.remove(mesh);

			if (parameters) {
				var leaf = this.__meshes.nodeGet(parameters.leaf)
				if (leaf) {
					delete leaf.viewerProperties;
					this.__meshes.getDataModel().prune(leaf.nodeId, true);
				}
				parameters.mesh = 0;
				delete mesh.userData.viewerProperties;
				this.__setData();
				keepGeometry = parameters.keepGeometry;
				keepMaterial = parameters.keepMaterial;
			}

			this.fireDataEvent("meshRemoved", mesh);
			if (dispose === false) return;

			if (!keepGeometry && mesh.geometry) mesh.geometry.dispose();

			if (!keepMaterial && mesh.material) {
				if (mesh.material.map) {
					mesh.material.map.dispose();
				}
				mesh.material.dispose();
				Object.keys(mesh.material.uniforms || {}).forEach(function (key) {
					var uniform = mesh.material.uniforms[key].value;
					var disposeFunction = uniform && uniform.dispose;
					if (typeof  disposeFunction === "function") {
						uniform.dispose();
					}
				});
			}
			this._deleteMembers(mesh);
        },

		__animator : null,

		__getContextMenu : function() {
			//context menu to edit meshes appearance
			var menu = new qx.ui.menu.Menu();

			var properties = new qx.ui.menu.Button("properties");
			properties.addListener("execute", function (){
				var node = this.__meshes.getSelectedNodes()[0];
				var mesh = this.__getMeshFromNode(node);
				console.log(mesh);
				var geometry = mesh.geometry;
				if (!geometry) return;
				
				var nV = 0, nT = 0;
				if ( geometry instanceof THREE.Geometry ) {
					nV = geometry.vertices.length;
					nT = geometry.faces.length;
				} else {
					nV = geometry.attributes.position.numItems / 3;
					if (geometry.attributes.index) {
						nT = geometry.attributes.index.array.length / 3;
					}
				}
				alert ("Mesh with " + nV + " vertices and " + nT + " triangles");
			}, this);
			menu.add(properties);

			var appearance = new qx.ui.menu.Button("appearance");
			appearance.addListener("execute", function (){
				var win = new qx.ui.window.Window();
				win.setLayout(new qx.ui.layout.HBox());
				win.add(this.__getPropertyWidget(win));
				win.open();
				win.addListener('close', function () {
					qx.util.DisposeUtil.destroyContainer(win.getChildren()[0]);
					win.destroy();
				});
			}, this);
			menu.add(appearance);

			var showButton = new qx.ui.menu.Button("show/hide");
			showButton.addListener("execute", function (){
                this.getSelectedMeshes().forEach(function (mesh) {
					mesh.visible = !mesh.visible;
                });
				this.render();
			},this);
			menu.add(showButton);

			var edgesButton = new qx.ui.menu.Button("show/hide edges");
			edgesButton.addListener("execute", function (){

				function removeEdges() {
					this.remove(this.userData.edges);
					if (this.userData.edges) {
						this.userData.edges.geometry.dispose();
					}
					this.removeEventListener("removedFromScene", removeEdges);
					delete this.userData.edges;
				}

                this.getSelectedMeshes().forEach(function (mesh) {
					var edges = mesh.userData.edges;
					if (edges) {
						removeEdges.apply(mesh)
					} else {
						edges = new THREE.WireframeHelper(mesh);
						edges.material.color.setRGB(0,0,0);
						mesh.userData.edges = edges;
						mesh.material.polygonOffset = true;
						mesh.material.polygonOffsetFactor = 1;
						mesh.material.polygonOffsetUnits = 1;
						mesh.addEventListener("removedFromScene", removeEdges);
						mesh.add(edges);
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
			
			var analysis = new qx.ui.menu.Button("Mesh Tools");
			analysis.addListener("execute", function (){
				this.__meshes.getSelectedNodes().forEach(function (mesh) {
					if (mesh.type == qx.ui.treevirtual.MTreePrimitive.Type.LEAF) {
						new desk.MeshTools({meshViewer : this,
							specMesh : (this.getMeshes())[mesh.nodeId]});
					}
				}, this);
			}, this);
			menu.add(analysis);
			
			var animate = new qx.ui.menu.Button('animate');
			animate.addListener('execute', function () {
				var nodes = this.__meshes.getSelectedNodes();
				if (!this.__animator) {
					this.__animator = new desk.Animator(this);
					this.__animator.addListener('close', function () {
						this.__animator = null;
					}, this);
				}

				nodes.forEach(function (node) {
					this.__animator.addObject(this.__getMeshFromNode(node), node.label);
				}, this);
			},this);
			menu.add(animate);
			
			//// hide all menu buttons but the "show" and "hide" buttons for the volumeSlices
			menu.addListener("appear", function() {
				var nodes = this.__meshes.getSelectedNodes() || [];
				var selNode = nodes[0];
				if (!selNode) {
					return;
				}

				var visibility = "visible"
				var leaf = this.__meshes.nodeGet(selNode);
				if(leaf && leaf.viewerProperties && leaf.viewerProperties.volumeSlice) {
					visibility = "excluded";
				}

				[properties, appearance, analysis, animate].forEach(function (button) {
					button.setVisibility(visibility);
				});
			}, this);

			qx.util.DisposeUtil.disposeTriggeredBy(menu, this);
			return menu;
		}
	}
});

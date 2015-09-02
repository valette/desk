/**
* @ignore(Uint8Array)
* @lint ignoreDeprecated(alert)
* @asset(desk/Contrast_Logo_petit.PNG)
* @ignore (async.eachSeries)
* @ignore (_.indexOf)
*/
qx.Class.define("desk.MPRContainer", 
{
    extend : qx.ui.container.Composite,

	/**
	* constructor
	* @param file {String} : file to visualize
	* @param options {Object} : options, see desk.MPRContainer.addVolume() for more doc
	* @see desk.MPRContainer#addVolume for options description
	* @param callback {Function} : callback when done.
	* @param context {Object} : optional callback context
	*/
	construct : function(file, options, callback, context) {
        this.base(arguments);
        this.setLayout(new qx.ui.layout.VBox());

		options = options || {};
		this.__gridCoords = options.inGridCoord || {
			viewers : [{column : 0, row : 0},
						{column : 1, row : 0},
						{column : 0, row : 1}],
			volList : {column : 1, row : 1}
		};

		this.__nbUsedOrientations = options.nbOrientations || 3;
		if (this.__nbUsedOrientations === 1) {
			this.__gridCoords.volList = {column : 1, row : 0};
		}

		var gridLayout = new qx.ui.layout.Grid(2,2);
		for (var i = 0 ; i < 2 ; i++) {
			gridLayout.setRowFlex(i, 1);
			gridLayout.setColumnFlex(i, 1);
		}

		var gridContainer = new qx.ui.container.Composite();
		gridContainer.setLayout(gridLayout);
		this.__gridContainer = gridContainer;

		var fullscreenContainer = new qx.ui.container.Composite();
		fullscreenContainer.setLayout(new qx.ui.layout.HBox());
		this.__fullscreenContainer = fullscreenContainer;
		fullscreenContainer.setVisibility("excluded");

        if (options.standAlone == false) {
            this.__standalone = false;
        }

        this.add(gridContainer, {flex : 1});
		this.add(fullscreenContainer, {flex : 1});

		this.__maximizeButtons = [];
		this.__createVolumesList();
		this.__addViewers(options);

		this.setDroppable(true);
		this.addListener("drop", this.__onDrop);

		this.initViewsLayout();
		if (file) {
			this.addVolume(file, options, callback, context);
		}
	},

	destruct : function() {
		this.removeAllVolumes();
		if (this.__orientationWindow) {
			this.__orientationWindow.dispose();
			qx.util.DisposeUtil.destroyContainer(this.__orientationContainer);
		}

		this.__viewers.forEach(function (viewer) {
			viewer.dispose();
		});

		this.__volumes.dispose();
		this.__gridCoords = null;
	},

	events : {
		/**
		* Fired whenever fullscreen is activated/deactivated
		*/
		"switchFullScreen" : "qx.event.type.Data",

		/**
		* Fired whenever a volume os removed from the viewer
		*/
		"removeVolume" : "qx.event.type.Data"
	},

	properties : {
		/**
		* Defines the views layout "123", "321", etc... default : "123"
		*/
		viewsLayout : { init : "123", check: "String", event : "changeViewsLayout", apply : "__applyViewsLayout"}
	},

	members :
	{
		__standalone : true,
		__fullscreenContainer : null,
		__gridContainer : null,
		__volumes : null,
		__viewers : null,
		__gridCoords :null,
		__viewsNames : ["Axial", "Sagittal", "Coronal"],
		__nbUsedOrientations : null,

		/**
		* visualizes the output of an action whenever it is updated
		* @param action {desk.Action} : action to watch
		* @param file {String} : output file to visualize (without path)
		* @param options {Object} : options object containing settings
		* such as imageFormat (0 or 1), label (text), visible (bool)
		* @param callback {Function} : callback when updated.
		* @param context {Object} : optional callback context
		*/
		watchAction : function (action, file, options, callback, context) {
			var volume;
			var currentActionId = -1;
			action.addListener('actionTriggered', function (e) {
				var actionId = e.getData().id;
				if (currentActionId < actionId) {
					currentActionId = actionId;
				}
			}, this);

			action.addListener('actionUpdated', function (e) {
				var actionId = e.getData().id;
				if (currentActionId !== actionId) {
					// ignore this update as the action has been triggered since
					return;
				}
				if (volume) {
					this.removeVolume(volume);
				}
				volume = this.addVolume(action.getOutputDirectory() + file, options, callback, context);
			}, this);

			this.addListener('removeVolume', function (e) {
				if (e.getData() === volume) {
					volume = null;
				}
			});
		},

		/** Returns the file corresponding to the given volume
		 * @param volume {qx.ui.container.Composite}  volume
		 * @return {String} file corresponding to the volume
		 */
		getVolumeFile : function (volume) {
			return volume.getUserData('file');
		},

		/** Returns the grid containing viewers
		 * @return {qx.ui.container.Composite} grid container
		 */
		getVolListGridContainer : function() {
			var gridCoor = this.__gridCoords.volList;
			this.__gridContainer.setUserData("freeRow", gridCoor.row);
			this.__gridContainer.setUserData("freeColumn", gridCoor.column);
			return this.__gridContainer;
		},

		/**
		 * Returns the container of volume items
		 * @return {qx.ui.container.Composite} Volumes container
		 */
		getVolumesList : function () {
			return this.__volumes;
		},

		/**
		 * Returns the array containing all desk.SliceView
		 * @return {Array} all views in the Container
		 */
		getViewers : function () {
			return this.__viewers;
		},

		/**
		 * Triggers rendering on all viewers
		 */
		 render : function () {
			this.__viewers.forEach(function (viewer) {
				viewer.render();
			});
		},

		/**
		 * Reorders volumes rendering
		 */
		__reorderMeshes : function () {
			this.__volumes.getChildren().forEach(function (volume, rank) {
				this.getVolumeSlices(volume).forEach(function (slice) {
                    // slice might not be loaded yet
					if (!slice) { return }
					var mesh = slice.getUserData("mesh");
					if (mesh) {
						mesh.renderOrder = rank;
					}
				});
			}, this);
			this.render();
		},

        __scroll : null,

		/**
		 * Creates the volumes list
		 */
		__createVolumesList : function () {
			this.__scroll  = new qx.ui.container.Scroll();
			var container = new qx.ui.container.Composite(new qx.ui.layout.VBox(5));
			container.add(this.__getToolBar());
			this.__volumes = new qx.ui.container.Composite();
			this.__volumes.setLayout(new qx.ui.layout.VBox(1));
			this.addListener('resize', function () {
				this.__scroll.setWidth(Math.round(this.getWidth() / 2));
				this.__scroll.setHeight(Math.round(this.getHeight() / 2));
			}, this);
			container.add(this.__volumes);
			this.__scroll.add(container);
		},

		/**
		 * Creates the viewers
		 * @param options {Object} viewer options
		 */
		__addViewers : function (options) {
			this.__viewers = [];
			for(var i = 0; i < this.__nbUsedOrientations; i++) {
				var sliceView = new desk.SliceView(i, options);
				this.__viewers.push(sliceView);
				sliceView.addListener("changeCrossPosition", this.__onChangeCrossPosition, this);
				sliceView.addListener("changeCameraZ", this.__onChangeCameraZ, this);
				this.__setupMaximize(sliceView);
				var button = new qx.ui.form.Button("+").set({opacity: 0.5});
				button.setUserData("sliceView", sliceView);
				sliceView.setUserData("maximizeButton", button);
				button.addListener("execute", this.__onMaximizeButtonClick, this);
				sliceView.getRightContainer().add(button);
				this.__maximizeButtons.push(button);
				qx.util.DisposeUtil.disposeTriggeredBy(button, sliceView);
			}
		},

		/**
		 * setups viewer maximize buttons on a viewer
		 * @param sliceView {desk.SliceView} viewer to setup
		 */
		__setupMaximize : function (sliceView) {
			sliceView.addListener('keypress', function (e) {
				if (e.getKeyIdentifier() === 'P') {
					this.__toggleMaximize(sliceView.getUserData("maximizeButton"));
				}
			},this);
		},

		/**
		 * toggles maximize on/off
		 * @param button {qx.ui.form.Button} button
		 */
		__toggleMaximize : function (button) {
			if (button.getLabel() === "+") {
				this.maximizeViewer(button.getUserData("sliceView").getOrientation());
			} else {
				this.resetMaximize();
			}			
		},

		/**
		 * Fired whenever a maximize button is pressed
		 * @param e {qx.event.type.Event} button event
		 */
		__onMaximizeButtonClick : function (e) {
			this.__toggleMaximize(e.getTarget());
		},

		/**
		 * Fired whenever the cross is displaced
		 * @param e {qx.event.type.Event} event
		 */
		__onChangeCrossPosition : function (e) {
			this.__viewers.forEach(function (viewer) {
				viewer.setCrossPosition(e.getTarget().getCrossPosition());
			});
		},

		/**
		 * Fired whenever the camera Z changes
		 * @param e {qx.event.type.Event} event
		 */
		__onChangeCameraZ : function (e) {
			var z = e.getData();
			this.__viewers.forEach (function (viewer) {
				if (viewer === e.getTarget()) return;
				if (viewer.getCameraZ() * z < 0) {
					viewer.setCameraZ(-z);
				} else {
					viewer.setCameraZ(z);
				}
			});
		},

		/**
		 * changes the views layout
		 * @param layout {String} the layout ("123", "231", ...)
		 */
		__applyViewsLayout : function (layout) {
			this.__gridContainer.removeAll();
			if (this.__orientationContainer) {
				this.__orientationContainer.removeAll();
			}

			var layout = this.getViewsLayout();

			this.__viewers.forEach(function (viewer) {
				var position = layout.indexOf('' + (viewer.getOrientation() + 1));
				var coords = this.__gridCoords.viewers[position];
				if (this.__orientationContainer) {
					this.__orientationContainer.add(viewer.getReorientationContainer(), coords);
				}
				this.__gridContainer.add (viewer, coords);
			}.bind(this));

            if (this.__standalone) {
				this.__gridContainer.add(this.__scroll, this.__gridCoords.volList);
            }
		},

		__orientationContainer : null,
		__orientationWindow : null,
		__orientationButtonGroup : null,
		__layoutSelectBoxes : null,

		/**
		 * Fired whenever a selection changes in the orientation window
		 * @param event {qx.event.type.Event} event
		 */
		__onChangeSelect : function(event) {
			var label = event.getData()[0].getLabel();
			var box = event.getTarget();
			var boxes = this.__layoutSelectBoxes;

			var viewer = this.__viewers[_.indexOf(boxes, box)];

			for(var i = 0; i < this.__nbUsedOrientations; i++) {
				if((boxes[i].getSelection()[0].getLabel() === label)
					&& (boxes[i] !== box)) {
						break;
				}
			};

			if (i > 2) return;

			//// Switch direction overlays labels
			var labels2give = viewer.getOverLays().map(function (overlay) {
				return overlay.getValue();
			});

			var dirOverLays2get = this.__viewers[i].getOverLays();
			for( var j = 0; j < 4; j++ ) {
				viewer.getOverLays()[j].setValue(dirOverLays2get[j].getValue());
			}
			for( j = 0; j < 4; j++) {
				this.__viewers[i].getOverLays()[j].setValue(labels2give[j]);
			}

			//// Update "prevousSelect" field
			var doubledBox = boxes[i];
			var tempSelectables = doubledBox.getSelectables();
			var tempLabelPreviousSel = box.getUserData("previousSelect");
			box.setUserData("previousSelect", label);
			for( j = 0; j < this.__nbUsedOrientations; j++ ) {
				if(tempSelectables[j].getLabel() == tempLabelPreviousSel) {
					doubledBox.setUserData("previousSelect",tempLabelPreviousSel);
					doubledBox.setSelection([tempSelectables[j]]);
					break;
				}
			}
		},

		/**
		 * Returns the window where the user can change different
		 * orientation parameters
		 * @return {qx.ui.window.Window} the window
		 */
		getOrientationWindow : function () {
			if (this.__orientationWindow) {
				return this.__orientationWindow;
			}
			var win = this.__orientationWindow = new qx.ui.window.Window()
				.set({caption : "Layout and Orientation", layout : new qx.ui.layout.VBox()});

			win.add (new qx.ui.basic.Label("Windows layout :"));
			var planesContainer = new qx.ui.container.Composite(new qx.ui.layout.HBox(5));
			
			this.__layoutSelectBoxes = [];
			// Create selectBoxes
			for (var i = 0; i < this.__nbUsedOrientations; i++) {
				planesContainer.add ( new qx.ui.basic.Label( (i+1) + " : ") );
				var selectBox = new qx.ui.form.SelectBox();
				this.__layoutSelectBoxes.push(selectBox);

				this.__viewsNames.forEach(function (name, index) {
					var item = new qx.ui.form.ListItem(name);
					selectBox.add(item);
					if(i === index) {
						selectBox.setSelection([item]);
						selectBox.setUserData("previousSelect", name);
					}
				});

				selectBox.addListener( "changeSelection", this.__onChangeSelect, this);
				planesContainer.add( selectBox, { flex:1 } );
			}

			win.add(planesContainer);
			win.add(new qx.ui.core.Spacer(5,10), {flex: 3});
			win.add(this.__getChangeLayoutContainer(), {flex: 10});
			win.add(new qx.ui.core.Spacer(5,15), {flex: 5});
			win.add (new qx.ui.basic.Label("Orientations :"));
			
			var orientsButtonGroupHBox = new qx.ui.form.RadioButtonGroup();
			orientsButtonGroupHBox.setLayout(new qx.ui.layout.HBox(10));
			var slicesOrButton = new qx.ui.form.RadioButton("Volume Slices");
			slicesOrButton.setUserData('flipCamera', true);
			var anamOrButton = new qx.ui.form.RadioButton("Anatomical Directions");
			anamOrButton.setUserData('flipCamera', false);
			function changeFlipStrategy (e) {
				var flipCamera = e.getTarget().getUserData('flipCamera');
				this.__viewers.forEach(function (viewer) {
					viewer.getLinks().forEach(function (link) {
						link.setOrientationChangesOperateOnCamera(flipCamera);
					});
				});
			}

			slicesOrButton.addListener('execute' , changeFlipStrategy, this);
			anamOrButton.addListener('execute' , changeFlipStrategy, this);
			orientsButtonGroupHBox.add(slicesOrButton);
			orientsButtonGroupHBox.add(anamOrButton);
			this.__orientationButtonGroup = orientsButtonGroupHBox;
			var orientsContainer = new qx.ui.container.Composite();
			orientsContainer.setLayout(new qx.ui.layout.HBox());
			orientsContainer.add(this.__orientationButtonGroup);
			win.add(orientsContainer);
			
			var gridContainer = new qx.ui.container.Composite();
			var gridLayout = new qx.ui.layout.Grid();
			for (i = 0; i < 2; i++) {
				gridLayout.setRowFlex(i, 1);
				gridLayout.setColumnFlex(i, 1);
			}
			win.add(gridContainer);

			gridContainer.setLayout(gridLayout);
			this.__orientationContainer = gridContainer;
			this.__applyViewsLayout(this.getViewsLayout());
			return win;
		},

		__maximizeButtons : null,

		/**
		 * maximizes a viewer so that it fills the entire container
		 * @param orientation {Number} : viewer orientation to maximize
		 */
		 maximizeViewer : function (orientation) {
			this.__maximizeButtons[orientation].setLabel("-");
			var sliceView = this.__viewers[orientation];
			this.__gridContainer.setVisibility("excluded");
			this.__fullscreenContainer.add(sliceView, {flex : 1});
			this.__fullscreenContainer.setVisibility("visible");
			this.fireDataEvent("switchFullScreen", true);		
		},

		/**
		 * resets all viewers to the same size
		 */
		 resetMaximize : function () {
			this.__fullscreenContainer.setVisibility("excluded");
			for (var i = 0; i != this.__nbUsedOrientations; i++) {
				this.__maximizeButtons[i].setLabel("+");
			}
			this.__gridContainer.setVisibility("visible");
			this.__applyViewsLayout(this.getViewsLayout());
			this.fireDataEvent("switchFullScreen", false);			
		},

		/**
		 * returns an array containing volumes slices for a loaded volume
		 * @param volume {qx.ui.container.Composite} : volume
		 * @return {Array} array of desk.VolumeSlice
		 */
		getVolumeSlices : function (volume) {
			return volume.getUserData("slices");
		},

		/**
		 * returns an array containing meshes for a loaded volume
		 * @param volume {qx.ui.container.Composite} : volume
		 * @return {Array} array of THREE.Mesh
		 */
		getVolumeMeshes : function (volume) {
			return this.getVolumeSlices(volume).map(function (slice) {
				return slice.getUserData("mesh");
			});
		},

        /**
		* adds a file into the viewer
		* @param file {String} : file to load
        * @param options {Object} : options object containing settings:
        * <pre class='javascript'>
        * { <br>
        * 	format : 1,// (0 : png, 1 : jpg) <br>
        *   label : "label in list", <br>
        *   visible : true <br>
        * }
		* </pre>
        * @param callback {Function} : callback when loaded. First 
        *  callback argument is the error, the second is the volume widget
        * @param context {Object} : optional callback context
        * @return {qx.ui.container.Composite}  volume item
		*/
		addVolume : function (file, options, callback, context) {
			if (typeof options === "function") {
				callback = options;
				options = {};
				context = callback;
			}
			callback = callback || function () {};

			if (desk.FileSystem.getFileExtension(file) === "json") {
				desk.FileSystem.readFile(file, function (err, viewpoints) {
					this.setViewPoints(viewpoints.viewpoints);
				}, this);
				return null;
			}

			var volumeSlices = [];

			var opacity = 1;
			var imageFormat = 1;

            options = options || {};
            if ( options.opacity != null ) {
				opacity = options.opacity;
			}
			if ( options.imageFormat != null ) {
				imageFormat = options.imageFormat;
			}

			var volume = new qx.ui.container.Composite();
			volume.setLayout( new qx.ui.layout.VBox() );
			volume.setDecorator("main");
			volume.set({toolTipText : file});
			volume.setUserData("slices", volumeSlices);
			volume.setUserData("file", file);

			// drag and drop support
			volume.setDraggable(true);
			volume.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("volumeSlices");
				e.addType("VolumeViewer");
				e.addType("file");
			});

			volume.addListener("droprequest", function(e) {
				var type = e.getCurrentType();
				switch (type) {
					case "volumeSlices":
						e.addData(type, volumeSlices);
						break;
					case "VolumeViewer":
						e.addData(type, this);
						break;
					case "file":
						e.addData(type, file);
						break;
					default :
						alert ("type "+type+"not supported for drag and drop");
						break;
				}
			}, this);

			var baseName = desk.FileSystem.getFileName(file);
			var baseLength = baseName.length;
			if (baseLength > 25) {
				baseName = baseName.substring(0, 10) + '...' +
					baseName.substring(baseLength - 10);
			}

			var labelcontainer = new qx.ui.container.Composite();
			labelcontainer.setLayout(new qx.ui.layout.HBox());
			labelcontainer.setContextMenu(this.__getVolumeContextMenu(volume));
			volume.add(labelcontainer);

            var label = new qx.ui.basic.Label(baseName);
            if (options.label) {
                label.setValue(options.label);
            }
            label.setTextAlign("left");
			labelcontainer.add(label, {flex : 1});

			async.eachSeries(this.__viewers,
				function (viewer, callback) {
					volumeSlices[viewer.getOrientation()] = viewer.addVolume(
							file, options, callback);
				},
				function (err) {
					if (options.visible !== undefined) {
						hideShowCheckbox.setValue(options.visible);
					}
//					scalarBounds = volumeSlice.getScalarBounds();
//					updateWindowLevel();
					volume.setUserData("loadingInProgress", false);
					if (volume.getUserData("toDelete")) {
						this.removeVolume(volume);
					}
					this.__reorderMeshes();
					callback.call(context, err, volume);
				}.bind(this)
			);

			var settingsContainer = new qx.ui.container.Composite();
			settingsContainer.setLayout(new qx.ui.layout.HBox());
			volume.add(settingsContainer);

			// create hide/show widget
			var hideShowCheckbox = new qx.ui.form.CheckBox();
			hideShowCheckbox.set({value : true,toolTipText : "visible/hidden"});
			hideShowCheckbox.addListener( "changeValue", function (e) {
				volumeSlices.forEach(function (volumeSlice) {
					volumeSlice.getUserData("mesh").visible = e.getData();
				});
				this.render();
			}, this );

			// create file format change widget
			var fileFormatBox;
			fileFormatBox = new qx.ui.form.SelectBox();
			fileFormatBox.setWidth(60);
			fileFormatBox.set({width : 60, toolTipText : "change image format"});
			var SelectJPG = new qx.ui.form.ListItem("jpg");
			SelectJPG.setUserData("imageFormat", 1);
			fileFormatBox.add(SelectJPG);
			var SelectPNG = new qx.ui.form.ListItem("png");
			SelectPNG.setUserData("imageFormat", 0);
			fileFormatBox.add(SelectPNG);

			if (imageFormat != 1) {
				fileFormatBox.setSelection([SelectPNG]);
			}

			fileFormatBox.addListener("changeSelection", function ( ) {
				imageFormat = fileFormatBox.getSelection()[0].getUserData("imageFormat");
				volumeSlices.forEach(function (slice) {
					slice.setImageFormat(imageFormat);
				});
			});

			// create opacity widget
            var opacitySlider = new qx.ui.form.Slider();
			opacitySlider.set({value : opacity * 100, toolTipText : "change opacity"});
			opacitySlider.addListener("changeValue", function(event) {
				this.setVolumeOpacity(volume, event.getData() / 100);
			},this);
			
			////Create brightness/contrast fixing
			var brightnessButton = new qx.ui.form.Button(null, "desk/Contrast_Logo_petit.PNG");
			brightnessButton.set({toolTipText : "Click and drag to change brightnes, right-click to reset brightness"});

			var x, y;

			brightnessButton.addListener("pointerdown", function(event)	{
				if (event.isRightPressed()) {
					volumeSlices.forEach(function (slice) {
						slice.setBrightnessAndContrast(0, 1);
					});
//						updateWindowLevel();
				} else {
					x = event.getScreenLeft();
					y = event.getScreenTop();
				}
			}, this);

			brightnessButton.addListener("pointermove", function(event) {
				if (!brightnessButton.isCapturing()) {
					return;
				}
				var newX = event.getScreenLeft();
				var newY = event.getScreenTop();
				var deltaX = newX - x;
				var deltaY = newY - y;
				var contrast = volumeSlices[0].getContrast();
				var brightness = volumeSlices[0].getBrightness();

				brightness -= deltaY / 300;
				contrast *= 1 + deltaX / 300;
				x = newX;
				y = newY;
				volumeSlices.forEach(function (slice) {
					slice.setBrightnessAndContrast(brightness,contrast);
				});
//					updateWindowLevel();
			}, this);

/*			var scalarBounds;
			var windowLevelContainer = new qx.ui.container.Composite();
			windowLevelContainer.setLayout(new qx.ui.layout.VBox());
			var font= new qx.bom.Font(12, ["Arial"]);
			var windowLabel = new qx.ui.basic.Label();
			windowLabel.setFont(font);
			var levelLabel = new qx.ui.basic.Label();
			levelLabel.setFont(font);
			windowLevelContainer.add(windowLabel);
			windowLevelContainer.add(levelLabel);

			
			function updateWindowLevel() {
				var brightness = volumeSlices[0].getBrightness();
				var contrast = volumeSlices[0].getContrast();
				var scalarWidth = scalarBounds[1] - scalarBounds[0];
				// insert correct formula here...
				var window = Math.abs((scalarWidth / contrast) + scalarBounds[0]);
				var level = ((1 / (contrast * 2) - brightness) * scalarWidth) + scalarBounds[0];
				windowLabel.setValue('W : ' + window.toFixed(0));
				levelLabel.setValue('L : ' + level.toFixed(0));
			}*/

			settingsContainer.add(brightnessButton);
//			settingsContainer.add(windowLevelContainer);
			if (fileFormatBox) {
				settingsContainer.add(fileFormatBox);
			}
			settingsContainer.add(opacitySlider, {flex : 1});
			settingsContainer.add(hideShowCheckbox);
			// add this user data to avoid race conditions
			volume.setUserData("loadingInProgress", true);
			this.__volumes.add(volume);
			return volume;
		},


		/**
		 * creates a context menu
		 * @param volumeListItem {qx.ui.container.Composite} : volume
		 * @return {qx.ui.menu.Menu} the menu
		 */
		 __getVolumeContextMenu : function (volumeListItem) {
			//context menu to edit meshes appearance
			var menu = new qx.ui.menu.Menu();
			var propertiesButton = new qx.ui.menu.Button("properties");
			propertiesButton.addListener("execute", function (){
				function formatArray(array) {
					var result="[";
					for (var i=0;i<array.length;i++) {
						result+=array[i];
						if (i<array.length-1){
							result+=", ";
						}
					}
					result+="]";
					return result;
				}

				var slice = volumeListItem.getUserData("slices")[0];
				var window = new qx.ui.window.Window().set({
					caption : slice.getFileName(),
					layout : new qx.ui.layout.VBox(),
					showMinimize : false});
				window.setResizable(false,false,false,false);
				window.add(new qx.ui.basic.Label("volume : "+slice.getFileName()));
				window.add(new qx.ui.basic.Label("dimensions : "+formatArray(slice.getDimensions())));
				window.add(new qx.ui.basic.Label("extent : "+formatArray(slice.getExtent())));
				window.add(new qx.ui.basic.Label("origin : "+formatArray(slice.getOrigin())));
				window.add(new qx.ui.basic.Label("spacing : "+formatArray(slice.getSpacing())));
				window.add(new qx.ui.basic.Label("scalarType : "+slice.getScalarType()+" ("+slice.getScalarTypeAsString()+")"));
				window.add(new qx.ui.basic.Label("scalar bounds : "+formatArray(slice.getScalarBounds())));
				window.open();
				window.center();
			},this);
			menu.add(propertiesButton);

			var colormapButton = new qx.ui.menu.Button("color map");
			colormapButton.addListener("execute", function () {
				this.__createColormapWindow(volumeListItem);
				},this);
			menu.add(colormapButton);


			if(this.__standalone) {
				if (desk.Actions.getInstance().getSettings().permissions) {
					var segmentButton = new qx.ui.menu.Button("segment(GC)");
					segmentButton.addListener("execute", function () {
						new desk.SegTools(this, this.getVolumeFile(volumeListItem));
					},this);
					menu.add(segmentButton);

					var segmentButtonGC = new qx.ui.menu.Button("segment");
					segmentButtonGC.addListener("execute", function () {
						new desk.SegTools(this, this.getVolumeFile(volumeListItem), {segmentationMethod : 1});
					},this);
					menu.add(segmentButtonGC);

					var segmentButtonCVT = new qx.ui.menu.Button("segment (fast)");
					segmentButtonCVT.addListener("execute", function () {
						new desk.SegTools(this, this.getVolumeFile(volumeListItem), {segmentationMethod : 3});
					},this);
					menu.add(segmentButtonCVT);

					var editButton = new qx.ui.menu.Button("edit");
					editButton.addListener("execute", function () {
						new desk.SegTools(this, this.getVolumeFile(volumeListItem), {segmentationMethod : 2});
					},this);
					menu.add(editButton);
				}
			}

			var moveForwardButton = new qx.ui.menu.Button("move forward");
			moveForwardButton.addListener("execute", function () {
				var volumes=this.__volumes.getChildren();
				for (var index=0;index<volumes.length; index++) {
					if (volumes[index]==volumeListItem) {
						break;
					}
				}

				if (index<volumes.length-1) {
					this.__volumes.remove(volumeListItem);
					this.__volumes.addAt(volumeListItem, index+1);
				}
				this.__reorderMeshes();
				this.render();
				},this);
			menu.add(moveForwardButton);

			var moveBackwardButton = new qx.ui.menu.Button("move backward");
			moveBackwardButton.addListener("execute", function (){
				var volumes = this.__volumes.getChildren();
				for ( var index = 0; index < volumes.length; index++ ) {
					if ( volumes[index] == volumeListItem ) {
						break;
					}
				}

				if ( index > 0 ) {
					this.__volumes.remove(volumeListItem);
					this.__volumes.addAt(volumeListItem, index-1);
				}
				this.__reorderMeshes();
				this.render();
				},this);
			menu.add(moveBackwardButton);

			var removeButton = new qx.ui.menu.Button("remove");
			removeButton.addListener("execute", function (){
				this.removeVolume(volumeListItem);
				},this);
			menu.add(removeButton);
			qx.util.DisposeUtil.disposeTriggeredBy(menu, volumeListItem);
			return menu;
		},

		/**
		 * Returns an object containing all viewpoints informations : 
		 * slices, camera positions.
		 * @return{Array} viewpoints for each viewer
		 */
		getViewPoints : function () {
			var viewPoints = [];
			this.__viewers.forEach(function (viewer, index) {
				var volume = viewer.getFirstSlice();
				var ZIindex = volume.getZIndex();
				var position = volume.getOrigin()[ZIindex] + 
					viewer.getSlice() * volume.getSpacing()[ZIindex];
				viewPoints[index] = {
					position : position,
					cameraState : viewer.getControls().getState()
				};
			});
			return viewPoints;
		},

		/**
		 * Sets all viewpoints: slices, camera positions.
		 * @param viewPoints {Array} viewpoints for each viewer
		 */
		setViewPoints : function (viewPoints) {
			this.__viewers.forEach(function (viewer, index) {
				var volume = viewer.getFirstSlice();
				var ZIindex = volume.getZIndex();
				var viewPoint = viewPoints[index];
				viewer.setSlice(Math.round((viewPoint.position - volume.getOrigin()[ZIindex]) / 
					volume.getSpacing()[ZIindex]));
				viewer.getControls().setState(viewPoint.cameraState);
				viewer.render();
			});
		},

		/**
		 * Reloads all volumes
		 */
		updateAll : function () {
			this.__volumes.getChildren().forEach(this.updateVolume, this);
		},

		/**
		 * Reloads a specific volume
		 * @param volume {qx.ui.container.Composite} the volume to reload
		 */
		updateVolume : function (volume) {
			volume.getUserData("slices").forEach(function (slice) {
				slice.update();
			});
		},

		/**
		 * Clears all volumes in the view
		 */
        removeAllVolumes : function () {
            var volumes = this.__volumes.getChildren();
            while (volumes.length) {
                this.removeVolume(volumes[0]);
            }
        },

		/**
		 * Removes a specific volume from the view
		 * @param volume {qx.ui.container.Composite} volume to remove
		 */
		removeVolume : function (volume) {
			if (qx.ui.core.Widget.contains(this.__volumes, volume)) {
				this.__volumes.remove(volume);
				this.fireDataEvent("removeVolume", volume);
			}

			this.__viewers.forEach (function (viewer) {
				viewer.removeVolumes(this.getVolumeSlices(volume));
			}, this);

			// test if volume is not totally loaded
			if (volume.getUserData("loadingInProgress")) {
				volume.setUserData("toDelete", true);
			} else {
				qx.util.DisposeUtil.destroyContainer(volume);
			}
		},

		/**
		 * creates the top toolbar
		 * @return {qx.ui.container.Composite} the toolbar
		 */
		 __getToolBar : function () {
			var container = new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.HBox());
			container.add(this.__getLinkButton());
			container.add(this.__getSaveViewButton());
			container.add(new qx.ui.core.Spacer(10), {flex: 1});
			container.add(this.__getOrientationButton());
			return (container);
		},

		/**
		 * creates the orientation button
		 * @return {qx.ui.form.Button} the button
		 */
		__getOrientationButton : function () {
			var button = new qx.ui.form.Button("Layout/Orientation");
			button.addListener ("execute", function () {
				this.getOrientationWindow().center()
				this.getOrientationWindow().open();
			}, this);
			return (button);
		},

		/**
		 * creates the change layout container
		 * @return {qx.ui.container.Composite} the container
		 */
		 __getChangeLayoutContainer : function () {
			var gridContainer = new qx.ui.container.Composite();
			var gridLayout = new qx.ui.layout.Grid();
			for (var i = 0; i < this.__nbUsedOrientations; i++) {
				gridLayout.setRowFlex(i, 30);
				gridLayout.setColumnFlex(i, 1);
			}
			gridContainer.setLayout(gridLayout);
			
			var viewGridCoor = this.__gridCoords;
			for(i = 0; i < this.__nbUsedOrientations; i++) {
				var labelsContainer = new qx.ui.container.Composite();
				labelsContainer.set({draggable : true,
									decorator : "main",
									toolTipText : "click and drag to switch views"});
				var lblsContLayout = new qx.ui.layout.HBox(5);
				lblsContLayout.setAlignX("center");
				lblsContLayout.setAlignY("middle");
				labelsContainer.setLayout(lblsContLayout);
				labelsContainer.addListener("dragstart", function(event) {
					event.addAction("alias");
					event.addType("thisLabelContainer");
				});

                labelsContainer.addListener("droprequest", function(event) {
					var type = event.getCurrentType();
					switch (type) {
					case "thisLabelContainer":
						event.addData(type, this);
						break;
					default :
						alert ("type "+type+"not supported for thisLabelContainer drag and drop");
						break;
					}
				}, labelsContainer);
				labelsContainer.setDroppable(true);
				labelsContainer.addListener("drop", function(event) {
					if (event.supportsType("thisLabelContainer")) {
						var droppedLabel = event.getData("thisLabelContainer").getChildren()[0];
						var droppedViewerID = droppedLabel.getValue();
						var selfLabel = event.getTarget().getChildren()[0];
						var selfViewerID = selfLabel.getValue();
						droppedLabel.setValue(selfViewerID);
						selfLabel.setValue(droppedViewerID);
						var tempGridContChildren = gridContainer.getChildren();
						var layout = "";
						for( var i = 0; i < this.__nbUsedOrientations; i++ ) {
							layout += tempGridContChildren[i].getChildren()[0].getValue();
						}
						this.setViewsLayout( layout );
					}
				}, this);
				var viewLabel = new qx.ui.basic.Label( ""+(i+1));
				var font = qx.bom.Font.fromString("20px sans-serif bold")
				viewLabel.setFont(font);
				qx.util.DisposeUtil.disposeTriggeredBy(font, this);
				labelsContainer.add(viewLabel);
				gridContainer.add(labelsContainer, viewGridCoor.viewers[i]);
			}
			return (gridContainer);
		},

		/**
		 * Links the view parameters (zoom, position, etc..) to an other viewer
		 * @param volumeViewer{desk.MPRContainer} viewer to link to
		 */
		link : function (volumeViewer) {
			volumeViewer.__viewers.forEach(function (viewer) {
				this.__viewers.forEach(function (viewer2) {
					if (viewer.getOrientation() === viewer2.getOrientation()) {
						viewer.link(viewer2);
						viewer.propagateCameraToLinks();
					}
				});
			}, this);
		},

		/**
		 * sets a specific Lookup Table of a loaded volume
		 * @param volume {qx.ui.container.Composite} the volume
		 * @param LUT {Array} an array of 4 lookuup tables [red, green blue, alpha]
		 */
		setVolumeLUT : function (volume, LUT) {
			this.getVolumeSlices(volume).forEach(function (slice) {
				slice.setLookupTables(LUT);
			});
		},

		/**
		 * returns the Lookup Table of a volume
		 * @param volume {qx.ui.container.Composite} the volume
		 * @return {Array} an array of 4 lookuup tables [red, green blue, alpha]
		 */
		getVolumeLUT : function (volume) {
			return this.getVolumeSlices(volume)[0].getLookupTables();
		},

		/**
		 * sets opacity of a volume
		 * @param volume {qx.ui.container.Composite} the volume
		 * @param opacity {Number} opacity
		 */
		setVolumeOpacity : function (volume, opacity) {
			this.getVolumeSlices(volume).forEach(function (slice) {
				slice.setOpacity(opacity);
			});
		},

		/**
		 * returns the volume opacity
		 * @param volume {qx.ui.container.Composite} the volume
		 * @return {Number} opacity of the volume
		 */
		getVolumeOpacity : function (volume) {
			return this.getVolumeSlices(volume)[0].getOpacity();
		},


		/**
		 * creates the save camera viewpoint button
		 * @return {qx.ui.form.Button} the button
		 */
		__getSaveViewButton : function () {
			var button = new qx.ui.form.Button("save view");
			button.addListener("execute", function () {
				var file = prompt("Enter file name to save camera view point", "data/viewpoints.json")
				if (file != null) {
					button.setEnabled(false);
					desk.FileSystem.writeFile(file,
						JSON.stringify({viewpoints : this.getViewPoints()}), 
						function () {
							button.setEnabled(true);
					});
				}
			}, this);
			return button;
		},

		/**
		 * creates the 'link' button
		 * @return {qx.ui.form.Button} the button
		 */
		__getLinkButton : function () {
			var menu = new qx.ui.menu.Menu();
			var unLinkButton = new qx.ui.menu.Button("unlink");
			unLinkButton.addListener("execute", function() {
				this.__viewers.forEach (function (viewer) {
					viewer.unlink();
				});
			},this);
			menu.add(unLinkButton);

			var label = new qx.ui.basic.Label("Link").set({draggable : true,
				decorator : "main", toolTipText : "click and drag to an other window to link"});
			label.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("volView");
				});

			label.setContextMenu(menu);

			label.addListener("droprequest", function(e) {
				var type = e.getCurrentType();
				if (type === 'volView') {
					e.addData(type, this);
				}
			}, this);

            // enable linking between viewers by drag and drop
			this.setDroppable(true);
			this.addListener('drop', function(e) {
				if (e.supportsType('volView')) {
					this.link(e.getData('volView'));
				}
			}, this);
			qx.util.DisposeUtil.disposeTriggeredBy(menu, this);
			return (label);
		},

		/**
		 * creates the 'colors' window
		 * @param volume {qx.ui.container.Composite} the volume to modify
		 */
		__createColormapWindow : function(volume) {
			var win = new qx.ui.window.Window().set ({
				caption : "colors for " + this.getVolumeFile(volume),
				layout : new qx.ui.layout.HBox(),
				showClose : true,
				showMinimize : false
			});

			var ramp = new Uint8Array(256);
			var zeros = new Uint8Array(256);
			var randomRed = new Uint8Array(256);
			var randomGreen = new Uint8Array(256);
			var randomBlue = new Uint8Array(256);

			for (var i = 0; i < 256; i++) {
				ramp[i] = i;
				zeros[i] = 0;
				randomRed[i] = Math.floor(Math.random()*255);
				randomGreen[i] = Math.floor(Math.random()*255);
				randomBlue[i] = Math.floor(Math.random()*255);
			}

			var group = new qx.ui.form.RadioButtonGroup().set({layout : new qx.ui.layout.VBox()});
			win.add(group);

			[{name : "reds", lut : [ramp, zeros, zeros]},
				{name : "greens", lut : [zeros, ramp, zeros]},
				{name : "blues", lut : [zeros, zeros, ramp]},
				{name : "random reds", lut : [randomRed, zeros, zeros]},
				{name : "random greens", lut : [zeros, randomGreen, zeros]},
				{name : "random blues", lut : [zeros, zeros, randomBlue]},
				{name : "random colors", lut : [randomRed, randomGreen, randomBlue]},
				{name : "grey levels", lut : null},
				{name : "other colors", lut : this.getVolumeLUT(volume)}
			].forEach(function (colors, index) {
				if (!colors.lut && (index > 7)) return;
				var button = new qx.ui.form.RadioButton(colors.name);
				button.setUserData('lut', colors.lut);
				group.add(button);
				group.setSelection([button]);
			});

			group.addListener("changeSelection", function (e) {
				this.setVolumeLUT(volume, e.getData()[0].getUserData('lut'));
			}, this);
			win.open();
			win.center();
		},

		/**
		 * Fired whenever a widget is droped on the viewer
		 * @param e {qx.event.type.Drag} drap/drop event
		 */
		__onDrop : function (e) {
			if (e.supportsType("fileBrowser")) {
				e.getData("fileBrowser").getSelectedFiles().forEach(function(file) {
					this.addVolume(file);
				}, this);
			} else if (e.supportsType("file")) {
				if (e.supportsType("VolumeViewer")) {
					if (this === e.getData("VolumeViewer")) {
						return;
					}
				}
				this.addVolume(e.getData("file"));
			}
		}
	}
});

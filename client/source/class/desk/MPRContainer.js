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

	construct : function(file, options, callback, context)
	{
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
		"switchFullScreen" : "qx.event.type.Data",
		"removeVolume" : "qx.event.type.Data"
	},

	properties : {
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
				var actionId = e.getData();
				if (currentActionId < actionId) {
					currentActionId = actionId;
				}
			}, this);

			action.addListener('actionUpdated', function (e) {
				var actionId = e.getData();
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

		__renderAll : function () {
			this.__viewers.forEach(function (viewer) {
				viewer.render();
			});
		},

		__reorderMeshes : function () {
			this.__volumes.getChildren().forEach(function (volume, rank) {
				this.getVolumeSlices(volume).forEach(function (slice) {
                    // slice might not be loaded yet
					if (!slice) { return }
					var mesh = slice.getUserData("mesh");
					if (mesh) {
						mesh.renderDepth = - rank;
					}
				});
			}, this);
			this.__renderAll();
		},

        __scroll : null,

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

		__addViewers : function (options) {
			this.__viewers = [];
			for(var i = 0; i < this.__nbUsedOrientations; i++) {
				var sliceView = new desk.SliceView(i, options);
				this.__viewers.push(sliceView);
				sliceView.setOrientPlane(this.__viewsNames[i]);
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

		__setupMaximize : function (sliceView) {
			sliceView.addListener('keypress', function (e) {
				if (e.getKeyIdentifier() === 'P') {
					this.__toggleMaximize(sliceView.getUserData("maximizeButton"));
				}
			},this);
		},

		__toggleMaximize : function (button) {
			if (button.getLabel() === "+") {
				this.maximizeViewer(button.getUserData("sliceView").getOrientation());
			} else {
				this.resetMaximize();
			}			
		},

		__onMaximizeButtonClick : function (e) {
			this.__toggleMaximize(e.getTarget());
		},

		__onChangeCrossPosition : function (e) {
			this.__viewers.forEach(function (viewer) {
				viewer.setCrossPosition(e.getTarget().getCrossPosition());
			});
		},

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

		__onChangeSelect : function(event) {
			var label = event.getData()[0].getLabel();
			var box = event.getTarget();
			var boxes = this.__layoutSelectBoxes;

			var viewer = this.__viewers[_.indexOf(boxes, box)];
			viewer.setOrientPlane(label);

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
		 * @return {Array} array of volume slices
		 */
		getVolumeSlices : function (volume) {
			return volume.getUserData("slices");
		},

        /**
		* adds a file into the viewer
		* @param file {String} : file to load
        * @param options {Object} : options object containing settings
        * such as imageFormat (0 or 1), label (text), visible (bool)
        * @param callback {Function} : callback when loaded.
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
				}.bind(this));
				return;
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

			var volumeListItem = new qx.ui.container.Composite();
			volumeListItem.setLayout( new qx.ui.layout.VBox() );
			volumeListItem.setDecorator("main");
			volumeListItem.set({toolTipText : file});
			volumeListItem.setUserData("slices", volumeSlices);
			volumeListItem.setUserData("file", file);

			// drag and drop support
			volumeListItem.setDraggable(true);
			volumeListItem.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("volumeSlices");
				e.addType("VolumeViewer");
				e.addType("file");
				});

			volumeListItem.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					switch (type)
					{
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
			labelcontainer.setContextMenu(this.__getVolumeContextMenu(volumeListItem));
			volumeListItem.add(labelcontainer);

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
					volumeListItem.setUserData("loadingInProgress", false);
					if (volumeListItem.getUserData("toDelete")) {
						this.removeVolume(volumeListItem);
					}
					this.__reorderMeshes();
					callback.call(context, err);
				}.bind(this)
			);

			var settingsContainer = new qx.ui.container.Composite();
			settingsContainer.setLayout(new qx.ui.layout.HBox());
			volumeListItem.add(settingsContainer);

			// create hide/show widget
			var hideShowCheckbox = new qx.ui.form.CheckBox();
			hideShowCheckbox.set({value : true,toolTipText : "visible/hidden"});
			hideShowCheckbox.addListener( "changeValue", function (e) {
				for ( var i = 0; i < volumeSlices.length; i++ ) {
					volumeSlices[i].getUserData("mesh").visible = e.getData();
				}
				this.__renderAll();
			}, this );

			// create file format change widget
			var fileFormatBox = new qx.ui.form.SelectBox();
			fileFormatBox.setWidth(60);
			fileFormatBox.set({width : 60,
					toolTipText : "change image format"});
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
				imageFormat=fileFormatBox.getSelection()[0].getUserData("imageFormat");
				for (var i=0;i<volumeSlices.length;i++) {
					volumeSlices[i].setImageFormat(imageFormat);
				}
			});

			// create opacity widget
            var opacitySlider = new qx.ui.form.Slider();
			opacitySlider.set({value : opacity*100,
					toolTipText : "change opacity"});
			opacitySlider.addListener("changeValue", function(event) {
				var opacity = event.getData() / 100;
				for (var i = 0; i < volumeSlices.length; i++) {
					volumeSlices[i].setOpacity(opacity);
				}
			},this);
			
			////Create brightness/contrast fixing
			var brightnessButton = new qx.ui.form.Button(null, "desk/Contrast_Logo_petit.PNG");
			brightnessButton.set({toolTipText : "Click and drag to change brightnes, right-click to reset brightness"});

			var clicked = false;
			var x, y;

			brightnessButton.addListener("mousedown", function(event)	{
				if (event.isRightPressed()) {
					for (var i = 0; i < volumeSlices.length; i++) {
						volumeSlices[i].setBrightnessAndContrast(0, 1);
//						updateWindowLevel();
					}
				} else {
					x = event.getScreenLeft();
					y = event.getScreenTop();
					brightnessButton.capture();
					clicked = true;
				}
			}, this);

			brightnessButton.addListener("mousemove", function(event) {
				if (clicked) {
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
					for (var i = 0; i < volumeSlices.length; i++) {
						volumeSlices[i].setBrightnessAndContrast(brightness,contrast);
					}
//					updateWindowLevel();
				}
			}, this);

			brightnessButton.addListener("mouseup", function(event) {
				brightnessButton.releaseCapture();
				clicked = false;
			}, this);

			var scalarBounds;

/*			var windowLevelContainer = new qx.ui.container.Composite();
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
			settingsContainer.add(fileFormatBox);
			settingsContainer.add(opacitySlider, {flex : 1});
			settingsContainer.add(hideShowCheckbox);
			// add this user data to avoid race conditions
			volumeListItem.setUserData("loadingInProgress", true);
			this.__volumes.add(volumeListItem);
			return volumeListItem;
		},

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
				if (desk.Actions.getInstance().getPermissionsLevel()>0) {
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
				this.__renderAll();
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
				this.__renderAll();
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

		__getToolBar : function () {
			var container = new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.HBox());
			container.add(this.__getLinkButton());
			container.add(this.__getSaveViewButton());
			container.add(new qx.ui.core.Spacer(10), {flex: 1});
			container.add(this.__getOrientationButton());
			return (container);
		},

		__getOrientationButton : function () {
			var button = new qx.ui.form.Button("Layout/Orientation");
			button.addListener ("execute", function () {
				this.getOrientationWindow().center()
				this.getOrientationWindow().open();
			}, this);
			return (button);
		},

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
					// Shows plane name...unused and unfinished...
					//~ var orientPlaneLabel = new qx.ui.basic.Label(_this.__viewsNames[i]);
					//~ orientPlaneLabel.bind("value", _this.__viewers[i], "orientPlane");
					//~ labelsContainer.add(orientPlaneLabel);
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

		__createColormapWindow : function(volumeListItem) {
			var slices = this.getVolumeSlices(volumeListItem);

			var window = new qx.ui.window.Window().set ({
				caption : "colors for " + slices[0].getFileName(),
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
			window.add(group);

			[{name : "reds", lut : [ramp, zeros, zeros]},
				{name : "greens", lut : [zeros, ramp, zeros]},
				{name : "blues", lut : [zeros, zeros, ramp]},
				{name : "random reds", lut : [randomRed, zeros, zeros]},
				{name : "random greens", lut : [zeros, randomGreen, zeros]},
				{name : "random blues", lut : [zeros, zeros, randomBlue]},
				{name : "random colors", lut : [randomRed, randomGreen, randomBlue]},
				{name : "grey levels", lut : null},
				{name : "other colors", lut : slices[0].getLookupTables()}
			].forEach(function (colors, index) {
				if (!colors.lut && (index > 7)) return;
				var button = new qx.ui.form.RadioButton(colors.name);
				button.setUserData('lut', colors.lut);
				group.add(button);
				group.setSelection([button]);
			});

			group.addListener("changeSelection", function (e) {
				slices.forEach(function (slice) {
					slice.setLookupTables(e.getData()[0].getUserData('lut'));
				})
			});
			window.open();
			window.center();
		},

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

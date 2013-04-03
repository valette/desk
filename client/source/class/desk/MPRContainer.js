/**
* @ignore(Uint8Array)
* @lint ignoreDeprecated(alert)
* @asset(desk/Contrast_Logo_petit.PNG)
*/
qx.Class.define("desk.MPRContainer", 
{
    extend : qx.ui.container.Composite,
	include : desk.ActionLinkMixin,

	construct : function(file, parameters, callback)
	{
        this.base(arguments);
        this.setLayout(new qx.ui.layout.VBox());

		parameters = parameters || {};
		this.__windowsInGridCoord = parameters.inGridCoord || {
			viewers : [{c:0,r:0}, {c:1,r:0}, {c:0,r:1}],
			volList : {c:1,r:1}
		};

        this.__viewsNames = ["Axial", "Sagittal", "Coronal"];
		this.__nbUsedOrientations = parameters.nbOrientations || 3;

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

        if (parameters.standAlone == false) {
            this.__standalone = false;
        }

        this.add(gridContainer, {flex : 1});
		this.add(fullscreenContainer, {flex : 1});

		this.__createVolumesList();
		this.__createOrientationWindow();
		this.__addViewers();
		this.__addDropFileSupport();

		if (file) {
			this.addVolume(file, parameters, callback);
		}
	},

	destruct : function() {
		this.removeAllVolumes();
		this.__orientationWindow.dispose();
		qx.util.DisposeUtil.destroyContainer(this.__orientationContainer);
		qx.util.DisposeUtil.destroyContainer(this);
		this.__volumes.dispose();
		this.__windowsInGridCoord = null;
		this.__viewsNames = null;
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
		__windowsInGridCoord :null,
		__viewsNames : null,
		__nbUsedOrientations : null,

        /**
        * visualizes the output of an action whenever it is updated
        * @param action {desk.Action} : action to watch
        * @param file {String} : output file to visualize (without path)
        * @param parameters {Object} : parameters object containing settings
        * such as imageFormat (0 or 1), label (text), visible (bool)
        */
        watchAction : function (action, file, parameters, callback) {
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
                volume = this.addVolume(action.getOutputDirectory() + file, parameters, callback);
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
			var volumesGridCoor = this.__windowsInGridCoord.volList;
			this.__gridContainer.setUserData("freeRow", volumesGridCoor.r);
			this.__gridContainer.setUserData("freeColumn", volumesGridCoor.c);
			return this.__gridContainer;
		},

		/**
		 * Returns the window where the user can change different
		 * orientation parameters
		 */
		getOrientationWindow : function() {
			return this.__orientationWindow;
		},

		/**
		* applies the input function to all viewers
		* @param iterator {Function} iterator to apply to viewers
		* <pre class="javascript">
		* example :
		* myMPRContainer.applyToViewers(function (viewer) {
		* 	viewer.render();
		* });
		* </pre>
		* */
		applyToViewers : function (iterator) {
			var viewers = this.__viewers;
			for (var i = 0; i < this.__nbUsedOrientations;i ++) {
				iterator(viewers[i]);
			}
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
			this.applyToViewers(function (viewer) {
				viewer.render();
			});
		},

		__reorderMeshes : function () {
			var volumes = this.__volumes.getChildren();
			for (var i = 0; i < volumes.length; i++) {
				var slices = this.getVolumeSlices(volumes[i]);
				for (var j = 0; j < slices.length; j++){
                    var slice = slices[j];
                    // slice might not be loaded yet
					if (slice) {
						this.applyToViewers(function (viewer) {
							viewer.setSliceRank(slice, i);
						});
					}
				}
			}
			this.__renderAll();
		},

        __volumesScroll : null,
		__createVolumesList : function () {
            var scroll = this.__volumesScroll  = new qx.ui.container.Scroll();
            var container = new qx.ui.container.Composite();
			container.setLayout(new qx.ui.layout.VBox(5));
            container.add( this.__getToolBar() );
			var volumes = this.__volumes = new qx.ui.container.Composite();
			volumes.setLayout(new qx.ui.layout.VBox(1));
			var volumesGridCoor = this.__windowsInGridCoord.volList;
            this.addListener('resize', function () {
                scroll.setWidth(Math.round(this.getWidth() / 2));
                scroll.setHeight(Math.round(this.getHeight() / 2));
            }, this);
            container.add(volumes);
            scroll.add(container);
            if (this.__standalone) {
				this.__gridContainer.add(scroll, {row: volumesGridCoor.r, column: volumesGridCoor.c});
            }
		},

		__addViewers : function () {
			this.__viewers = [];
			for(var i=0; i<this.__nbUsedOrientations; i++) {
				var sliceView = new desk.SliceView(this, i);
				this.__viewers.push(sliceView);
				var viewGridCoor = this.__windowsInGridCoord.viewers[i];
				this.__addViewerToGrid(sliceView, viewGridCoor.r, viewGridCoor.c);
				sliceView.setOrientPlane(this.__viewsNames[i]);
			}
		},

		__applyViewsLayout : function (layout) {
			var viewers=this.__viewers;
			var gridContainer=this.__gridContainer;
			var orientationContainer=this.__orientationContainer;
			var i;
			for ( i=0; i < this.__nbUsedOrientations; i++ )
			{
				gridContainer.remove( viewers[i] );
			}
			orientationContainer.removeAll();

			for ( i=0; i < this.__nbUsedOrientations; i++ ) {
				var viewer;
				//// Use  layout.charAt(i)-1  since layout uses 1,2,3  but  __layoutSelectBoxes  goes from 0 to 2 !
				var letter = this.__layoutSelectBoxes[layout.charAt(i)-1].getSelection()[0].getLabel().charAt(0);
				for (var j=0;j<this.__nbUsedOrientations;j++)
				{
					viewer=viewers[j];
					if ( viewer.getOrientPlane().charAt(0) == letter ) {
						break;
					}
				}
				var viewGridCoor = this.__windowsInGridCoord.viewers[i];
				var r = viewGridCoor.r;
				var c = viewGridCoor.c;
				gridContainer.add (viewer, {row: r, column: c});
				orientationContainer.add(viewer.getReorientationContainer(), {row: r, column: c});
			}
		},

		__orientationContainer : null,
		__orientationWindow : null,
		__orientationButtonGroup : null,
		__layoutSelectBoxes : null,

		__createOrientationWindow : function () {
			var _this = this;
			
			var window = new qx.ui.window.Window().set({caption : "Layout and Orientation"});
			window.setLayout(new qx.ui.layout.VBox());

			window.add (new qx.ui.basic.Label("Windows layout :"));
			var planesContainer = new qx.ui.container.Composite();
			planesContainer.setLayout(new qx.ui.layout.HBox(5));
			
			var layoutSelectBoxes = [];
			var nbUsedOrientations = _this.__nbUsedOrientations;
			// Define function for change event
			var onChangeSelect = function(event)
			{
				var selectedItem = event.getData()[0];
				var selectItemLabel = selectedItem.getLabel();
				var thisSelectBox = this;
				var tempBoxes = _this.__layoutSelectBoxes;
				var currentLabel;
				var doubledBox;
				var viewers = _this.__viewers;
				var tempViewer;
				var labels2give = [];
				var dirOverLays2get;
				var index = 0;
				while( tempBoxes[index] != thisSelectBox ) {
					index++;
				}
				tempViewer = viewers[index];
				tempViewer.setOrientPlane(selectItemLabel);
				for(var i=0; i<nbUsedOrientations; i++)
				{
					currentLabel = tempBoxes[i].getSelection()[0].getLabel();
					if((currentLabel==selectItemLabel)&&(tempBoxes[i]!=thisSelectBox))
					{
						var j;
						//// Swtich direction overlays labels
						for( j = 0; j < 4; j++ ) {
							labels2give[j] = tempViewer.getOverLays()[j].getValue();
						}
						dirOverLays2get = viewers[i].getOverLays();
						for( j = 0; j < 4; j++ ) {
							tempViewer.getOverLays()[j].setValue(dirOverLays2get[j].getValue());
						}
						tempViewer.render();
						for( j = 0; j < 4; j++) {
							viewers[i].getOverLays()[j].setValue(labels2give[j]);
						}
						viewers[i].render();
						//// Update "prevousSelect" field
						doubledBox = tempBoxes[i];
						var tempSelectables = doubledBox.getSelectables();
						var tempLabelPreviousSel = thisSelectBox.getUserData("previousSelect");
						thisSelectBox.setUserData("previousSelect",selectItemLabel);
						for( j = 0; j < nbUsedOrientations; j++ ) {
							if(tempSelectables[j].getLabel() == tempLabelPreviousSel) {
								doubledBox.setUserData("previousSelect",tempLabelPreviousSel);
								doubledBox.setSelection([tempSelectables[j]]);
								break;
							}
						}
						break;
					}
				}
			};
			// Define function to load items on selectBox
			var setBox = function(inSelectBox, startItemID)
			{
				for(var i=0; i<nbUsedOrientations; i++)
				{
					var tempItem = new qx.ui.form.ListItem(_this.__viewsNames[i]);
					inSelectBox.add(tempItem);
					if(i==startItemID)
					{
						inSelectBox.setSelection([tempItem]);
						inSelectBox.setUserData("previousSelect", _this.__viewsNames[startItemID]);
					}
				}
			};
			// Create selectBoxes
			var selectBox, i;
			for (i = 0; i < nbUsedOrientations; i++) {
				planesContainer.add ( new qx.ui.basic.Label( (i+1) + " : ") );
				selectBox = new qx.ui.form.SelectBox();
				layoutSelectBoxes[i] = selectBox;
				setBox( selectBox, i, layoutSelectBoxes );
				selectBox.addListener( "changeSelection", onChangeSelect, selectBox);
				planesContainer.add( selectBox, { flex:1 } );
			}
			this.__layoutSelectBoxes = layoutSelectBoxes;
			window.add(planesContainer);
			
			window.add(new qx.ui.core.Spacer(5,10), {flex: 3});
			window.add(this.__getChangeLayoutContainer(), {flex: 10});
			window.add(new qx.ui.core.Spacer(5,15), {flex: 5});

			window.add (new qx.ui.basic.Label("Orientations :"));
			
			var orientsButtonGroupHBox = new qx.ui.form.RadioButtonGroup();
			orientsButtonGroupHBox.setLayout(new qx.ui.layout.HBox(10));
			var slicesOrButton = new qx.ui.form.RadioButton("Volume Slices");
			slicesOrButton.setUserData('flipCamera', true);
			var anamOrButton = new qx.ui.form.RadioButton("Anatomical Directions");
			anamOrButton.setUserData('flipCamera', false);
			function changeFlipStrategy (e) {
				var flipCamera = e.getTarget().getUserData('flipCamera');
				this.applyToViewers(function (viewer) {
					viewer.setOrientationChangesOperateOnCamera(flipCamera);
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
			window.add(orientsContainer);
			
			var gridContainer=new qx.ui.container.Composite();
			var gridLayout=new qx.ui.layout.Grid();
			for ( i = 0; i < 2; i++ ) {
				gridLayout.setRowFlex( i, 1 );
				gridLayout.setColumnFlex( i, 1 );
			}
			window.add( gridContainer );
			this.__orientationWindow = window;

			gridContainer.setLayout( gridLayout );
			this.__orientationContainer = gridContainer;
		},

		__addViewerToGrid : function (sliceView, r, c) {
			var fullscreen=false;
			this.__gridContainer.add(sliceView, {row: r, column: c});
			this.__orientationContainer.add(sliceView.getReorientationContainer(this.__orientationButtonGroup), {row: r, column: c});
			sliceView.setUserData( "positionInGrid", { row :r , column :c } );

			// sliceView.addListener("mouseover", function(){ sliceView.setUserData("thisViewON", true); });
			// sliceView.addListener("mouseout", function(){ sliceView.setUserData("thisViewON", false); });
			// sliceView.setUserData("thisViewON", false);
			sliceView.addListener("mouseover", function(){ sliceView.setViewOn(true); });
			sliceView.addListener("mouseout", function(){ sliceView.setViewOn(false); });
			var fullscreenCommand = new qx.ui.core.Command("Ctrl+P");
			qx.util.DisposeUtil.disposeTriggeredBy(fullscreenCommand, sliceView);
			var fullscreenButton = new qx.ui.form.Button("+", null, fullscreenCommand).set( { opacity: 0.5 } );
			sliceView.getRightContainer().add(fullscreenButton);
			fullscreenButton.addListener("execute", function () {
					if (!fullscreen) {
						// if(sliceView.getUserData("thisViewON")==true) {
						if(sliceView.getViewOn()==true) {
							fullscreenButton.setLabel("-");
							this.__gridContainer.setVisibility("excluded");
							this.__fullscreenContainer.add(sliceView, {flex : 1});
							this.__fullscreenContainer.setVisibility("visible");
							fullscreen=true;
							this.fireDataEvent("switchFullScreen", true);
						}
					} else {
						fullscreenButton.setLabel("+");
						this.__fullscreenContainer.setVisibility("excluded");
						fullscreen=false;
						this.__fullscreenContainer.remove(sliceView);
						this.__gridContainer.add(sliceView, sliceView.getUserData("positionInGrid"));
						this.__gridContainer.setVisibility("visible");
						this.fireDataEvent("switchFullScreen", false);
					}
			}, this);
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
        * @param parameters {Object} : parameters object containing settings
        * such as imageFormat (0 or 1), label (text), visible (bool)
        * @param callback {Function} : callback when loaded.
        * @return {qx.ui.container.Composite}  volume item
		*/
		addVolume : function (file, parameters, callback) {
			var volumeSlices = [];

			var opacity = 1;
			var imageFormat = 1;

            parameters = parameters || {};
            if ( parameters.opacity != null ) {
				opacity = parameters.opacity;
			}
			if ( parameters.imageFormat != null ) {
				imageFormat = parameters.imageFormat;
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
            if (parameters.label) {
                label.setValue(parameters.label);
            }
            label.setTextAlign("left");
			labelcontainer.add(label, {flex : 1});

			var numberOfRemainingMeshes = this.__nbUsedOrientations;
			var _this = this;
			for(var i = 0; i < this.__nbUsedOrientations; i++) {
				volumeSlices[i] = this.__viewers[i].addVolume(file, parameters, (function (myI) { 
					return (function (volumeSlice) {
						numberOfRemainingMeshes--;
						if (numberOfRemainingMeshes === 0) {

							if (parameters.visible !== undefined) {
								hideShowCheckbox.setValue(parameters.visible);
							}
							scalarBounds = volumeSlice.getScalarBounds();
//							updateWindowLevel();
							volumeListItem.setUserData("loadingInProgress", false);
							if (volumeListItem.getUserData("toDelete")) {
								_this.removeVolume(volumeListItem);
							}
							_this.__reorderMeshes();
							if (typeof callback === 'function') {
								callback(volumeListItem);
							}
						}
					});
				} ) (i));
			}

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
					contrast += deltaX / 200;
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
			}, this );

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

				var slice=volumeListItem.getUserData("slices")[0];
				var window=new qx.ui.window.Window();
				window.setCaption(slice.getFileName());
				window.setLayout(new qx.ui.layout.VBox());
				window.setShowClose(true);
				window.setShowMinimize(false);
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
					var segmentButton = new qx.ui.menu.Button("segment");
					segmentButton.addListener("execute", function () {
						new desk.SegTools(this, this.getVolumeFile(volumeListItem));
					},this);
					menu.add(segmentButton);
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
		 * Reloads all volumes
		 */
		updateAll : function () {
			var volumes = this.__volumes.getChildren();
			for (var i = 0; i != volumes.length; i++) {
				this.updateVolume(volumes[i]);
			}
		},

		/**
		 * Reloads a specific volume
		 * @param volume {qx.ui.container.Composite} the volume to reload
		 */
		updateVolume : function (volume) {
			var slices = volume.getUserData("slices");
			for (var i = 0; i < slices.length; i++) {
				slices[i].update();
			}
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

			var slices = this.getVolumeSlices(volume);
			this.applyToViewers (function (viewer) {
				viewer.removeVolumes(slices);
			});

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
			container.add(this.getUpdateButton(this.updateAll, this));
			container.add(this.__getLinkButton());
			container.add(new qx.ui.core.Spacer(10), {flex: 1});
			container.add(this.__getOrientationButton());
			return (container);
		},

		__getOrientationButton : function () {
			var button = new qx.ui.form.Button("Layout/Orientation");
			button.addListener ("execute", function () {
				this.__orientationWindow.open();
			}, this);
			return (button);
		},

		__getChangeLayoutContainer : function () {
			var _this = this;
			var i;
			var gridContainer = new qx.ui.container.Composite();
			var gridLayout = new qx.ui.layout.Grid();
			for ( i = 0; i < this.__nbUsedOrientations; i++) {
				gridLayout.setRowFlex(i, 30);
				gridLayout.setColumnFlex(i, 1);
			}
			gridContainer.setLayout(gridLayout);
			
			var viewGridCoor = this.__windowsInGridCoord;
			for( i = 0; i < this.__nbUsedOrientations; i++ ) {
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
						var selfLabel = this.getChildren()[0];
						var selfViewerID = selfLabel.getValue();
						droppedLabel.setValue(selfViewerID);
						selfLabel.setValue(droppedViewerID);
						var tempGridContChildren = gridContainer.getChildren();
						var layout = "";
						for( var i = 0; i < _this.__nbUsedOrientations; i++ ) {
							layout += tempGridContChildren[i].getChildren()[0].getValue();
						}
						_this.setViewsLayout( layout );
					}
				}, labelsContainer);
				var viewLabel = new qx.ui.basic.Label( ""+(i+1));
				var font = qx.bom.Font.fromString("20px sans-serif bold")
				viewLabel.setFont(font);
				qx.util.DisposeUtil.disposeTriggeredBy(font, this);
				labelsContainer.add(viewLabel);
					// Shows plane name...unused and unfinished...
					//~ var orientPlaneLabel = new qx.ui.basic.Label(_this.__viewsNames[i]);
					//~ orientPlaneLabel.bind("value", _this.__viewers[i], "orientPlane");
					//~ labelsContainer.add(orientPlaneLabel);
				gridContainer.add(labelsContainer, {row: viewGridCoor.viewers[i].r, column: viewGridCoor.viewers[i].c});
			}
			return (gridContainer);
		},

		/**
		 * Links the view parameters (zoom, position, etc..) to an other viewer
		 * @param volumeViewer{desk.MPRContainer} viewer to link to
		 */
		link : function (volumeViewer) {
			var viewers = volumeViewer.__viewers;
			var viewers2 = this.__viewers;
			if(this.__nbUsedOrientations === viewers2.length) {
				for (var i = 0; i < this.__nbUsedOrientations; i++) {
					var viewer = viewers[i];
					var orientation = viewer.getOrientation();
					for (var j = 0; j < this.__nbUsedOrientations; j++) {
						if (viewers2[j].getOrientation() === orientation) {
							viewer.link(viewers2[j]);
						}
					}
					var originControls = viewer.getThreeContainer().getControls()
					viewer.applyToOtherLinks(function (me) {
						var controls = this.getThreeContainer().getControls();
						controls.copy(originControls);
						controls.update();
						this.render();
					});
				}
			} else {
				alert("Cannot link viewers : number of orientations incoherent");
			}
		},

		__getLinkButton : function () {
			var menu = new qx.ui.menu.Menu();
			var unLinkButton = new qx.ui.menu.Button("unlink");
			unLinkButton.addListener("execute", function() {
				this.applyToViewers (function (viewer) {
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

			var colormapGroup = new qx.ui.form.RadioButtonGroup().
				set({layout : new qx.ui.layout.VBox()});
			window.add(colormapGroup);

			var noColors = new qx.ui.form.RadioButton("grey levels");
			colormapGroup.add(noColors);

			var ramp = new Uint8Array(256);
			var zeros = new Uint8Array(256);
			var i;
			for (i = 0; i < 256; i++) {
				ramp[i] = i;
				zeros[i] = 0;
			}

			var redColors = new qx.ui.form.RadioButton("reds");
			colormapGroup.add(redColors);

			var greenColors = new qx.ui.form.RadioButton("greens");
			colormapGroup.add(greenColors);

			var blueColors = new qx.ui.form.RadioButton("blues");
			colormapGroup.add(blueColors);

			var randomRedColors = new qx.ui.form.RadioButton("random reds");
			colormapGroup.add(randomRedColors);

			var randomGreenColors = new qx.ui.form.RadioButton("random greens");
			colormapGroup.add(randomGreenColors);

			var randomBlueColors = new qx.ui.form.RadioButton("random blues");
			colormapGroup.add(randomBlueColors);

			var randomColors = new qx.ui.form.RadioButton("random Colors");
			colormapGroup.add(randomColors);
			var randomRed = new Uint8Array(256);
			var randomGreen = new Uint8Array(256);
			var randomBlue = new Uint8Array(256);

			for (i = 0; i < 256; i++) {
				randomRed[i] = Math.floor(Math.random()*255);
				randomGreen[i] = Math.floor(Math.random()*255);
				randomBlue[i] = Math.floor(Math.random()*255);
			}

			var currentColors = slices[0].getLookupTables();
			var otherColors = null;

			colormapGroup.setSelection([noColors]);
			if (currentColors) {
				if (currentColors[0] != null) {
					otherColors = new qx.ui.form.RadioButton("other");
					colormapGroup.add(otherColors);
					colormapGroup.setSelection([otherColors]);
				}
			}

			colormapGroup.addListener("changeSelection", function (e) {
				var newColors;

				switch (colormapGroup.getSelection()[0])
				{
				case redColors :
					newColors = [ramp, zeros, zeros];
					break;
				case greenColors :
					newColors = [zeros, ramp, zeros];
					break;
				case blueColors :
					newColors = [zeros, zeros, ramp];
					break;
				case randomRedColors :
					newColors = [randomRed, zeros, zeros];
					break;
				case randomGreenColors :
					newColors = [zeros, randomGreen, zeros];
					break;
				case randomBlueColors :
					newColors = [zeros, zeros, randomBlue];
					break;
				case randomColors :
					newColors = [randomRed, randomGreen, randomBlue];
					break;
				case otherColors :
					newColors = currentColors;
					break;
				case noColors :
					newColors = 0;
					break;
				default :
					newColors = 0;
					break;
				}
				for (var i = 0; i < slices.length; i++) {
					slices[i].setLookupTables(newColors);
				}
			});
			window.open();
			window.center();
		},

		__addDropFileSupport : function () {
			this.setDroppable(true);
			this.addListener("drop", function(e) {
				if (e.supportsType("fileBrowser")) {
					var files = e.getData("fileBrowser").getSelectedFiles();
					for (var i = 0; i < files.length; i++) {
						this.addVolume(files[i]);
					}
				} else if (e.supportsType("file")) {
					if (e.supportsType("VolumeViewer")) {
						if (this == e.getData("VolumeViewer")) {
							return;
						}
					}						
					this.addVolume(e.getData("file"));
				}
			}, this);
		}
	}
});

/*
#ignore(Uint8Array)
*/

qx.Class.define("desk.segTools",
{
  extend : qx.ui.window.Window,

	construct : function(master, globalFile, globalFileBrowser)
	{	
		this.base(arguments);

        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }

    ////Global variables ?

		this.__master = master;

		this.__file = globalFile;

		this.__fileBrowser = globalFileBrowser;

	//// Set window
		this.setLayout(new qx.ui.layout.VBox());
		this.set({
								showMinimize: false,
								showMaximize: false,
								allowMaximize: false,
								showClose: true,
								resizable: false,
								movable : true
							});
		
	//// Fill window with the tools widgets

		this.__buildRightContainer();


		var _this=this;

		var listenersIds=[];
		master.applyToViewers( function (sliceView) {
			listenersIds[sliceView]=sliceView.addListener("changeSlice", function ( event ) {
				_this.__saveCurrentSeeds();
				_this.__reloadSeedImage( sliceView );
			});
		});

		this.addListener("close", function (e) {
			master.applyToViewers( function (sliceView) {
				sliceView.removeListenerById(listenersIds[sliceView]);
				sliceView.setPaintMode(false);
				sliceView.setEraseMode(false);
				var canvas=sliceView.getDrawingCanvas();
				canvas.getContext2d().clearRect(0,0,
							canvas.getCanvasWidth(), canvas.getCanvasHeight());
				sliceView.fireEvent("changeDrawing");
			});
		});
		this.__labelColors=[];
		this.open();

//		this.__createLabelsList();
	//// Return the tools window aka : this
		return (this);

	},

	statics : {
		filePrefixes : ["seed","correction"],
		seedsListsString : "seedsLists",
		seedsArrayString : "seedsArray",
		cacheTagsArrayString : "cacheTagsArray"
	},

	events : {
	},

	properties : {
		sessionDirectory : { init : null, event : "changeSessionDirectory"},
		seedsType : { init : 0, check: "Number", event : "changeSeedsType"}
	},

	members :
	{

		__colorsFile : "data/xml/colors7.xml",
		__master : null,
		__file : null,
		__fileBrowser : null,

		__topRightContainer : null,
		__bottomRightContainer : null,
		__mainBottomRightContainer : null,
		
		
		__curView : null, // en attendant...
		
		__seedsTypeSelectBox : null,
		
		__startSegmentationButton : null,

// Tableau contenant les couleurs des seeds
         __labelColors : null,

// type arrays containing seeds colors (for speed processing)
         __labelColorsRed : null,
         __labelColorsGreen : null,
         __labelColorsBlue : null,

		__compactLabelsRed : null,
		__compactLabelsGreen : null,
		__compactLabelsBlue : null,
		
         
         __eraserCoeff : 2,     //Taille gomme  =  eraserCoeff * taille crayon --> c'est plus agréable d'effacer comme ça
         
         
         __eraserCursorZ : 123000000,     //Indice de position en z du widget qui représente la gomme (toujours devant)
		
		__penSize : null,
		__eraserButton : null,
		__eraserCursor : null,

		// width of the panel measured manually during debug
		//~ __rightPanelWidth : 405 + 16 + 4,
		__rightPanelWidth : 405,
		
		__settingButtons : false,

		__reloadSeedImage : function (sliceView) {
			if (this.getSessionDirectory()==null)
				return;
			var _this=this;
			var canvas=sliceView.getDrawingCanvas();
			var width=canvas.getCanvasWidth()
			var height=canvas.getCanvasHeight()

			var context=canvas.getContext2d();
			context.clearRect(0, 0, width, height);
			var seedsType=_this.getSeedsType();
			var seedsList=sliceView.getUserData(desk.segTools.seedsListsString)[seedsType];
			var seedsArray=seedsList.getUserData(desk.segTools.seedsArrayString);
			var cacheTagsArray=seedsList.getUserData(desk.segTools.cacheTagsArrayString);
			var sliceId=sliceView.getSlice();

			if (seedsArray[sliceId]!=0) {
				var imageLoader= new Image();
				seedsList.setSelection([seedsArray[sliceId]]);
				imageLoader.onload=function(){
					context.drawImage(imageLoader, 0, 0);
					sliceView.fireEvent("changeDrawing");
					imageLoader.onload=0;
				}
				imageLoader.src=_this.__fileBrowser.getFileURL(_this.getSessionDirectory())+"/"+
								_this.__getSeedFileName ( sliceView, sliceId, seedsType)+"?nocache="+
								cacheTagsArray[sliceId];
			}
			else {
				seedsList.resetSelection();
				sliceView.fireEvent("changeDrawing");
			}
		},

		__buildRightContainer : function()
		{	
			var tools = this;
			
			var theMaster = tools.__master;
			
			var volFile = tools.__file;
			
			var fileBrowser = tools.__fileBrowser;
			
			
			var spacing=5;
			
			var tRCL=new qx.ui.layout.HBox();
			tRCL.setSpacing(spacing);
			tools.__topRightContainer = new qx.ui.container.Composite(tRCL);

			var bRCL=new qx.ui.layout.HBox();
			bRCL.setSpacing(spacing);
			tools.__bottomRightContainer= new qx.ui.container.Composite(bRCL);

		////Create pen size chose widget
            tools.__penSize = new qx.ui.form.Spinner().set({
                minimum: 1,
                maximum: 100,
                value: 1//tools.__curView.__drawingCanvasParams.myLineWidth
            });
			
            this.__penSize.addListener("changeValue", function(event)
			{
					this.__master.applyToViewers(function (viewer) {
						viewer.setPaintWidth(event.getData());
					});
				}, this);
            this.__penSize.setValue(5);
			
			var penLabel = new qx.ui.basic.Label("Brush : ");
			this.__topRightContainer.add(penLabel);
			this.__topRightContainer.add(tools.__penSize);
			
		////Create eraser on/off button
            tools.__eraserButton = new qx.ui.form.ToggleButton("Eraser");
			
			this.__eraserButton.addListener("changeValue", function(e)
			{
				this.__master.applyToViewers(function (viewer) {
					viewer.setEraseMode(e.getData());
					});
				}, this);

			tools.__topRightContainer.add(tools.__eraserButton);

			
			
		////Create labels zone
			var paintPage = new qx.ui.tabview.Page("paint");
			var paintPageLayout=new qx.ui.layout.VBox();
			paintPageLayout.setSpacing(5);
            paintPage.setLayout(paintPageLayout);
			paintPage.add(tools.__topRightContainer);

			tools.__colorsContainer=new qx.ui.container.Composite();
            tools.__colorsContainer.setLayout(new qx.ui.layout.Grid(1,1));
			paintPage.add(tools.__colorsContainer);

			var bRCL=new qx.ui.layout.HBox();  //~ resizing
			bRCL.setSpacing(spacing);  //~ resizing
			tools.__mainBottomRightContainer = new qx.ui.container.Composite(bRCL);  //~ resizing
			
			var tabView = new qx.ui.tabview.TabView();
			tools.__tabView=tabView;
            tabView.add(paintPage);
			tabView.setVisibility("excluded");

			var sessionWdgt = tools.__getSessionsWidget();
			this.__addSeedsListsToViews();
			this.add(sessionWdgt);
			
			this.add(tools.__mainBottomRightContainer, {flex : 1}); //~ resizing

			tools.__mainBottomRightContainer.add(tabView); //~ resizing

			this.__loadColors();		


			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("Opacity :");
			tools.__topRightContainer.add(whileDrawingDrwngOpacityLabel);
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
			whileDrawingDrwngOpacitySlider.setValue(100);
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
				this.__master.applyToViewers(function (viewer) {
					viewer.setPaintOpacity(event.getData()/100);
					});
			},this);

            this.__topRightContainer.add(whileDrawingDrwngOpacitySlider, {flex : 1});

			paintPage.add(this.__bottomRightContainer);

			var clusteringPage = new qx.ui.tabview.Page("clustering");
            clusteringPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(clusteringPage);
			var clusteringAction=new desk.action("cvtseg2", false);
			clusteringAction.setActionParameters(
				{"input_volume" : volFile});

			clusteringAction.setOutputSubdirectory("clustering");
			
			clusteringAction.buildUI();
			clusteringPage.add(clusteringAction);

			var segmentationPage = new qx.ui.tabview.Page("segmentation");
            segmentationPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(segmentationPage);
			var segmentationAction=new desk.action("cvtgcmultiseg", false);
			clusteringAction.setActionParameters({
				"input_volume" : volFile});

			segmentationAction.setOutputSubdirectory("segmentation");
			segmentationAction.connect("clustering", clusteringAction, "clustering-index.mhd");

			segmentationAction.buildUI();
			segmentationPage.add(segmentationAction);

			var medianFilteringPage = new qx.ui.tabview.Page("cleaning");
            medianFilteringPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(medianFilteringPage);
			var medianFilteringAction=new desk.action("volume_median_filtering", false);
			medianFilteringAction.setOutputSubdirectory("filtering");
			medianFilteringAction.connect("input_volume", 
										segmentationAction, "seg-cvtgcmultiseg.mhd");
			medianFilteringAction.buildUI();
			medianFilteringPage.add(medianFilteringAction);

			var meshingPage = new qx.ui.tabview.Page("meshing");
            meshingPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(meshingPage);
			var meshingAction=new desk.action("extract_meshes", false);
			meshingAction.setOutputSubdirectory("meshes");
			clusteringAction.setActionParameters({"colors" : tools.__colorsFile});

			meshingAction.buildUI();
			meshingPage.add(meshingAction);

			tools.addListener("changeSessionDirectory", function (e)
			{
				var directory=e.getData();
				medianFilteringAction.setOutputDirectory(directory);
				clusteringAction.setOutputDirectory(directory);
				segmentationAction.setOutputDirectory(directory);
				meshingAction.setOutputDirectory(directory);
				//~ var adjacenciesXMLFileName = "/var/www/html" + "/visu/adjacencies3.xml?nocache="+Math.random();
				//~ var adjacenciesXMLFileName = "/visu/adjacencies3.xml?nocache="+Math.random();
				//~ var adjacenciesXMLFileName = "data/adjacencies3.xml?nocache="+Math.random();
				var adjacenciesXMLFileName = "data/adjacencies7.xml";
				segmentationAction.setActionParameters({
					"input_volume" : volFile,
					"seeds" : tools.getSessionDirectory()+"/seeds.xml"
					//,"adjacencies" : adjacenciesXMLFileName
					});
				clusteringAction.setActionParameters({
					"input_volume" : volFile});
				meshingAction.setActionParameters({
					"input_volume" : tools.getSessionDirectory()+"/filtering/output.mhd"});
			});

			tools.__startSegmentationButton=new qx.ui.form.Button("Start segmentation");
			tools.__startSegmentationButton.addListener("execute", function ()
			{
				tools.__startSegmentationButton.setEnabled(false);
				tools.__segmentationInProgress=true;
				tools.__saveCurrentSeeds(function() {
							medianFilteringAction.executeAction();});
			}, this);
			tools.__bottomRightContainer.add(tools.__startSegmentationButton);

			var meshingButton=new qx.ui.form.Button("extract meshes");
			tools.__extractMeshesButton=meshingButton;
			meshingButton.addListener("execute", function () {
				tools.__startSegmentationButton.setEnabled(false);
				meshingButton.setEnabled(false);
				meshingAction.executeAction();
				}, this);
			tools.__bottomRightContainer.add(meshingButton);

			var segmentationToken=null;
			medianFilteringAction.addListener("actionUpdated", function ()
			{
				tools.__startSegmentationButton.setEnabled(true);
				if (segmentationToken==null)
				{
					segmentationToken=theMaster.addVolume(medianFilteringAction.getOutputDirectory()+"/output.mhd",
								{opacity : 0.5, imageFormat : 0,
								colors : [tools.__labelColorsRed, tools.__labelColorsGreen, tools.__labelColorsBlue]});
				}
				else
				{
					theMaster.updateVolume(segmentationToken);
				}
			}, this);

			tools.__master.addListener("removeVolume", function (e) {
				if (e.getData()==segmentationToken) {
					segmentationToken=null;
				}
			});


			meshingAction.addListener("actionUpdated", function ()
			{
				meshingButton.setEnabled(true);
				tools.__startSegmentationButton.setEnabled(true);
				var meshesViewer=new desk.meshView(tools.getSessionDirectory()+"/meshes/meshes.xml",
								fileBrowser);
			}, this);

			tools.__seedsTypeSelectBox = tools.__getSeedsTypeSelectBox();
			paintPage.addAt(tools.__seedsTypeSelectBox,0);
		},

		__rebuildLabelsList : function () {
			var colors=this.__labelColors;
			var row=0;
			var column=0;
			var numberOfColumns=4;
			this.__colorsContainer.removeAll();
			for (var i=0;i<colors.length;i++) {	
				var labelBox=colors[i].container;
				this.__colorsContainer.add(labelBox, {column: column, row: row});
				column++;
				if (column>=numberOfColumns) {
					column=0;
					row++;
				}
			}
			this.__buildLookupTables();
		},

		__buildLookupTables : function () {
			var red=new Uint8Array (256);
			var green=new Uint8Array (256);
			var blue=new Uint8Array (256);
			this.__labelColorsRed=red;
			this.__labelColorsGreen=green;
			this.__labelColorsBlue=blue;
			var i;
			for (i=0;i<256;i++) {
				red[i]=0;
				green[i]=0;
				this.__labelColorsBlue[i]=0;
			}
			var colors=this.__labelColors;

			// build compact lookuptables for seeds processing
			var cRed=new Uint8Array (colors.length);
			this.__compactLabelsRed=cRed;
			var cGreen=new Uint8Array (colors.length);
			this.__compactLabelsGreen=cGreen;
			var cBlue=new Uint8Array (colors.length);
			this.__compactLabelsBlue=cBlue;

			for (i=0;i<colors.length;i++) {
				var label=colors[i].label;
				red[label]=colors[i].red;
				green[label]=colors[i].green;
				blue[label]=colors[i].blue;

				cRed[i]=colors[i].red;
				cGreen[i]=colors[i].green;
				cBlue[i]=colors[i].blue;
			}
		},

		__loadColors : function () {
			var tools=this;
		////Fill labels zone width data from the xml file

			var colorsParamRequest = new XMLHttpRequest();
			colorsParamRequest.onreadystatechange = function()
			{
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(this.responseXML!=null)
					{
						var response = this.responseXML;
						var colors=response.getElementsByTagName("color");
						var nbLabels = colors.length;

						for(var i=0; i<nbLabels; i++)
						{
							var color=colors[i];
							var label=parseInt(color.getAttribute("label"),10)
							var colorName=color.getAttribute("name");
							var red=parseInt(color.getAttribute("red"));
							var green=parseInt(color.getAttribute("green"));
							var blue=parseInt(color.getAttribute("blue"));
							tools.__addColorItem(label, colorName, red, green, blue);
						}

						tools.__rebuildLabelsList();
					}
					else
						alert("Global Params : Failure...");
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					// fetched the wrong page or network error...
					alert('Global Params : "Fetched the wrong page" OR "Network error"');
				}
			};
			//~ colorsParamRequest.open("GET", "/visu/colorsKnee.xml?nocache="+Math.random(), true);
			colorsParamRequest.open("GET",
				tools.__fileBrowser.getFileURL(tools.__colorsFile)+"?nocache="+Math.random(), true);
			colorsParamRequest.send(null);
		},

		__addColorItem : function(label, labelName, red, green, blue)
        {
		////Function creates one label box
			var unfocusedBorder = new qx.ui.decoration.Single(2, "solid", "black");
            var focusedBorder = new qx.ui.decoration.Single(3, "solid", "red");
			var boxWidth = 80;

            var labelLayout = new qx.ui.layout.VBox();
            labelLayout.setSpacing(4);
			var labelBox = new qx.ui.container.Composite().set({
                layout : labelLayout,
                allowGrowX: false,
                allowGrowY: false,
                width: boxWidth,
                height: 53,
                decorator: unfocusedBorder,
                backgroundColor: "background-light",
                focusable : true
            });
			var colorBox = new qx.ui.container.Composite().set({
                maxWidth: boxWidth-12,
                height: 25,
                alignX : "center",
				backgroundColor: qx.util.ColorUtil.rgbToRgbString([red, green, blue])});

			this.__eraserButton.addListener("changeValue", function (e) {
				if (e.getData())
				{
					labelBox.set({decorator: unfocusedBorder, backgroundColor: "background-light"});
				}
			}, this);

			labelBox.addListener("click", function(e)
			{
				var children = this.__colorsContainer.getChildren();
				var paint;
				if (!(labelBox.getBackgroundColor()=="white"))
				{
					labelBox.set({decorator: focusedBorder, backgroundColor: "white"});
					for(var k=0; k<children.length; k++)
					{
						if(children[k]!=labelBox)
						{
							children[k].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
						}
					}
					paint=true;
					this.__eraserButton.setValue(false);
				}
				else
				{
					labelBox.set({decorator: unfocusedBorder, backgroundColor: "background-light"});
					paint=false
				}

				this.__master.applyToViewers( function (viewer) {
					viewer.setPaintColor(colorBox.getBackgroundColor());
					viewer.setPaintMode(paint);
					});
            }, this);
    
			var boxLabel = new qx.ui.basic.Label(" "+label + " : " + labelName).set({alignX:"left"});
			labelBox.add(boxLabel);
			labelBox.add(colorBox);

			var labelAttributes={
				red : red,
				green : green,
				blue : blue,
				label : label,
				labelName : labelName,
				container : labelBox};

			this.__labelColors.push(labelAttributes);

			//context menu to edit labels
			var menu = new qx.ui.menu.Menu;
			var editButton = new qx.ui.menu.Button("edit");
			editButton.addListener("execute", function () {
				},this);
			menu.add(editButton);

			var addButton = new qx.ui.menu.Button("add new label");
			addButton.addListener("execute", function (){
				var colors=this.__labelColors;
				var maxLabel=0;
				for (var i=0;i<colors.length;i++) {
					if (colors[i].label>maxLabel) {
						maxLabel=colors[i].label;
					}
				}
				this.__addColorItem (maxLabel+1, "edit me", 100, 100, 100)
				this.__rebuildLabelsList();
				},this);
			menu.add(addButton);

			var removeButton = new qx.ui.menu.Button("remove");
			removeButton.addListener("execute", function (){
				this.removeVolume(volumeListItem);
				},this);
			menu.add(removeButton);
			labelBox.setContextMenu(menu);
        },

		loadSession : function()
		{
			this.__clearSeeds();
			var master=this.__master;
			var _this=this;

			master.applyToViewers ( function (sliceView) {
				sliceView.setUserData("previousSlice", sliceView.getSlice());
			});

			var loadSessionRequest = new XMLHttpRequest();
			
			loadSessionRequest.onreadystatechange = function( ) {
				 if(this.readyState == 4 && this.status == 200) {
					// so far so good
					if(this.responseXML!=null) {
						var response = this.responseXML;
						for (var k=0;k<2;k++) {
							var slices;
							if (k==0) {
								slices=response.getElementsByTagName("seed");
							}
							else {
								slices=response.getElementsByTagName("correction");
							}

							for(var j=0; j<slices.length; j++) {
								var sliceId = parseInt(slices[j].getAttribute("slice"),10);
								var sliceOrientation;
								if (slices[j].hasAttribute("orientation")){
									sliceOrientation = parseInt(slices[j].getAttribute("orientation"),10);
								}
								else {
									sliceOrientation = 0;
								}
								master.applyToViewers ( function (sliceView) {
									if(sliceOrientation==sliceView.getOrientation())
										_this.__addNewSeedItemToList(sliceView, sliceId, k);
									});
							}
						master.applyToViewers( function (sliceView) {
								_this.__reloadSeedImage( sliceView );
							});
						}
					}
					else {
						alert("no seeds found");
						master.applyToViewers( function (sliceView) {
								_this.__reloadSeedImage( sliceView );
							});
					}
				}
				else if (this.readyState == 4 && this.status != 200) {
					alert("no seeds found");
					master.applyToViewers( function (sliceView) {
						_this.__reloadSeedImage( sliceView );
						});
				}
			};

			loadSessionRequest.open("GET",
				this.__fileBrowser.getFileURL(
					this.getSessionDirectory()+"/seeds.xml?nocache="+Math.random()), true);
			loadSessionRequest.send(null);
		},

		__getSessionsWidget : function()
		{	
			var tools = this;
			var volFile = this.__file;
			var fileBrowser = this.__fileBrowser;
			
			var sessionsListLayout=new qx.ui.layout.HBox();
			sessionsListLayout.setSpacing(4);
			var sessionsListContainer=new qx.ui.container.Composite(sessionsListLayout);
			var sessionsListLabel=new qx.ui.basic.Label("Sessions : ");
			sessionsListContainer.add(new qx.ui.core.Spacer(), {flex: 5});
			sessionsListContainer.add(sessionsListLabel);
			var button=new qx.ui.form.Button("new session");
			sessionsListContainer.add(button);

			var sessionType="gcSegmentation";
			var sessionsList = new qx.ui.form.SelectBox();
			sessionsListContainer.add(sessionsList);

			var updateInProgress=false;

			function updateList(sessionIdToSelect) {
				updateInProgress=true;
				var buildSessionsItems =function (sessions)
				{
					var sessionItemToSelect=null;
					sessionsList.removeAll();
					for (var i=0; i<sessions.length; i++)
					{
						var sessionId=sessions[i];
						var sessionItem = new qx.ui.form.ListItem(""+sessionId);
						sessionsList.add(sessionItem);
						if (sessionId==sessionIdToSelect)
							sessionItemToSelect=sessionItem;
					}

					if (sessionIdToSelect==null)
					{
						var dummyItem = new qx.ui.form.ListItem("select a session");
						sessionsList.add(dummyItem);
						dummyItem.setUserData("dummy",true);
					}
					if (sessionItemToSelect!=null)
					{
						sessionsList.setSelection([sessionItemToSelect]);
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileBrowser.getSessionDirectory(
							volFile,sessionType,sessionIdToSelect));
						tools.__clearSeeds();
					}
					else
						sessionsList.setSelection([dummyItem]);					
					updateInProgress=false;
				};

				fileBrowser.getFileSessions(volFile, sessionType, buildSessionsItems);
			}
			
			sessionsList.addListener("changeSelection", function(e)
			{
				if (!updateInProgress)
				{
					var listItem=sessionsList.getSelection()[0];
					if (listItem.getUserData("dummy")!=true)
					{
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileBrowser.getSessionDirectory(
							volFile,sessionType,listItem.getLabel()));
						tools.loadSession();
					}
					sessionsList.close();
				}
			});

			button.addListener("execute", function (e){
				this.__fileBrowser.createNewSession(volFile,sessionType, updateList);
				}, this);

			updateList();
			return sessionsListContainer;
		},

		__saveCurrentSeeds : function(callback) {

			if (this.getSessionDirectory()==null)
				return;

			var numberOfRemainingSaves=1+this.__master.getViewers().length;

			function savecallback () {
				numberOfRemainingSaves--;
				if ((numberOfRemainingSaves==0)&&
					(typeof callback =="function")) {
						callback();
					}
			}
			
        	var wasAnySeedModified=false;
        	var _this=this;
			this.__master.applyToViewers ( function ( sliceView ) {
				var base64Img=_this.__getNewSeedsImage ( sliceView );
				if ( base64Img!=false ) {
					// save image
					var sliceId=sliceView.getUserData( "previousSlice" );
					var seedsType=_this.getSeedsType();
					var fileName=_this.getSessionDirectory()+"/"+
						_this.__getSeedFileName (sliceView, sliceId, seedsType);

					_this.__addNewSeedItemToList ( sliceView, sliceId, seedsType );
					wasAnySeedModified=true;

					var parameterMap={
					action : "save_binary_file",
					file_name : _this.__getSeedFileName (sliceView, sliceId, seedsType),
					base64Data : base64Img,
					output_directory : _this.getSessionDirectory()};
					_this.__fileBrowser.getActions().launchAction(parameterMap, savecallback);
				}
				else {
					savecallback();
				}
				sliceView.setUserData("previousSlice", sliceView.getSlice());
				sliceView.setDrawingCanvasNotModified();
			});
			if (wasAnySeedModified) {
				this.__saveSeedsXML(savecallback);
			}
			else {
				savecallback();
			}
		},

		////Rewrite xml list of the drawn seeds
		__saveSeedsXML : function(callback) {
               // XML writer with attributes and smart attribute quote escaping
			/*
				Format a dictionary of attributes into a string suitable
				for inserting into the start tag of an element.  Be smart
			   about escaping embedded quotes in the attribute values.
			*/
			function formatAttributes (attributes) {
				var APOS = "'";
				var QUOTE = '"';
				var ESCAPED_QUOTE = {  };
				ESCAPED_QUOTE[QUOTE] = '&quot;';
				ESCAPED_QUOTE[APOS] = '&apos;';
				var att_value;
				var apos_pos, quot_pos;
				var use_quote, escape, quote_to_escape;
				var att_str;
				var re;
				var result = '';
				for (var att in attributes) {
					att_value = attributes[att];
					// Find first quote marks if any
					apos_pos = att_value.indexOf(APOS);
					quot_pos = att_value.indexOf(QUOTE);
					// Determine which quote type to use around 
					// the attribute value
					if (apos_pos == -1 && quot_pos == -1) {
						att_str = ' ' + att + "='" + att_value +  "'";	//	use single quotes for attributes
						att_str = ' ' + att + '="' + att_value +  '"';	//	use double quotes for attributes
						result += att_str;
						continue;
					}
					// Prefer the single quote unless forced to use double
					if (quot_pos != -1 && quot_pos < apos_pos) {
						use_quote = APOS;
					}
					else {
						use_quote = QUOTE;
					}
					// Figure out which kind of quote to escape
					// Use nice dictionary instead of yucky if-else nests
					escape = ESCAPED_QUOTE[use_quote];
					// Escape only the right kind of quote
					re = new RegExp(use_quote,'g');
					att_str = ' ' + att + '=' + use_quote + 
						att_value.replace(re, escape) + use_quote;
					result += att_str;
				}
				return result;
			}

			function element (name,content,attributes) {
				var att_str = '';
				if (attributes) { // tests false if this arg is missing!
					att_str = formatAttributes(attributes);
				}
				var xml;
				if (!content){
					xml='<' + name + att_str + '/>';
				}
				else {
					xml='<' + name + att_str + '>' + content + '</'+name+'>';
				}
				return xml;
			}

			var xmlContent = '\n';
			var colors='\n';
			for(var i=0; i<this.__labelColors.length; i++)
			{
				var labelColor=this.__labelColors[i];
				colors+=element('color',null, {red : ""+labelColor.red,
												green: ""+labelColor.green,
												blue : ""+labelColor.blue,
												label : ""+labelColor.label,
												name : ""+labelColor.labelName});
			}
			xmlContent+=element('colors', colors)+"\n";

			var _this=this;
			this.__master.applyToViewers( function (sliceView) {
				var seedsLists=sliceView.getUserData(desk.segTools.seedsListsString);
				var orientation=sliceView.getOrientation();

				for (var seedsType=0; seedsType<2; seedsType++) {
					var list=seedsLists[seedsType];
					var filePrefix=desk.segTools.filePrefixes[seedsType];
					var slices=list.getChildren();
					for (var i=0;i<slices.length;i++)
					{
						var sliceId=slices[i].getUserData("slice");
						//~ theMaster.debug("352 : sliceId : " + sliceId);
						xmlContent += element(filePrefix,
								_this.__getSeedFileName(sliceView, sliceId, seedsType), 
								{slice: sliceId + "", orientation: orientation + ""}) + '\n';
					}
				}
			});

			var parameterMap={
				action : "save_xml_file",
				file_name : "seeds.xml",
				xmlData : element('seeds', xmlContent),
				output_directory : this.getSessionDirectory()};

			this.__fileBrowser.getActions().launchAction(parameterMap, callback);
		},

		__getSeedsTypeSelectBox : function()
		{
			var theMaster = this.__master;
			var volFile = this.__file;
			var fileBrowser = this.__fileBrowser;
			var selectBox = new qx.ui.form.SelectBox();

			var seedsItem = new qx.ui.form.ListItem("seeds");
			seedsItem.setUserData("seedsType", 0);
			selectBox.add(seedsItem);

			var correctionsItem = new qx.ui.form.ListItem("corrections");
			correctionsItem.setUserData("seedsType", 1);
			selectBox.add(correctionsItem);

			var _this=this;

			function updateSeedsListsVisibility (e) {
				var newSeedsType=selectBox.getSelection()[0].getUserData("seedsType");
				_this.setSeedsType(newSeedsType);
				_this.__master.applyToViewers(function ( sliceView ) {
					var seedsLists=sliceView.getUserData(desk.segTools.seedsListsString);
					seedsLists[newSeedsType].setVisibility("visible");
					seedsLists[1-newSeedsType].setVisibility("excluded");
					_this.__reloadSeedImage (sliceView);
					});
			}

			selectBox.addListener("changeSelection",updateSeedsListsVisibility);
			updateSeedsListsVisibility();
			return selectBox;
		},

		__getNewSeedsImage : function ( sliceView ) {
			if (sliceView.isDrawingCanvasModified()==true) {
				var canvas=sliceView.getDrawingCanvas();
				var seedsImageData=canvas.getContext2d().getImageData(0, 0, canvas.getWidth(), canvas.getHeight());
				var pixels = seedsImageData.data;
				var isAllBlack = true;

				var redArray=this.__compactLabelsRed;
				var greenArray=this.__compactLabelsGreen;
				var blueArray=this.__compactLabelsBlue;
				var numberOfColors=this.__compactLabelsRed.length;
				console.log(numberOfColors+" colors");
				var numberOfBytes=pixels.length
				for(var i=0; i<numberOfBytes; i+=4) {
					if(128<=pixels[i+3])  //  if( color is solid not totally transparent, ie. alpha=0) <-> if( not background )
					{
						var dRed = 0;
						var dGreen = 0;
						var dBlue = 0;
						var distance = 500000;
						var rightColorIndex = 0;

						for(var j=0; j!=numberOfColors; j++) {
							dRed = redArray[j]-pixels[i];
							dGreen = greenArray[j]-pixels[i+1];
							dBlue = blueArray[j]-pixels[i+2];
							var testD = dRed*dRed+dGreen*dGreen+dBlue*dBlue;
							if(testD<distance) {
								distance = testD;
								rightColorIndex = j;
							}
						}
						pixels[i] = redArray[rightColorIndex];
						pixels[i+1] = greenArray[rightColorIndex];
						pixels[i+2] = blueArray[rightColorIndex];
						pixels[i+3] = 255;
						isAllBlack = false;
					}
					////Comment "else" to send combined image
					else {
						pixels[i] = 0;
						pixels[i+1] = 0;
						pixels[i+2] = 0;
						pixels[i+3] = 0;
					}
				}

				if(!isAllBlack) {
					////Send png image to server
					seedsImageData.data = pixels;

					canvas.getContext2d().putImageData(seedsImageData, 0, 0);
					var pngImg = canvas.getContentElement().getCanvas().toDataURL("image/png");
					var saveData=pngImg.replace("image/png", "image/octet-stream");
					var commaIndex=pngImg.lastIndexOf(",");
					var base64Img = pngImg.substring(commaIndex+1,pngImg.length);
					return base64Img;
				}
			}
			return false;
		},

		__addSeedsListsToViews : function ( ) {
			var _this=this;
			this.__master.applyToViewers ( function (sliceView) {
				_this.__addSeedsLists ( sliceView );
			});
		},

		__addSeedsLists : function( sliceView ) {
			// create seeds list
			var seedsList=new qx.ui.form.List();
			seedsList.setWidth(30);
			seedsList.setScrollbarY("off");
			sliceView.add(seedsList);
			seedsList.setVisibility("excluded");

			// create corrections list
			var correctionsList=new qx.ui.form.List();
			correctionsList.setWidth(30);
			correctionsList.setScrollbarY("off");
			sliceView.add(correctionsList);
			correctionsList.setVisibility("excluded");

			var lists=[];
			lists.push(seedsList);
			lists.push(correctionsList);
			sliceView.setUserData(desk.segTools.seedsListsString, lists);

		/*	seedsList.addListener("removeItem", function(event) {
				if (seedsList.getChildren().length==0)
					this.__startSegmentationButton.setEnabled(false);
				}, this);

			seedsList.addListener("addItem", function(event) {
				this.__startSegmentationButton.setEnabled(true);
				}, this);*/

			function keyPressHandler (event) {
				if(event.getKeyIdentifier()=="Delete") {
					var seedsType = this.getSeedsType();
					var list=lists[seedsType];
					var selectedChild = list.getSelection()[0];
					if (selectedChild!=null) {
						var sliceId = selectedChild.getUserData("slice");

						////Erase image on the server
						this.__fileBrowser.getActions().launchAction({action : "delete_file",
										"file_name" : this.getSessionDirectory()+"/"+
										this.__getSeedFileName(sliceView, sliceId, seedsType)});
						list.getUserData("seedsArray")[sliceId]=0;
						list.remove(selectedChild);
						this.__reloadSeedImage( sliceView );
						this.__saveSeedsXML();
					}
				}
			}

			seedsList.addListener("keypress", keyPressHandler, this);
			correctionsList.addListener("keypress", keyPressHandler, this);

			this.addListener("close", function (e) {
				sliceView.remove(seedsList);
				sliceView.remove(correctionsList);
			});
		},

		__clearSeeds : function ( ) {
			var master=this.__master;
			this.__master.applyToViewers ( function (sliceView) {
				sliceView.setUserData("previousSlice", sliceView.getSlice());
				var seedsLists=sliceView.getUserData(desk.segTools.seedsListsString);
				for (var i=0;i<2;i++) {
					var numberOfSlices=sliceView.getVolumeSliceToPaint().getNumberOfSlices();
					var seedsArray = [];
					var cacheTagsArray = [];
					for (var j=0;j!=numberOfSlices;j++)
					{
						seedsArray[j]=0;
						cacheTagsArray[j]=Math.random();
					}
					seedsLists[i].removeAll();
					seedsLists[i].setUserData(desk.segTools.seedsArrayString, seedsArray);
					seedsLists[i].setUserData(desk.segTools.cacheTagsArrayString, cacheTagsArray);
				}
			});
		},

		__addNewSeedItemToList : function ( sliceView, sliceId, seedsType )
		{
			var seedsList = sliceView.getUserData(desk.segTools.seedsListsString)[seedsType];
			var seeds = seedsList.getChildren();
			var tempPos = 0;

			for(var i=0; i<seeds.length; i++)
			{
				var currentId=seeds[i].getUserData("slice");
				if(currentId>sliceId) {
					tempPos++;
				}
				if (currentId==sliceId) {
					seedsList.getUserData(desk.segTools.cacheTagsArrayString)[sliceId]=Math.random();
					return;
				}
			}

			var sliceItem = new qx.ui.form.ListItem(""+ sliceId);
			sliceItem.setUserData("slice",sliceId);
			sliceItem.addListener("click", function(event) {
				sliceView.setSlice(event.getTarget().getUserData("slice"));
			});

			seedsList.addAt(sliceItem, tempPos);
			seedsList.getUserData(desk.segTools.seedsArrayString)[sliceId]=sliceItem;
			seedsList.getUserData(desk.segTools.cacheTagsArrayString)[sliceId]=Math.random();
		},

		__getSeedFileName : function(sliceView, sliceId, seedType) {			
			var filePrefix;
			if (seedType==0) {
				filePrefix = "seed";
			}
			else {
				filePrefix = "correction";
			}

			var offset=sliceView.getVolumeSliceToPaint().getSlicesIdOffset();

			switch(sliceView.getOrientation())
			{
				// ZY X
				case 1 :
					return filePrefix +"ZY"+(offset + sliceId) +".png";
					break;
				// XZ Y
				case 2 :
					return filePrefix +"XZ"+(offset + sliceId) +".png";
					break;
				// XY Z
				default :
					return filePrefix +"XY"+(offset + sliceId) +".png";
			}
		}
/*
		__createLabelsList : function () {
			var list;
			var currentListItem;
			var myWindow=new qx.ui.window.Window();

			myWindow.setLayout(new qx.ui.layout.VBox());
			myWindow.set({
									width : 400,
									showMinimize: false,
									showMaximize: false,
									allowMaximize: false,
									showClose: true,
									resizable: false,
									movable : true
								});
	
		//	var labelBoth = new qx.ui.basic.Label("Reorderable");
		//	myWindow.add(labelBoth);

			var both = list = new qx.ui.form.List;
			both.setDraggable(true);
			both.setDroppable(true);
			both.setSelectionMode("multi");
			myWindow.add(both);

			for (var i=0; i<20; i++) {
				var item=new qx.ui.form.ListItem("Item " + i, "icon/16/places/folder.png");
				item.setHeight(40);
				item.setWidth(200);
				item.setBackgroundColor(qx.util.ColorUtil.rgbToHexString([i*10, i*10, i*10]));
				both.add(item);
			}


			// Create drag indicator
			var indicator = new qx.ui.core.Widget;
			indicator.setDecorator(new qx.ui.decoration.Single().set({
				top : [ 1, "solid", "#33508D" ]
			}));
			indicator.setHeight(0);
			indicator.setOpacity(0.5);
			indicator.setZIndex(100);
			indicator.setLayoutProperties({left: -1000, top: -1000});
			indicator.setDroppable(true);
	//		this.getRoot().add(indicator);
	//		qx.core.Init.getApplication().getRoot().add(indicator);
			myWindow.add(indicator);


			// Just add a move action
			both.addListener("dragstart", function(e) {
				e.addAction("move");
			});

			both.addListener("dragend", function(e)
			{
				// Move indicator away
				indicator.setDomPosition(-1000, -1000);
			});


			both.addListener("drag", function(e)
			{
				var orig = e.getOriginalTarget();

				// store the current listitem - if the user drops on the indicator
				// we can use this item instead of calculating the position of the
				// indicator
				if (orig instanceof qx.ui.form.ListItem) {
					currentListItem = orig;
				}
		//		console.log(orig);
				if (!qx.ui.core.Widget.contains(myWindow, orig) && orig != indicator) {
					return;
				}

				var origCoords2 = both.getContainerLocation();
				var origCoords = orig.getContainerLocation();

				indicator.setWidth(orig.getBounds().width);
//				indicator.setDomPosition(origCoords.left,
//							 origCoords.top);
				indicator.setDomPosition(origCoords.left-origCoords2.left,
							 origCoords.top-origCoords2.top);
		//		console.log(origCoords.left+" "+origCoords.top);
		//		console.log(origCoords2.left+" "+origCoords2.top);
			});

			both.addListener("dragover", function(e)
			{
				// Stop when the dragging comes from outside
				if (e.getRelatedTarget()) {
					e.preventDefault();
				}
			});

			both.addListener("drop", function(e) {
				reorderList(e.getOriginalTarget());
			});

			indicator.addListener("drop", function(e) {
				reorderList(currentListItem);
				});

			function reorderList (listItem)
			{

				// Only continue if the target is a list item.
				if (listItem.classname != "qx.ui.form.ListItem") {
					return ;
				}

				var sel = list.getSortedSelection();

				for (var i=0, l=sel.length; i<l; i++)
				{
					list.addBefore(sel[i], listItem);

				// recover selection as it get lost during child move
					list.addToSelection(sel[i]);
				}
			}
			myWindow.open();
		}*/

	} //// END of   members :

}); //// END of   qx.Class.define("desk.segTools",

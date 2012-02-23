qx.Class.define("desk.segTools",
{
  extend : qx.ui.window.Window,

	construct : function(volumeMaster, globalFile, globalFileBrowser)
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
		
		this.__tools = this;
		
		this.__master = volumeMaster;
		
		this.__file = globalFile;
		
		this.__fileBrowser = globalFileBrowser;
		
		
		
	//// Set window
		this.setLayout(new qx.ui.layout.Canvas());
		this.set({
								showMinimize: false,
								showMaximize: false,
								allowMaximize: false,
								showClose: true,
								resizable: false,
								movable : true
							});
		this.addListener("close", function(event)
		{
this.debug("42 : >>>>>>>   this.addListener(close, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
			for(var i=0; i<this.__master.__viewers.length; i++)
			{
				var children = this.__master.__viewers[i].__topLeftContainer.getChildren(); //~ CAUTION ! ---> This only works if the "Paint" toggle button is the last child
				children[children.length-1].setValue(false);
				if(this.__seedsTypeSelectBox!=null)
				{
					var list = this.__seedsTypeSelectBox.getSelection()[0].getUserData("seedsList")[this.__master.__viewers[i].getUserData("viewerIndex")];
					list.setVisibility("excluded");
				}
			}
		}, this);
		
		this.__curView = this.__master.__viewers[0];
		
	//// Fill window with the tools widgets
		this.__buildRightContainer();
		
	//// Return the tools window aka : this
		return (this);

	},

	events : {
	},

	properties : {
		sessionDirectory : { init : null, event : "changeSessionDirectory"}
	},

	members :
	{
		__tools : null,
		
		__master : null,
		
		__file : null,
		
		__fileBrowser : null,
		
		
		
		__mainRightContainer : null,
		__topRightContainer : null,
		__bottomRightContainer : null,
		__mainBottomRightContainer : null,
		
		
		__curView : null, // en attendant...
		
		/*
		__slider : null,
		__spinner : null,
		__formatSelectBox : null,
		__orientationSelect : null,

		__segmentationInProgress : false,
		__startSegmentationButton : null,
		__extractMeshesButton : null,

		// the main tabview
		__tabView : null,

		__currentSeedsModified : false,
		*/
		
		
		__seedsTypeSelectBox : null,
		
		
		/*
		__hasCorrectionSeeds : false,

		__mouseActionMode : 0,
		__mouseActionActive : false,

// Données pour la position de l'objet window qui contient l'interface
//(position par rapport au document <-> fenêtre de l'explorateur)
// La largeur et la hauteur sont des valeurs par défaut. Si les widgets
//dans la fenêtre ont besoin de plus d'espace, la fenêtre s'élargit
// d'elle-même...normalement...
		__winMap : null,

// Variable pour le canvas HTMLCanvasElement des seeds (utilisé pour les calculs
// en arrière plan: changement de slide, zoom, annuler<-click droit)
		__htmlCanvasLabels : null,

// Variable pour le contexte associé au canvas précédent
		__htmlContextLabels : null,

// Données globales pour le canvas qx.html.Canvas des seeds (utilisé pour l'affichage)
         __drawingCanvasParams : null,

// Variable pour le canvas HTMLCanvasElement des images (utilisé pour les calculs en arrière plan:
// changement de slide, zoom, annuler<-click droit)
         __htmlCanvasImage : null,

// Variable pour le contexte du canvas précédent
         __htmlContextImage : null,
		 
// Données globales pour le canvas qx.html.Canvas des images (utilisé pour l'affichage)
         __imgCanvasParams : null,

         __horizSlices : null,

// Tableau contenant la pile de canvas permettant de faire "annuler" avec click droit
         __ctrlZData : null,

// Taille de la pile "annuler"
         __undoLimit : 10,

// Données globales associées à la souris (position et evenements)
         __mouseData : null,
         */

// Tableau contenant les couleurs des seeds
         __labelColors : null,
		
		/*
         __imageZ : 1,     // Indice de position en z du canvas image (tout au fond)

         __MaxZoom : 8,     //Limite du zoom : x4
         __timestamp : 0,     //Valeur calculée pour différencier les images dans le caché de l'explorateur
         */
         
         __eraserCoeff : 2,     //Taille gomme  =  eraserCoeff * taille crayon --> c'est plus agréable d'effacer comme ça
         
        /*
         __numberOfSlices : 0,     //Contient le nombre de slides récuperé à partir du fichier xml (le programme est fait pour  numberOfSlices = "z")

         __slicesNameOffset : 0,     //Contient la valeur de l'offset récuperé à partir du fichier xml
         */
         
         __eraserCursorZ : 123000000,     //Indice de position en z du widget qui représente la gomme (toujours devant)
         
        /*
         __drawingCanvasZ : 1023,     //Indice de position en z du canvas dessin (devant l'image, derrière la gomme)
         __slicesNamePrefix : null,     //Contient la chaîne de charactéres du prefix récuperée à partir du fichier xml lors d'un appui sur la touche "s"
         __drawingSKeyOpacity : 0,     //Opacité à appliquer au canvas de dessin dans la zone image lors d'un appui sur la touche "s"

//Variable pour le canvas HTMLCanvasElement des seeds utilisés pour la segmentation la plus récente
         __htmlContextUsedSeeds : null,

//Variable pour le canvas HTMLCanvasElement des image resultat de la segmentation
         __htmlCanvasUsedSeeds : null,

		// the path containing jpg slices
		__pathJPG : null,

		__embedObjectImage : null,
		__embedObjectLabels : null,
		__embedObjectUsedSeeds : null,


		// the image pixels after brightness/contrast processing
		__pixels : null,

		// the imageData after brightness/contrast processing
		__imageData : null,
		*/
		
		__penSize : null,
		__eraserButton : null,
		__eraserCursor : null,
		
		/*
		__colorsContainer : null,
		__brghtnssCntrstButton : null,
		__wheelScale : null,
		__updateContext : null,
		__mouseDownHandler : null,
		__mouseWheelHandler : null,
		__mouseMoveHandler : null,
		__mouseUpHandler : null,
		__mouseOverHandler : null,

		// the image used to load volume slices
		__loadImage : null,

		__loadSeeds : null,

		__currentSeedsSlice : null,

		// volume extent (VTK style)
		__extent : null,

		// volume dimensions in 3 directions
		__dimensions : null,

		// volume spacing in 3 directions
		__spacing  : null,

		// volume origin
		__origin : null,

		// size of data (in bytes)
		__scalarSize : 1,

		// scalar type, as defined by VTK
		__scalarType : null,

		// minimal scalar value in the volume
		__scalarMin : null,

		// maximal scalar value in the volume
		__scalarMax : null,

		// display size scale
		__scale : null,
		*/
		
		// width of the panel measured manually during debug
		//~ __rightPanelWidth : 405 + 16 + 4,
		__rightPanelWidth : 405,
		
		/*
		// border used to make visible the bounds of the image
		__imageBorder : 3,
		
		// display size scale
		__scaledWidth : null,

		// display size scale
		__scaledHeight : null,

		// space coordinates of the center of the volume
		__centerVolPos : null,
		
		// the display canvas used for the drawings
		__drawingCanvas : null,

		// the function which draws the canvas
		__drawZoomedCanvas : null,
		*/
		
		__settingButtons : false,
		
		
		
		__buildRightContainer : function()
		{
this.debug("------->>>   tools.__buildRightContainer : function()   !!!!!!!");
			
			var tools = this;
			
			var theMaster = tools.__master;
			
			var volFile = tools.__file;
			
			var fileBrowser = tools.__fileBrowser;
			
			
			var spacing=5;
			var mRCL=new qx.ui.layout.VBox();
			mRCL.setSpacing(spacing);
			tools.__mainRightContainer = new qx.ui.container.Composite(mRCL);
			tools.add(tools.__mainRightContainer); //~ winSeparate test
			tools.__mainRightContainer.setVisibility("excluded");
			tools.__mainRightContainer.set({width : tools.__rightPanelWidth}); // try same width befor and after
			
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
                value: tools.__curView.__drawingCanvasParams.myLineWidth
            });
			
            tools.__penSize.addListener("changeValue", function(event)
			{
//~ tools.debug("319 : >>>>>>>   tools.__penSize.addListener(changeValue, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				for(var i=0; i<theMaster.__viewers.length; i++)
					theMaster.__viewers[i].__htmlContextLabels.lineWidth = event.getData()*Math.sqrt(theMaster.__viewers[i].__scale[0]*theMaster.__viewers[i].__scale[1]);
				tools.__eraserCursor.set({width: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*tools.__curView.__display.curCtxtZoom/tools.__curView.__scale[0]+1),
											height: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*tools.__curView.__display.curCtxtZoom/tools.__curView.__scale[1]+1)});
            });
            
			tools.__penSize.addListener("mouseout", function(event)
			{
//~ tools.debug("328 : >>>>>>>   tools.__penSize.addListener(mouseout, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				//~ tools.__penSize.releaseCapture();
				
				if(tools.__curView.__drawingCanvas != null)
						tools.__curView.__drawingCanvas.resetCursor();
				if(tools.__eraserCursor != null)
						tools.__eraserCursor.resetCursor();
			}, this);
			
			var penLabel = new qx.ui.basic.Label("Brush : ");
			
			tools.__topRightContainer.add(penLabel);
			tools.__topRightContainer.add(tools.__penSize);
			
//~ tools.debug("328 :  tools.__curView.__penSize = tools.__penSize; !!!!!!!!!!!!!!!!!!!!!!!!!");
			//~ tools.__curView.__penSize = tools.__penSize;
			

		////Create eraser
            var eraserBorder = new qx.ui.decoration.Single(1, "solid", "black");
			
            tools.__eraserCursor = new qx.ui.core.Widget().set({
										backgroundColor: "white",
										decorator: eraserBorder,
										width: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*tools.__curView.__display.curCtxtZoom+1),
										height : Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*tools.__curView.__display.curCtxtZoom+1),
										zIndex : tools.__eraserCursorZ
									});
			
            tools.__eraserCursor.addListener("mousedown", function(event)
			{
//~ tools.debug("359 : >>>>>>>   tools.__eraserCursor.addListener(mousedown, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				tools.__eraserCursor.capture();
				
				if(tools.__curView.__imageCanvas != null)
					tools.__curView.__imageCanvas.resetCursor();
				if(tools.__curView.__drawingCanvas != null)
						tools.__curView.__drawingCanvas.resetCursor();
				if(tools.__eraserCursor != null)
						tools.__eraserCursor.resetCursor();
						
				tools.__curView.__mouseActionActive = true;
            ////Erase
				if((event.isLeftPressed())&&(tools.__curView.__mouseActionMode==4))
                {
					tools.__curView.__getPosition(event,true);
					tools.__curView.__save2undoStack(event);
					tools.__curView.__eraseFnct();
                    tools.__curView.__mouseData.mouseLeftDownFlag = true;	// Activate erasing while moving
                }
			////Activate moving
                if(event.isMiddlePressed())
                {
					tools.__curView.__getPosition(event,true);
					if(tools.__eraserCursor != null)
							tools.__eraserCursor.set({cursor: "move"});
                    tools.__curView.__mouseData.mouseMiddleDownFlag = true;
					tools.__curView.__mouseData.recentX = tools.__curView.__display.onDispMouseHrzPos;
					tools.__curView.__mouseData.recentY = tools.__curView.__display.onDispMouseVrtPos;
                 }
			////"Undo" (draw previous canvas)
				tools.__curView.__undoFnct(event);
            });
			
            tools.__eraserCursor.addListener("mousemove", function(event)
			{
//~ tools.debug("394 : >>>>>>>   tools.__eraserCursor.addListener(mousemove, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				//~ tools.__eraserCursor.capture();
				tools.__curView.__getPosition(event,false);	// No scaling so coordinates are compatible with placeEraser function
                var tempMargin = 4/tools.__curView.__display.curCtxtZoom;
                var leftLimit = tempMargin;
                var rightLimit = tools.__curView.__scaledWidth/tools.__curView.__display.curCtxtZoom-tempMargin;
                var topLimit = tempMargin;
                var bottomLimit = tools.__curView.__scaledHeight/tools.__curView.__display.curCtxtZoom-tempMargin;
			////Hide eraser if out of drawing zone
                if(!((leftLimit<=tools.__curView.__display.onDispMouseHrzPos)&&(tools.__curView.__display.onDispMouseHrzPos<=rightLimit)&&(topLimit<=tools.__curView.__display.onDispMouseVrtPos)&&(tools.__curView.__display.onDispMouseVrtPos<=bottomLimit)))
                {
		//~ tools.debug("405 : Hide eraser if out of drawing zone !");
                    if(tools.__eraserCursor.getVisibility()=="visible")
					{
			//~ tools.debug("396 : tools.__eraserCursor.exclude(); !");
                        tools.__eraserCursor.exclude();
						//~ tools.__curView.__imageCanvas.remove(tools.__eraserCursor);
					}
                }
			////Move eraser to mouse position
				var canvasLocation = tools.__curView.__imageCanvas.getContentLocation();
                tools.__eraserCursor.set({marginLeft: Math.round(canvasLocation.left+(tools.__curView.__display.onDispMouseHrzPos-tools.__eraserCoeff*tools.__penSize.getValue()/(2*tools.__curView.__scale[0]))*tools.__curView.__display.curCtxtZoom),
										marginTop: Math.round(canvasLocation.top+(tools.__curView.__display.onDispMouseVrtPos-tools.__eraserCoeff*tools.__penSize.getValue()/(2*tools.__curView.__scale[1]))*tools.__curView.__display.curCtxtZoom)});
				tools.__curView.__display.onDispMouseHrzPos = tools.__curView.__display.hrzntlShift/tools.__curView.__display.curCtxtZoom + tools.__curView.__display.onDispMouseHrzPos;
                tools.__curView.__display.onDispMouseVrtPos = tools.__curView.__display.vrtclShift/tools.__curView.__display.curCtxtZoom + tools.__curView.__display.onDispMouseVrtPos;
				if((tools.__curView.__mouseData.mouseLeftDownFlag)&&(tools.__curView.__mouseActionMode==4))
				{
					tools.__curView.__eraseFnct(true);
                }
                if(tools.__curView.__mouseData.mouseMiddleDownFlag)
                {
					tools.__curView.__moveCanvas();
                }
            },this);
            
            tools.__eraserCursor.addListener("mouseup", function(event)
			{
//~ tools.debug("431 : >>>>>>>   tools.__eraserCursor.addListener(mouseup, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
                tools.__curView.__mouseData.mouseMiddleDownFlag = false;
                tools.__curView.__mouseData.mouseLeftDownFlag = false;
                tools.__curView.__mouseActionActive = false;
				if(tools.__curView.__drawingCanvas != null)
					tools.__curView.__drawingCanvas.resetCursor();
				if(tools.__eraserCursor != null)
					tools.__eraserCursor.resetCursor();
				tools.__eraserCursor.releaseCapture(); // ONLY IF CAPTURING JUST  __eraseFnct()  OR  __moveCanvas() !!!!!!!
            },this);
			
			tools.__eraserCursor.addListener("mouseover", function(event)
			{
//~ tools.debug("444 : >>>>>>>   tools.__eraserCursor.addListener(mouseover, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				//~ tools.__eraserCursor.capture();
				if((tools.__curView.__mouseData.mouseLeftDownFlag)&&(tools.__curView.__mouseActionMode==4))
					tools.__curView.__eraseFnct(true);
					
				//~ if(tools.__curView.__drawingCanvas != null)
					//~ tools.__curView.__drawingCanvas.resetCursor();
				//~ if(tools.__eraserCursor != null)
					//~ tools.__eraserCursor.resetCursor();
			}, this);
			
			
			tools.__eraserCursor.addListener("mouseout", function(event)
			{
//~ tools.debug("458 : >>>>>>>   tools.__eraserCursor.addListener(mouseout, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if((tools.__curView.__mouseData.mouseLeftDownFlag)&&(tools.__curView.__mouseActionMode==4))
					tools.__curView.__eraseFnct(true);
			}, this);
			
			
	//~ tools.debug("tools.__eraserCursor.addListener(mousewheel, tools.__curView.__mouseWheelHandler, this); !");
			//~ tools.__eraserCursor.addListener("mousewheel", tools.__curView.__mouseWheelHandler, this);
			// go see  segTools  Line: 841 : tools.addListenerOnce("appear", function(event))

			tools.getLayoutParent().add(tools.__eraserCursor);
			
			tools.__eraserCursor.resetCursor();
			
            tools.__eraserCursor.exclude();

			
			
			
		////Create eraser on/off button
            tools.__eraserButton = new qx.ui.form.ToggleButton("Eraser");
			
			tools.__eraserButton.addListener("changeValue", function(event)
			{
//~ tools.debug("482 : >>>>>>>   tools.__eraserButton.addListener(changeValue, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				for(var i=0; i<theMaster.__viewers.length; i++)
				{
					//~ if((event.getData()==true)&&(!theMaster.__viewers[i].__isSegWindow))
					if(event.getData()==true)
					{
						//~ tools.__eraserCursor.capture();
						theMaster.__viewers[i].__setMouseActionMode(4);
					}
					else
						theMaster.__viewers[i].__setMouseActionMode(0);

					theMaster.__viewers[i].__htmlContextLabels.beginPath();
					theMaster.__viewers[i].__mouseData.mouseLeftDownFlag = false;
				}
            });
			
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

			//~ /*
			var sessionWdgt = tools.__getSessionsWidget(); //~ resizing
			//~ sessionWdgt.setHeight(tools.__curView.__mainLeftContainer.getChildren()[0].getBounds().height); //~ resizing
			//~ tools.__mainRightContainer.add(tools.__getSessionsWidget());
			tools.__mainRightContainer.add(sessionWdgt); //~ resizing
			// go see 
			//~ */
			
			tools.__mainRightContainer.add(tools.__mainBottomRightContainer, {flex : 1}); //~ resizing

			//~ tools.__mainRightContainer.add(tabView);
			tools.__mainBottomRightContainer.add(tabView); //~ resizing
			
		////Function creates one label box
			var unfocusedBorder = new qx.ui.decoration.Single(2, "solid", "black");
            var focusedBorder = new qx.ui.decoration.Single(3, "solid", "red");
			var boxWidth = 37;
			var columnLimit = 4;
			var colorCount = 4;
			var nbLines = 1;
			var createToolBox = function(inLabel)
            {
tools.debug("545: >>>>>>>   createToolBox = function(inLabel)   !!!!!!!!!!!!!!!!!!!!!!!!!");
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
					backgroundColor: inLabel.color
                });
				labelBox.addListener("click", function()
				{
//~ tools.debug("566 : >>>>>>>   labelBox.addListener(click, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
					for(var i=0; i<theMaster.__viewers.length; i++)
					{
						theMaster.__viewers[i].__drawingCanvasParams.paintFlag = true;
						theMaster.__viewers[i].__setMouseActionMode(3);
					}
					var j = 0;
					var children = tools.__colorsContainer.getChildren();
					while(children[j]!=this)
					{
						j++;
					}
					if(!((children[j].getBackgroundColor()=="white")&&(tools.__curView.__mouseActionMode!=4)))
					{
						children[j].set({decorator: focusedBorder, backgroundColor: "white"});
						for(var k=0; k<nbLabels; k++)
						{
							if(k!=j)
							{
								children[k].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
							}
						}
					}
				////Comment to desactivate color on/off on click
					else
					{
						children[j].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
						for(var i=0; i<theMaster.__viewers.length; i++)
						{
							theMaster.__viewers[i].__drawingCanvasParams.paintFlag = false;
							theMaster.__viewers[i].__setMouseActionMode(0);
						}
					}
					for(var i=0; i<theMaster.__viewers.length; i++)
						theMaster.__viewers[i].__drawingCanvasParams.currentColor = colorBox.getBackgroundColor();
					tools.__colorsContainer.set({opacity: 1});
                });
				var boxLabel = new qx.ui.basic.Label("\\" + inLabel.id + " : " + inLabel.name).set({alignX:"left"});
				labelBox.add(boxLabel);
				labelBox.add(colorBox);
				if(inLabel.id<=colorCount)
				{
					tools.__colorsContainer.add(labelBox, {column: inLabel.id-(nbLines-1)*columnLimit, row: (nbLines-1)});
				}
				else
				{
					nbLines++;
					tools.__colorsContainer.add(labelBox, {column: inLabel.id-(nbLines-1)*columnLimit, row: (nbLines-1)});
					colorCount += columnLimit;
				}
				var tempColors = tools.__colorsContainer._getChildren();
				if((boxWidth<boxLabel.getSizeHint().width+8)&&(0<tempColors.length))
				{
					boxWidth = boxLabel.getSizeHint().width + 16;	//// value returned by getSizeHint() is not enough
					for(var i=0; i<tempColors.length; i++)
					{
						tempColors[i].set({width:boxWidth});
						tempColors[i]._getChildren()[1].set({maxWidth:boxWidth-12});
					}
				}
            };
			
		////Fill labels zone width data from the xml file
			var nbLabels = 0;
			var colorsParamRequest = new XMLHttpRequest();
			colorsParamRequest.onreadystatechange = function()
			{
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(this.responseXML!=null)
					{
						var response = this.responseXML;
tools.debug("639 : colorsParamRequest -> response : " + response);
						nbLabels = response.getElementsByTagName("color").length;
						tools.__labelColors=new Array(nbLabels);
						for(var i=0; i<nbLabels; i++)
						{
							var color=response.getElementsByTagName("color")[i];
							var label=parseInt(color.getAttribute("label"),10)
							var colorName=color.getAttribute("name");
							tools.__labelColors[i] = {
								red : color.getAttribute("red"),
								green : color.getAttribute("green"),
								blue : color.getAttribute("blue"),
								label : ""+label,
								name : colorName
							};
							var newLabel = {
								id : label,
								name : colorName,
								color : "rgb(" + tools.__labelColors[i].red + "," + tools.__labelColors[i].green + "," + tools.__labelColors[i].blue + ")"
							};
							newLabel.name = newLabel.name.replace(newLabel.name.charAt(0), newLabel.name.charAt(0).toUpperCase());
							createToolBox(newLabel);
						}
						
						for(var i=0; i<theMaster.__viewers.length; i++)
						{
							theMaster.__viewers[i].__labelColorsReds = new Uint8Array(256);
							theMaster.__viewers[i].__labelColorsGreens = new Uint8Array(256);
							theMaster.__viewers[i].__labelColorsBlues = new Uint8Array(256);
							for(var j=0; j<tools.__labelColors.length; j++)
							{
								theMaster.__viewers[i].__labelColorsReds[j] = tools.__labelColors[j].red;
								theMaster.__viewers[i].__labelColorsGreens[j] = tools.__labelColors[j].green;
								theMaster.__viewers[i].__labelColorsBlues[j] = tools.__labelColors[j].blue;
							}
						}
						
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
			colorsParamRequest.open("GET", "/visu/colors7.xml?nocache="+Math.random(), true);
			colorsParamRequest.send(null);

			//~ tools.__seedsTypeSelectBox = tools.__getSeedsTypeSelectBox();
			//~ paintPage.addAt(tools.__seedsTypeSelectBox,0);
			// go see segTools  Line : 750 (appear event)

			
			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("Opacity :");
			tools.__topRightContainer.add(whileDrawingDrwngOpacityLabel);
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
			whileDrawingDrwngOpacitySlider.setValue(100);
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
//~ tools.debug("703 : >>>>>>>   whileDrawingDrwngOpacitySlider.addListener(changeValue, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				for(var i=0; i<theMaster.__viewers.length; i++)
					theMaster.__viewers[i].__drawingCanvas.set({opacity: event.getData()/100});
			},this);
            tools.__topRightContainer.add(whileDrawingDrwngOpacitySlider, {flex : 1});

			paintPage.add(tools.__bottomRightContainer);

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
//			meshingAction.connect("input_volume", 
//										medianFilteringAction, "output.mhd");
			meshingAction.buildUI();
			meshingPage.add(meshingAction);

			var mRCgSH_height = tabView.getLayoutParent().getLayoutParent().getSizeHint().height;
			var debugManualMeasureH = 80;
			tools.__mainRightContainer.setMinHeight(tabView.getSizeHint().height + mRCgSH_height + debugManualMeasureH);

			tools.addListener("changeSessionDirectory", function (e)
			{
//~ tools.debug("763 : >>>>>>>   tools.addListener(changeSessionDirectory, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
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
					"seeds" : tools.getSessionDirectory()+"/seeds.xml",
					"adjacencies" : adjacenciesXMLFileName});
				clusteringAction.setActionParameters({
					"input_volume" : volFile});
				meshingAction.setActionParameters({
					"input_volume" : tools.getSessionDirectory()+"/filtering/output.mhd"});
			});

			tools.__startSegmentationButton=new qx.ui.form.Button("Start segmentation");
			tools.__startSegmentationButton.addListener("execute", function ()
			{
//~ tools.debug("786 : >>>>>>>   tools.__startSegmentationButton.addListener(execute, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				tools.__startSegmentationButton.setEnabled(false);
				tools.__segmentationInProgress=true;
				for(var i=0; i<theMaster.__viewers.length; i++)
				{
					theMaster.__viewers[i].__saveCurrentSeeds();
				}
				tools.__curView.__saveCurrentSeeds(function() {
							medianFilteringAction.executeAction();}, null);
			}, this);
			tools.__bottomRightContainer.add(tools.__startSegmentationButton);

			var meshingButton=new qx.ui.form.Button("extract meshes");
			tools.__extractMeshesButton=meshingButton;
			meshingButton.addListener("execute", function () {
//~ tools.debug("801 : >>>>>>>   meshingButton.addListener(execute, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				tools.__startSegmentationButton.setEnabled(false);
				meshingButton.setEnabled(false);
				meshingAction.executeAction();
				}, this);
			tools.__bottomRightContainer.add(meshingButton);

			var segmentationViewer=null;
			medianFilteringAction.addListener("actionUpdated", function ()
			{
//~ tools.debug("811 : >>>>>>>   medianFilteringAction.addListener(actionUpdated, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				tools.__startSegmentationButton.setEnabled(true);
				if (segmentationViewer==null)
				{
	//~ tools.debug("815 : segmentationViewer=new desk.volView__classTest...............................");
					segmentationViewer=new desk.volView__classTest(theMaster,
											medianFilteringAction.getOutputDirectory()+"/output.mhd",
											fileBrowser,tools.__curView.__display.orientation);
					//~ segmentationViewer=new desk.volView(
											//~ medianFilteringAction.getOutputDirectory()+"/output.mhd",
											//~ fileBrowser);
			//~ segmentationViewer.linkToVolumeViewer(tools.__curView); //~ later...
					segmentationViewer.getWindow().addListener("beforeClose", function (e) {
tools.debug("824 : >>>>>>>   segmentationViewer.getWindow().addListener(beforeClose, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
							segmentationViewer=null;});
				}
				else
				{
					segmentationViewer.__updateVolume();
				}
				//~ segmentationViewer.__isSegWindow = true; //~ segColor test
			}, this);

			meshingAction.addListener("actionUpdated", function ()
			{
//~ tools.debug("836 : >>>>>>>  meshingAction.addListener(actionUpdated, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				meshingButton.setEnabled(true);
				tools.__startSegmentationButton.setEnabled(true);
				var meshesViewer=new desk.meshView(tools.getSessionDirectory()+"/meshes/meshes.xml",
								fileBrowser);
			}, this);
			
			//~ theMaster.__resetSeedsList(); //~ later // go see volMaster Line : 1077
			
			tools.addListenerOnce("appear", function(event)
			{
tools.debug("847 : >>>>>>>  tools.addListener(appear, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				tools.setCaption("Tools -- " + tools.__curView.getCaption());
				
				if(tools.__seedsTypeSelectBox==null)
				{
					tools.__seedsTypeSelectBox = tools.__getSeedsTypeSelectBox();
					paintPage.addAt(tools.__seedsTypeSelectBox,0);
					// from  segTools  Line : 609
				}
				
				//~ tools.debug("857 : tools.__eraserCursor.addListener(mousewheel, tools.__curView.__mouseWheelHandler, tools.__eraserCursor); !");
				if(!tools.__curView.__isSegWindow)
					tools.__eraserCursor.addListener("mousewheel", tools.__curView.__mouseWheelHandler, tools.__eraserCursor);
				// from  segTools  Line: 430
				
			}, this);
           
		},
		
		__getPaintPanelVisibilitySwitch : function ()
		{
this.debug("------->>>   tools.__getPaintPanelVisibilitySwitch : function()   !!!!!!!");
			
			var tools = this;
			
			var theMaster = tools.__master;
			
			var volFile = tools.__file;
			
			var fileBrowser = tools.__fileBrowser;
			
			
			var paintPaneVisibilitySwitch=new qx.ui.form.ToggleButton("Paint");
			
			paintPaneVisibilitySwitch.addListener("changeValue", function (e)
			{
//~ tools.debug("883 : >>>>>>>  paintPaneVisibilitySwitch.addListener(changeValue, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if(!tools.__settingButtons)
				{
					tools.__settingButtons = true;
					if (e.getData())
					{
						tools.__mainRightContainer.setVisibility("visible");
						
						if(tools.__seedsTypeSelectBox!=null) // go see :  selectBox.addListenerOnce("appear", function(event)
							for(var i=0; i<theMaster.__viewers.length; i++)
							{
								var list = tools.__seedsTypeSelectBox.getSelection()[0].getUserData("seedsList")[theMaster.__viewers[i].getUserData("viewerIndex")];
								list.setVisibility("visible");
							}
						
						tools.open(); //~ winSeparate test
						tools.moveTo(tools.__curView.getBounds().left + tools.__curView.getBounds().width + 5 + 35, tools.__curView.getBounds().top); //~ winSeparate test
					
						theMaster.__updateAll();
					}
					else
					{
						tools.__mainRightContainer.setVisibility("excluded");
						
						if(tools.__seedsTypeSelectBox!=null) // go see :  selectBox.addListenerOnce("appear", function(event)
							for(var i=0; i<theMaster.__viewers.length; i++)
							{
								var list = tools.__seedsTypeSelectBox.getSelection()[0].getUserData("seedsList")[theMaster.__viewers[i].getUserData("viewerIndex")];
								list.setVisibility("excluded");
								theMaster.__viewers[i].__drawingCanvasParams.drawingContext.clearRect(-16, -16, theMaster.__viewers[i].__dimensions[0]*theMaster.__viewers[i].__scaledWidth+32, theMaster.__viewers[i].__dimensions[1]*theMaster.__viewers[i].__scaledHeight+32);
							}
						
						tools.close(); //~ winSeparate test
					}
					for(var i=0; i<theMaster.__viewers.length; i++)
					{
						var children = theMaster.__viewers[i].__topLeftContainer.getChildren(); //~ CAUTION ! ---> This only works if the "Paint" toggle button is the last child
						children[children.length-1].setValue(e.getData());
					}
				}
				//~ var viewerSync = true;
				tools.__settingButtons = false;
				for(var i=0; i<theMaster.__viewers.length; i++)
				{
					var children = theMaster.__viewers[i].__topLeftContainer.getChildren(); //~ CAUTION ! ---> This only works if the "Paint" toggle button is the last child
					if(children[children.length-1].getValue()!=e.getData())
						//~ viewerSync = false;
						tools.__settingButtons = true;
				}
				//~ tools.__settingButtons = !viewerSync;
			}, this);

			return paintPaneVisibilitySwitch;
		},
		
		__getSessionsWidget : function()
		{
this.debug("------->>>   tools.__getSessionsWidget : function()   !!!!!!!");
			
			var tools = this;
			
			var theMaster = tools.__master;
			
			var volFile = tools.__file;
			
			var fileBrowser = tools.__fileBrowser;
			
			var sessionsListLayout=new qx.ui.layout.HBox();
			sessionsListLayout.setSpacing(4);
			var sessionsListContainer=new qx.ui.container.Composite(sessionsListLayout);
			sessionsListContainer.set({width : tools.__rightPanelWidth}); //~ value measured manually during debug...  // try same width befor and after
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
					var dummyItem=null;
					if (sessionIdToSelect==null)
					{
						dummyItem = new qx.ui.form.ListItem("select a session");
						sessionsList.add(dummyItem);
						dummyItem.setUserData("dummy",true);
					}
					if (sessionItemToSelect!=null)
					{
						//~ tools.__curView.__saveDisplay(); //~ Sorry, there's problems with this. Try again later...
						sessionsList.setSelection([sessionItemToSelect]);
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileBrowser.getSessionDirectory(
							volFile,sessionType,sessionIdToSelect));
			//~ tools.debug(" 857 : __getSessionsWidget : theMaster.__saveSeedsXML(); !");
						theMaster.__saveSeedsXML();
					}
					else
						sessionsList.setSelection([dummyItem]);					
					updateInProgress=false;
				};

				fileBrowser.getFileSessions(volFile, sessionType, buildSessionsItems);
			}
			
			sessionsList.addListener("changeSelection", function(e)
			{
//~ tools.debug("1007 : >>>>>>>  sessionsList.addListener(changeSelection, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if (!updateInProgress)
				{
					var listItem=sessionsList.getSelection()[0];
					if (listItem.getUserData("dummy")!=true)
					{
						tools.__tabView.setVisibility("visible");
						tools.setSessionDirectory(fileBrowser.getSessionDirectory(
							volFile,sessionType,listItem.getLabel()));
						theMaster.__loadSession();
					}
					sessionsList.close();
				}
			});



			button.addListener("execute", function (e){
//~ tools.debug("1025 : >>>>>>>  button.addListener(execute, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				theMaster.__resetSeedsList();
				theMaster.__updateAll();
				fileBrowser.createNewSession(volFile,sessionType, updateList);
				});

			updateList();
			return sessionsListContainer;
		},
		
		__getSeedsTypeSelectBox : function()
		{
this.debug("------->>>   tools.__getSeedsTypeSelectBox : function()   !!!!!!!");
			
			var tools = this;
			
			var theMaster = tools.__master;
			
			var volFile = tools.__file;
			
			var fileBrowser = tools.__fileBrowser;
			
			
			
			var selectBox = new qx.ui.form.SelectBox();
			
			
			
			var singleViewLists = [];
			var tempMultiViewSeeds = [];
			var tempMultiViewCorrections = [];
			for(var orionCount=0; orionCount<theMaster.__nbUsedOrientations; orionCount++)
			{
				for(var i=0; i<theMaster.__viewers.length; i++)
				{
					if((theMaster.__viewers[i].__display.orientation==orionCount)&&(typeof tempMultiViewSeeds[orionCount]=="undefined"))
					{
						singleViewLists = theMaster.__viewers[i].__createSeedsLists();
						tempMultiViewSeeds[orionCount] = singleViewLists[0];
//~ tools.debug("1026 : tempMultiViewSeeds["+orionCount+"] : " + tempMultiViewSeeds[orionCount]);
						tempMultiViewCorrections[orionCount] = singleViewLists[1];
//~ tools.debug("1029 : tempMultiViewCorrections["+orionCount+"] : " + tempMultiViewCorrections[orionCount]);
					}
				}
			}
			
			
			
			var seedsItem = new qx.ui.form.ListItem("seeds");
//~ tools.debug("1033 : seedsItem : " + seedsItem);
			seedsItem.setUserData("filePrefix", "seed");
//~ tools.debug("1034 : tempMultiViewSeeds.length : " + tempMultiViewSeeds.length);
//~ tools.debug("1035 : tempMultiViewSeeds : " + tempMultiViewSeeds);
			seedsItem.setUserData("seedsList", tempMultiViewSeeds);
			seedsItem.setUserData("oppositeList", tempMultiViewCorrections);
			
			selectBox.add(seedsItem);
			
			
			var correctionsItem = new qx.ui.form.ListItem("corrections");
//~ tools.debug("1033 : correctionsItem : " + correctionsItem);
			correctionsItem.setUserData("filePrefix", "correction");
//~ tools.debug("1044 : tempMultiViewCorrections.length : " + tempMultiViewCorrections.length);
//~ tools.debug("1045 : tempMultiViewCorrections : " + tempMultiViewCorrections);
			correctionsItem.setUserData("seedsList", tempMultiViewCorrections);
			correctionsItem.setUserData("oppositeList", tempMultiViewSeeds);
			
			selectBox.add(correctionsItem);
			
			
			
			selectBox.addListener("changeSelection",function (e)
			{
//~ tools.debug("1098 : >>>>>>>  selectBox.addListener(changeSelection, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				var SelectedItem = selectBox.getSelection()[0];
				var selectedOppositeList;
				var selectedSeedsList;
				for(var i=0; i<theMaster.__viewers.length; i++)
				{
					selectedOppositeList = SelectedItem.getUserData("oppositeList")[theMaster.__viewers[i].getUserData("viewerIndex")];
					selectedOppositeList.setVisibility("excluded");
					selectedOppositeList.resetSelection();

					selectedSeedsList = SelectedItem.getUserData("seedsList")[theMaster.__viewers[i].getUserData("viewerIndex")];
					selectedSeedsList.setVisibility("visible");
				}
				
				theMaster.__updateAll();
			},this);
			
			
			selectBox.addListenerOnce("appear", function(event)
			{
tools.debug("1118 : >>>>>>>  selectBox.addListener(appear, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				for(var i=0; i<theMaster.__viewers.length; i++)
				{
					var list = selectBox.getSelection()[0].getUserData("seedsList")[theMaster.__viewers[i].getUserData("viewerIndex")];
					list.setVisibility("visible");
				}
				// from   paintPaneVisibilitySwitch.addListener("changeValue", function (e)
			
			
				theMaster.__resetSeedsList(); //~ from segTools  Line : 807
			
			
			}, this);
			
			
			
			tools.__seedsTypeSelectBox = selectBox;
			
			
			
			return selectBox;
			
		}
		
		
		
		
		
	} //// END of   members :
	
	
	
	
	
	
	
}); //// END of   qx.Class.define("desk.segTools",

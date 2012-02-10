qx.Class.define("desk.volView__classTest",
{
  extend : qx.ui.window.Window,

	construct : function(volumeMaster, globalFile, globalFileBrowser, startOrientation)
	{		
		this.base(arguments);
		this.__window=this;

        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }

    ////Global variables
		
		this.__master = volumeMaster;
		
		this.__file = globalFile;
		
		this.__fileBrowser = globalFileBrowser;
		
		
		// init 
		this.__horizSlices={
		usedSliceSeeds : [],
		sliceResults : []
		};

		this.__ctrlZData=[];


		// Données globales pour le canvas qx.html.Canvas des seeds (utilisé pour l'affichage)
		this.__drawingCanvasParams = {
			sliceNumber : 0,
			drawingContext : null,     //Variable pour le contexte du canvas qx.html.Canvas des seeds (utilisé pour l'affichage)
			paintFlag : false,     //Indique si l'utilisateur est en train de dessiner
			brCrFixingFlag : false,     //Indique si l'utilisateur est en train de modifier la luminosité ou le contraste de l'image de fond
			curCtxtZoom : 1,     //Indique le zoom courant de la zone image, appliqué aux canvas d'affichage
			currentColor : '#101010',
			myLineWidth : 4,
			myLineCap : "round",
			myLineJoin : "round",
			myMiterLimit : 1
			};

// Données globales pour le canvas qx.html.Canvas des images (utilisé pour l'affichage)
		this.__imgCanvasParams = {
			imgContext : null,     //Variable pour le contexte du canvas qx.html.Canvas des images (utilisé pour l'affichage)
			brightness : 0,     //Luminosité comprise entre -150 et 150
			contrast : 0     //Contraste positif limité dans le programme à 5
			};

// Données globales associées à la souris (position et evenements)
        this.__mouseData = {
            xPos : 0,    //Position en x récupérée lors d'un évenement souris
            yPos : 0,    //Position en y récupérée lors d'un évenement souris
            recentX : 0,     //Position en x enregistrée à la fin d'un évenement souris
            recentY : 0,     //Position en y enregistrée à la fin d'un évenement souris
            decaleZoomX : 0,     //Décalage en x de la fenêtre zoomée par rapport à l'image taille x1
            decaleZoomY : 0,     //Décalage en y de la fenêtre zoomée par rapport à l'image taille x1
            mouseLeftDownFlag : 0,     //Indique si on appuyé sur le bouton gauche de la souris (dessin, gomme, luminosité/contraste)
            mouseMiddleDownFlag : 0,     //Indique si on appuyé sur le bouton du milieu de la souris (déplace dans l'image zoomée)
            mouseRightDownFlag : 0     //Indique si on appuyé sur le bouton droit de la souris (fonction "annuler")
        };
        
        this.__display = {
			orientation : startOrientation,		// defines the horizontal, vertical and depth coordinates
				//// 0 : Slice on z (z growing): XY Z (DEFAULT)
				//// 1 : Slice on x (x decreasing): ZY X
				//// 2 : Slice on y (y growing): XZ Y
			wheelScale : 0,			// mouse wheel counter (used for zoom function)
			curCtxtZoom : 1,		// zoom of the 2D display window
			hrzntlShift : 0,		// first coordinate of the 2D display window (distance between the left edge of the display window and the "left" edge of the source image)
			vrtclShift : 0,			// second coordinate of the 2D display window (distance between the top edge of the display window and the "top" edge of the source image)
			depthShift : 0,			// depth coordinate of the display window (current slice)
			onDispMouseHrzPos : 0,	// horizontal coordinate of the mouse on the 2D display
			onDispMouseVrtPos : 0	// vertical coordinate of the mouse on the 2D display
		};
		
		this.set({
			showMinimize: false,
			showMaximize: false,
			allowMaximize: false, // to modify on "resize" event ...?
			showClose: true,
			resizable: true,
			movable : true
			});

		this.setLayout(new qx.ui.layout.Canvas());

		if (globalFileBrowser!=null)
		{
			this.__setVolume(globalFile, globalFileBrowser);
			this.__updateVolume(true);
		}
		else
			alert ("error : no filebrowser provided for volView");

		this.addListener("move", function(event)
		{
//~ this.debug("this.addListener(move, function(event) !!!");
			//~ if(this.__master.__tools!=null)
				//~ this.__master.__tools.moveTo(this.getBounds().left + this.getBounds().width + 5 + 35,
											//~ this.getBounds().top); //~ winSeparate test
			var winTitleBarHeight = 26;
			var displayBorder = volView.getContentPaddingBottom();
			if(this.__getSeedsLists("seedsList")!=null)
			{
				var seedsList = this.__getSeedsLists("seedsList");
				if(seedsList!=null)
				{
					seedsList.setLayoutProperties({
								left:this.getBounds().left + this.getBounds().width + 5,
								top:this.getBounds().top + winTitleBarHeight + this.__mainLeftContainer.getChildren()[0].getBounds().height + this.__mainLeftContainer.getLayout().getSpacing() + displayBorder
												});
				}
			}
			if(this.__getSeedsLists("oppositeList")!=null)
			{
				var correctionsList = this.__getSeedsLists("oppositeList");
				if(correctionsList!=null)
				{
					correctionsList.setLayoutProperties({
										left:this.getBounds().left + this.getBounds().width + 5,
										top:this.getBounds().top + winTitleBarHeight + this.__mainLeftContainer.getChildren()[0].getBounds().height + this.__mainLeftContainer.getLayout().getSpacing() + displayBorder
														});
				}
			}
		}, this);
		
		this.addListener("changeZIndex", function(event)
		{
//~ this.debug("this.addListener(changeZIndex, function(event) !!!");
			if(this.__getSeedsLists("seedsList")!=null)
			{
				var seedsList = this.__getSeedsLists("seedsList");
				if(seedsList!=null)
					seedsList.setZIndex(this.getZIndex());
			}
			if(this.__getSeedsLists("oppositeList")!=null)
			{
				var correctionsList = this.__getSeedsLists("oppositeList");
				if(correctionsList!=null)
					correctionsList.setZIndex(this.getZIndex());
			}
		}, this);
		
		this.addListener("mousemove", function(event)
		{
//~ this.debug("106 : >>>>>>>   addListener(mousemove, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
			//~ if((this.__mouseActionActive==true)&&(this.__mouseActionMode==4))
			//~ {
				//~ if(this.__drawingCanvas != null)
					//~ this.__drawingCanvas.resetCursor();
				//~ 
				//~ if((this.__master.__tools.__eraserCursor != null)&&(!this.__isSegWindow))
					//~ this.__master.__tools.__eraserCursor.resetCursor();
			//~ }
			
			
			if((this.__master.__tools.__eraserButton!=null)&&(!this.__isSegWindow))
				if(this.__mouseActionMode==4)
					this.__master.__tools.__eraserButton.setValue(true);
				else
					this.__master.__tools.__eraserButton.setValue(false);
			
			if(this.__brghtnssCntrstButton!=null)
				if(this.__mouseActionMode==1)
					this.__brghtnssCntrstButton.setValue(true);
				else
					this.__brghtnssCntrstButton.setValue(false);
			
		}, this);
		
		this.addListener("changeActive", function(event)
		{
	//~ this.debug("732 : >>>>>>>   addListener(changeDisplay, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
			if((event.getData())&&(this.__master.__tools!=null))
				this.__setAsCurrent();
		}, this);
		
		var volView = this;
		
		//~ volView.setMinWidth(73);
		//~ volView.setMinHeight(73);
		//~ volView.setMaxWidth(volView.getLayoutParent().getBounds().width - 5);
		//~ volView.setMaxHeight(volView.getLayoutParent().getBounds().height - 5);


		this.open();
		
	},

	events : {
	// the "changeSlice" event is fired whenever the slice or contrast/luminosity change
		"changeSlice" : "qx.event.type.Event",
		"changeDisplay" : "qx.event.type.Event"
	},

	properties : {
	// the "ready" property is true when the UI is ready.
		ready : { init : false, check: "Boolean", event : "changeReady"}
	},

	members :
	{
		// the file browser which launched the viewer
		__fileBrowser : null,

		// the initial volume file (.mhd)
		__file : null,

		// the main window
		__window : null,
		
		__isSegWindow : false,

		__mainLeftContainer : null,
		__topLeftContainer : null,
		__imageContainer : null,
		__imageCanvas : null,

		//~ __mainRightContainer : null,
		//~ __topRightContainer : null,
		//~ __bottomRightContainer : null,
		//~ __mainBottomRightContainer : null,
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

		//~ __seedsTypeSelectBox : null,

		__hasCorrectionSeeds : false,

		__mouseActionMode : 0,
		__mouseActionActive : false,


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

		// Tableau contenant les couleurs des seeds
        //~ __labelColors : null,

        __imageZ : 1,     // Indice de position en z du canvas image (tout au fond)

        __MaxZoom : 8,     //Limite du zoom : x4
        __timestamp : 0,     //Valeur calculée pour différencier les images dans le caché de l'explorateur
        //~ __eraserCoeff : 2,     //Taille gomme  =  eraserCoeff * taille crayon --> c'est plus agréable d'effacer comme ça
        __numberOfSlices : 0,     //Contient le nombre de slides récuperé à partir du fichier xml (le programme est fait pour  numberOfSlices = "z")

        __slicesNameOffset : 0,     //Contient la valeur de l'offset récuperé à partir du fichier xml
        //~ __eraserCursorZ : 65535,     //Indice de position en z du widget qui représente la gomme (toujours devant)
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
		
		//~ __penSize : null,
		//~ __eraserButton : null,
		//~ __eraserCursor : null,
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
		
		// width of the panel measured manually during debug
		//~ __rightPanelWidth : 405 + 16 + 4,
		
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
		
		

		getWindow : function()
		{
this.debug("------->>>   volView.getWindow : function()   !!!!!!!");

			var volView = this;
			return volView.__window;
		},
		
		__setVolume : function (file,fileBrowser)
		{
this.debug("------->>>   volView.__setVolume : function()   !!!!!!!");

			var volView = this;
			volView.__fileBrowser=fileBrowser;
			volView.__file=file;
		},
		
		__getDimensions : function ()
		{
this.debug("------->>>   volView.__getDimensions : function()   !!!!!!!");

			var volView = this;
			return (volView.__dimensions);
		},
		
		getDimensions : function ()
		{
this.debug("------->>>   volView.__getDimensions : function()   !!!!!!!");

			var volView = this;
			return (volView.__dimensions);
		},
		
		getCornersCoordinates : function ()
		{
this.debug("------->>>   volView.__getCornersCoordinates : function()   !!!!!!!");
			
			var volView = this;
			
			var z=volView.__origin[2]+(volView.__spinner.getValue()+volView.__extent[4])*volView.__spacing[2];
			var xmin=volView.__origin[0]+volView.__extent[0]*volView.__spacing[0];
			var xmax=volView.__origin[0]+volView.__extent[1]*volView.__spacing[0];
			var ymin=volView.__origin[1]+volView.__extent[2]*volView.__spacing[1];
			var ymax=volView.__origin[1]+volView.__extent[3]*volView.__spacing[1];
			var coordinates=[];
			coordinates[0]=xmin;
			coordinates[1]=ymin;
			coordinates[2]=z;
			coordinates[3]=xmax;
			coordinates[4]=ymin;
			coordinates[5]=z;
			coordinates[6]=xmax;
			coordinates[7]=ymax;
			coordinates[8]=z;
			coordinates[9]=xmin;
			coordinates[10]=ymax;
			coordinates[11]=z;
			return (coordinates);
		},
		
		__updateVolume : function(buildUI)
		{
this.debug("------->>>   volView.__updateVolume : function()   !!!!!!!");

			var volView = this;
			
			if (buildUI==true)
			{
				var label = new qx.ui.basic.Label("Computing slices, wait...").set({
					font : new qx.bom.Font(28, ["Verdana", "sans-serif"])
					});
				volView.add(label);
			}
			else
				volView.setCaption("computing slices, wait...");
			
			var parameterMap={
				"action" : "slice_volume",
				"input_volume" : volView.__file,
				"output_directory" : "cache\/"};
				
			//~ segColor test
			/*
			if((volView.__isSegWindow)&&(selection==selectables[1]))
			{
				parameterMap.action = "slice_volume_color";
				parameterMap.format = "0";
			}
			*/
			
		//~ orion test (change orientation param in volume_slice action : actions.xml)
			parameterMap.slice_orientation = volView.__display.orientation;
			
			//~ segColor test
			/*
			if(volView.__formatSelectBox!=null)
			{
				//~ volView.debug("volView.__formatSelectBox : " + volView.__formatSelectBox);
				//~ volView.debug("volView.__formatSelectBox.getSelection() : " + volView.__formatSelectBox.getSelection());
				//~ volView.debug("volView.__formatSelectBox.getSelectables() : " + volView.__formatSelectBox.getSelectables());
				var selection = volView.__formatSelectBox.getSelection();
				var selectables = volView.__formatSelectBox.getSelectables();
			}
			*/
			
			function getAnswer(e)
			{
				var req = e.getTarget();
				var slicesDirectory=req.getResponseText().split("\n")[0];
				volView.setCaption(volView.__file);

				volView.__pathJPG = volView.__fileBrowser.getFileURL(slicesDirectory);

				////Get image dimensions and number of slices 
				var globalParamRequest = new XMLHttpRequest();
				globalParamRequest.onreadystatechange = function()
				{
					if(this.readyState == 4 && this.status == 200)
					{
						// so far so good
						if(this.responseXML!=null)
						{
							var response = this.responseXML;
volView.debug("505 : response : " + response);
							var volume=response.getElementsByTagName("volume")[0];
							if (volume==null)
								return;

							//~ volView.__numberOfSlices = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("z"),10);
							volView.__slicesNameOffset = parseInt(response.getElementsByTagName("slicesprefix")[0].getAttribute("offset"),10);
						//~ orion test
							volView.__display.orientation = parseInt(response.getElementsByTagName("slicesprefix")[0].getAttribute("orientation"),10);
							volView.__slicesNamePrefix = response.getElementsByTagName("slicesprefix")[0].firstChild.nodeValue;
							volView.__timestamp = response.getElementsByTagName("slicesprefix")[0].getAttribute("volView.__timestamp");

							if (volView.__timestamp==null)
								volView.__timestamp = (new Date()).getTime();
							
							
							var XMLextent=volume.getElementsByTagName("extent")[0];
							//~ volView.__extent=new Array(parseInt(XMLextent.getAttribute("x1"),10),
														//~ parseInt(XMLextent.getAttribute("x2"),10),
														//~ parseInt(XMLextent.getAttribute("y1"),10),
														//~ parseInt(XMLextent.getAttribute("y2"),10),
														//~ parseInt(XMLextent.getAttribute("z1"),10),
														//~ parseInt(XMLextent.getAttribute("z2"),10));
							var tempExtent=new Array(parseInt(XMLextent.getAttribute("x1"),10),
														parseInt(XMLextent.getAttribute("x2"),10),
														parseInt(XMLextent.getAttribute("y1"),10),
														parseInt(XMLextent.getAttribute("y2"),10),
														parseInt(XMLextent.getAttribute("z1"),10),
														parseInt(XMLextent.getAttribute("z2"),10));
							
							
							//~ var XMLdimensions=volume.getElementsByTagName("dimensions")[0];
							//~ volView.__dimensions=new Array(parseInt(XMLdimensions.getAttribute("x"),10),
															//~ parseInt(XMLdimensions.getAttribute("y"),10),
															//~ parseInt(XMLdimensions.getAttribute("z"),10));
							var XMLdimensions=volume.getElementsByTagName("dimensions")[0];
							var tempDimensions=new Array(parseInt(XMLdimensions.getAttribute("x"),10),
															parseInt(XMLdimensions.getAttribute("y"),10),
															parseInt(XMLdimensions.getAttribute("z"),10));
							
							
							//~ var XMLspacing=volume.getElementsByTagName("spacing")[0];
							//~ volView.__spacing=new Array(parseFloat(XMLspacing.getAttribute("x")),
														//~ parseFloat(XMLspacing.getAttribute("y")),
														//~ parseFloat(XMLspacing.getAttribute("z")));
							var XMLspacing=volume.getElementsByTagName("spacing")[0];
							var tempSpacing=new Array(parseFloat(XMLspacing.getAttribute("x")),
														parseFloat(XMLspacing.getAttribute("y")),
														parseFloat(XMLspacing.getAttribute("z")));
							
							
							//~ var XMLorigin=volume.getElementsByTagName("origin")[0];
							//~ volView.__origin=new Array(parseFloat(XMLorigin.getAttribute("x")),
														//~ parseFloat(XMLorigin.getAttribute("y")),
														//~ parseFloat(XMLorigin.getAttribute("z")));
							var XMLorigin=volume.getElementsByTagName("origin")[0];
							var tempOrigin=new Array(parseFloat(XMLorigin.getAttribute("x")),
														parseFloat(XMLorigin.getAttribute("y")),
														parseFloat(XMLorigin.getAttribute("z")));
							
							
							//~ orion test (change orientation param in volume_slice action : actions.xml)
							switch(volView.__display.orientation)
							{
								// ZY X
								case 1 :
									volView.__extent=new Array(tempExtent[4],
																tempExtent[5],
																tempExtent[2],
																tempExtent[3],
																tempExtent[0],
																tempExtent[1]);
									volView.__dimensions=new Array(tempDimensions[2],
																	tempDimensions[1],
																	tempDimensions[0]);
									volView.__spacing=new Array(tempSpacing[2],
																tempSpacing[1],
																tempSpacing[0]);
									volView.__origin=new Array(tempOrigin[2],
																tempOrigin[1],
																tempOrigin[0]);
									break;
								// XZ Y
								case 2 :
									volView.__extent=new Array(tempExtent[0],
																tempExtent[1],
																tempExtent[4],
																tempExtent[5],
																tempExtent[1],
																tempExtent[2]);
									volView.__dimensions=new Array(tempDimensions[0],
																	tempDimensions[2],
																	tempDimensions[1]);
									volView.__spacing=new Array(tempSpacing[0],
																tempSpacing[2],
																tempSpacing[1]);
									volView.__origin=new Array(tempOrigin[0],
																tempOrigin[2],
																tempOrigin[1]);
									break;
								// XY Z
								default :
									volView.__extent=new Array(tempExtent[0],
																tempExtent[1],
																tempExtent[2],
																tempExtent[3],
																tempExtent[4],
																tempExtent[5]);
									volView.__dimensions=new Array(tempDimensions[0],
																	tempDimensions[1],
																	tempDimensions[2]);
									volView.__spacing=new Array(tempSpacing[0],
																tempSpacing[1],
																tempSpacing[2]);
									volView.__origin=new Array(tempOrigin[0],
																tempOrigin[1],
																tempOrigin[2]);
							}
							
							
							var XMLscalars=volume.getElementsByTagName("scalars")[0];
							volView.__scalarType=parseInt(XMLscalars.getAttribute("type"),10);
							volView.__scalarSize=parseInt(XMLscalars.getAttribute("size"),10);
							volView.__scalarMin=parseFloat(XMLscalars.getAttribute("min"),10);
							volView.__scalarMax=parseFloat(XMLscalars.getAttribute("max"),10);
							
							
							
							volView.debug("volView.__spacing[0] : " + volView.__spacing[0]);
							volView.debug("volView.__spacing[1] : " + volView.__spacing[1]);
							volView.debug("volView.__spacing[2] : " + volView.__spacing[2]);
							//~ volView.__spacing[0] = 1; //~ don't use spacing
							//~ volView.__spacing[1] = 1; //~ don't use spacing
							//~ volView.__spacing[2] = 1; //~ don't use spacing
							
							volView.__scale = [];
							//~ var initSizeCoeff = 0.1; // allows to preset window "size" at the beggining
							//~ volView.__scale[0] = volView.__spacing[1]/initSizeCoeff; //~ use initSizeCoeff to manually adjust scale
							//~ volView.__scale[1] = volView.__spacing[0]/initSizeCoeff; //~ use initSizeCoeff to manually adjust scale
							//~ volView.__scale[2] = volView.__spacing[2]/initSizeCoeff; //~ use initSizeCoeff to manually adjust scale
							volView.__scale[0] = volView.__spacing[1]; //~ use original image dimensions to create display
							volView.__scale[1] = volView.__spacing[0]; //~ use original image dimensions to create display
							volView.__scale[2] = volView.__spacing[2]; //~ use original image dimensions to create display
							volView.debug("volView.__scale[0] : " + volView.__scale[0]);
							volView.debug("volView.__scale[1] : " + volView.__scale[1]);
							volView.debug("volView.__scale[2] : " + volView.__scale[2]);
							
							volView.debug("volView.__dimensions[0] : " + volView.__dimensions[0]);
							volView.debug("volView.__dimensions[1] : " + volView.__dimensions[1]);
							volView.debug("volView.__dimensions[2] : " + volView.__dimensions[2]);
							
							if(volView.__spinner!=null)
								volView.__spinner.setMaximum(volView.__dimensions[2]-1);
							
							volView.__scaledWidth = volView.__dimensions[0]/volView.__scale[0];
							volView.__scaledHeight = volView.__dimensions[1]/volView.__scale[1];
							volView.debug("volView.__scaledWidth = volView.__dimensions[0]/volView.__scale[0]  : " + volView.__scaledWidth);
							volView.debug("volView.__scaledHeight = volView.__dimensions[1]/volView.__scale[1]  : " + volView.__scaledHeight);
							var arbitraryMax = 321; //~ this value has to be smaller than the min(minWidth,minHeight) of the display (a value inferior to the width obtained for 7 top widgets is currently used)
							var arbitraryIncrementFact = 2;
							var arbitrarySafeCountMx = 73;
							var arbitraryCounter = 0;
							while((volView.__scaledWidth>arbitraryMax)&&(arbitraryCounter<arbitrarySafeCountMx))
							{
								volView.__scale[0] = volView.__scale[0]*arbitraryIncrementFact; //~ when changing window dimensions
								volView.__scale[1] = volView.__scale[1]*arbitraryIncrementFact; //~ when changing window dimensions
								volView.__scale[2] = volView.__scale[2]*arbitraryIncrementFact; //~ when changing window dimensions
								volView.__scaledWidth = volView.__scaledWidth/arbitraryIncrementFact;
								volView.__scaledHeight = volView.__scaledHeight/arbitraryIncrementFact;
								++arbitraryCounter;
							}
							if(arbitraryCounter==0)
							{
								volView.debug("No need to adjust size variables, hurray !");
							}
							else
							{
								if(arbitraryCounter<arbitrarySafeCountMx)
									volView.debug("Size variables adjusted !");
								else
									volView.debug("Went crazy while trying to adjust size variables...");
								volView.debug("volView.__scale[0] : " + volView.__scale[0]);
								volView.debug("volView.__scale[1] : " + volView.__scale[1]);
								volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
								volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);
							}
							/*
							if( volView.__mainLeftContainer!=null)
								if( volView.__mainLeftContainer.getChildren()[0]!=null)
								{
									var winTitleBarHeight = 26;
									volView.setMinHeight(Math.round(volView.__scaledHeight/2) + winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*volView.getContentPaddingBottom()); //~winSeparate test
									if(volView.__imageContainer!=null)
									{
										volView.__imageContainer.setHeight(volView.getHeight() - (winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*volView.getContentPaddingBottom()) - 1 ); //~winSeparate test
									}
								}
							if(volView.__slider!=null)
							{
								if(volView.__imageContainer!=null)
								{
									var height2set = volView.__imageContainer.getHeight();
									volView.__slider.setMinHeight(height2set);
									volView.__slider.setMaxHeight(height2set);
									if(volView.__getSeedsLists("seedsList")!=null)
									{
										var seedsList = volView.__getSeedsLists("seedsList");
										if(seedsList!=null)
										{
											seedsList.setMinHeight(height2set);
											seedsList.setMaxHeight(height2set);
										}
									}
									if(volView.__getSeedsLists("oppositeList")!=null)
									{
										var correctionsList = volView.__getSeedsLists("oppositeList");
										if(correctionsList!=null)
										{
											correctionsList.setMinHeight(height2set);
											correctionsList.setMaxHeight(height2set);
										}
									}
								}
								volView.__slider.setMaximum(volView.__dimensions[2]-1);
							}
							*/
							
							if (buildUI)
							{
								volView.removeAll();
								volView.__buildUI();
							}
							else
							{
								volView.__updateAll();
							}
						}
						else
						{
							alert("Global Params : Failure...");
								return;
						}
					}
					else if (this.readyState == 4 && this.status != 200)
					{
						// fetched the wrong page or network error...
						alert('Global Params : "Fetched the wrong page" OR "Network error"');
					}
				};
				globalParamRequest.open("GET",volView.__pathJPG+"/volume.xml?nocache=" + Math.random(),false);
				globalParamRequest.send(null);
			}
			
			volView.__fileBrowser.getActions().launchAction(parameterMap, getAnswer);
			
			//~ segColor test
			/*
			if(volView.__formatSelectBox!=null)
			if(volView.__isSegWindow)
			{
				volView.__formatSelectBox.setSelection([selectables[1]]);
				volView.__formatSelectBox.close();
			}
			else
			{
				volView.__formatSelectBox.setSelection([selectables[0]]);
				volView.__formatSelectBox.close();
			}
			*/
			
		},
		
		__updateImage : function ()
		{
this.debug("------->>>   volView.__updateImage : function()   !!!!!!!");

			var volView = this;
			
			var slice=volView.__spinner.getValue();
			
			volView.__loadImage.onload = function()
			{
	volView.debug("787 : " + volView + ".__loadImage.onload = function () !!!");
				if(volView.__drawingCanvasParams.drawingContext!=null)
					volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,true);
			};

			var selection = volView.__formatSelectBox.getSelection()[0];
			//~ orion test (change orientation param in volume_slice action : actions.xml)
			switch(volView.__display.orientation)
			{
				// ZY X
				case 1 :
					volView.__loadImage.src=selection.getUserData("path") + "/sliceZY" +
						(volView.__slicesNameOffset+slice) + 
						"." + selection.getLabel() + "?nocache=" + volView.__timestamp;
					break;
				// XZ Y
				case 2 :
					volView.__loadImage.src=selection.getUserData("path") + "/sliceXZ" +
						(volView.__slicesNameOffset+slice) + 
						"." + selection.getLabel() + "?nocache=" + volView.__timestamp;
					break;
				// XY Z
				default :
					volView.__loadImage.src=selection.getUserData("path") + "/sliceXY" + 
						(volView.__slicesNameOffset+slice) + 
						"." + selection.getLabel() + "?nocache=" + volView.__timestamp;
			}
		},
		
		getSliceImageData : function()
		{
this.debug("------->>>   volView.__getSliceImageData : function()   !!!!!!!");

			var volView = this;
			return volView.__imageData;
		},
		
		getSlicePixels : function()
		{
this.debug("------->>>   volView.__getSlicePixels : function()   !!!!!!!");

			var volView = this;
			return volView.__pixels;
		},
		
		
		linkToVolumeViewer : function (volumeViewer)
		{
this.debug("------->>>   volView.linkToVolumeViewer : function()   !!!!!!!");

			var myVolumeViewer = this;
			
			function applyLink()
			{
				var displayControl = false;
				volumeViewer.__spinner.bind("value", myVolumeViewer.__spinner, "value");
				myVolumeViewer.__spinner.bind("value", volumeViewer.__spinner, "value");
				myVolumeViewer.__copyDisplay(volumeViewer,myVolumeViewer);
				//~ myVolumeViewer.__saveDisplay(); //~ Sorry, there's problems with this. Try again later...
				myVolumeViewer.addListener("changeDisplay", function(event)
				{
	//~ this.debug("732 : >>>>>>>   addListener(changeDisplay, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
					if(displayControl==false)
					{
						displayControl = true;
						if(volumeViewer.__display.orientation==myVolumeViewer.__display.orientation)
							volumeViewer.__copyDisplay(myVolumeViewer,volumeViewer);
					}
					displayControl = false;
				});
				volumeViewer.addListener("changeDisplay", function(event)
				{
	//~ this.debug("742 : >>>>>>>   addListener(changeDisplay, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
					if(displayControl==false)
					{
						displayControl = true;
						if(myVolumeViewer.__display.orientation==volumeViewer.__display.orientation)
							myVolumeViewer.__copyDisplay(volumeViewer,myVolumeViewer);
					}
					displayControl = false;
				});
			}

			function meReady()
			{
				if (volumeViewer.isReady())
					applyLink();
				else
					volumeViewer.addListenerOnce("changeReady", function () {
	//~ this.debug("758 : >>>>>>>   addListener(changeReady, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
						applyLink()});
			}

			if (volumeViewer!=myVolumeViewer)
			{
				if (myVolumeViewer.isReady())
					meReady();
				else
				{
					myVolumeViewer.addListenerOnce("changeReady", function () {
	//~ this.debug("769 : >>>>>>>   addListener(changeReady, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
						meReady();});
				}
			}
		},
		
		
		__setMouseActionMode : function (mode)
		{
//~ this.debug("------->>>   volView.__setMouseActionMode : function()   !!!!!!!");
//~ this.debug("mode : " + mode);

			var volView = this;
			var tools = volView.__master.__tools;
			
			if (mode!=1)
			{
					volView.__brghtnssCntrstButton.setValue(false);
			}

			if (mode!=3)
			{
                    volView.__drawingCanvasParams.paintFlag = false;
                    if(tools.__colorsContainer!=null)
                    {
						var unfocusedBorder = new qx.ui.decoration.Single(2, "solid", "black");
						var children = tools.__colorsContainer.getChildren();
						for(var i=0; i<children.length; i++)
						{
							children[i].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
							volView.__drawingCanvasParams.paintFlag = false;
						}
					}
					volView.__drawingCanvas.releaseCapture();
			}

			if ((mode!=4)&&(tools.__eraserCursor!=null)&&(!volView.__isSegWindow))
				tools.__eraserCursor.exclude();
			
			//~ if(volView.__drawingCanvas != null)
					//~ volView.__drawingCanvas.resetCursor();
			//~ if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
					//~ tools.__eraserCursor.resetCursor();
			
			volView.__mouseActionMode = mode;
		},
		
		__setAsCurrent : function ()
		{
//~ this.debug("------->>>   volView.__setAsCurrent : function()   !!!!!!!");
			this.__master.__tools.__curView = this;
		},
        ////Computes on image mouse position
		////If(scaling) applies zoom factor for relative coordinates (on zoomed window)
		__getPosition : function (mouseEvent,scaling)
		{
//~ this.debug("------->>>   volView.__getPosition : function()   !!!!!!!");

			var volView = this;
			
			var canvasLocation=volView.__imageCanvas.getContentLocation();
			volView.__display.onDispMouseHrzPos = (mouseEvent.getDocumentLeft()-canvasLocation.left)/volView.__display.curCtxtZoom;
			volView.__display.onDispMouseVrtPos = (mouseEvent.getDocumentTop()-canvasLocation.top)/volView.__display.curCtxtZoom;
			if(scaling)
			{
				volView.__display.onDispMouseHrzPos = volView.__display.hrzntlShift/volView.__display.curCtxtZoom + volView.__display.onDispMouseHrzPos;
				volView.__display.onDispMouseVrtPos = volView.__display.vrtclShift/volView.__display.curCtxtZoom + volView.__display.onDispMouseVrtPos;
			}
		},
		
		////Changes int coordinates into nearest  xxx,5  value to prevent some effects of antialiasing
		__changeInto05Coordinates : function(X,Y)
		{
//~ this.debug("------->>>   volView.__changeInto05Coordinates : function()   !!!!!!!");

			var newCoordinates = {
				newX : 0,
				newY : 0
			};
			var intX2middle, intY2middle;
			if(Math.round(X)<X)
				intX2middle = Math.round(X)+0.5;
			else
				intX2middle = Math.round(X)-0.5;
			if(Math.round(Y)<Y)
				intY2middle = Math.round(Y)+0.5;
			else
				intY2middle = Math.round(Y)-0.5;
			newCoordinates.newX = intX2middle;
			newCoordinates.newY = intY2middle;
			return newCoordinates;
		},
		
		////Redraw image and drawing canvas when translation
		__moveCanvas : function()
		{
//~ this.debug("------->>>   volView.__moveCanvas : function()   !!!!!!!");
			var volView = this;
			
			var tempDecaleX = volView.__display.hrzntlShift/volView.__display.curCtxtZoom + volView.__mouseData.recentX-volView.__display.onDispMouseHrzPos;
			var tempDecaleY = volView.__display.vrtclShift/volView.__display.curCtxtZoom + volView.__mouseData.recentY-volView.__display.onDispMouseVrtPos;
			//~ if(volView.__display.curCtxtZoom<1) //~ zoomOUt
			//~ {
				//~ tempDecaleX = volView.__display.hrzntlShift*volView.__display.curCtxtZoom + volView.__mouseData.recentX-volView.__display.onDispMouseHrzPos;
				//~ tempDecaleY = volView.__display.vrtclShift*volView.__display.curCtxtZoom + volView.__mouseData.recentY-volView.__display.onDispMouseVrtPos;
			//~ }
			volView.__display.hrzntlShift = tempDecaleX;
			volView.__display.vrtclShift = tempDecaleY;
			volView.__display.hrzntlShift = volView.__display.hrzntlShift*volView.__display.curCtxtZoom;
			volView.__display.vrtclShift = volView.__display.vrtclShift*volView.__display.curCtxtZoom;
			if(volView.__display.curCtxtZoom<1)
			{
				volView.__display.hrzntlShift = volView.__display.hrzntlShift/volView.__display.curCtxtZoom;
				volView.__display.vrtclShift = volView.__display.vrtclShift/volView.__display.curCtxtZoom;
			}
	//~ volView.debug("volView.__display.hrzntlShift : " + volView.__display.hrzntlShift);		
	//~ volView.debug("volView.__display.vrtclShift : " + volView.__display.vrtclShift);		
			volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,true);
			volView.fireEvent("changeDisplay");
		},
		
	////Redraw image canvas at original scale
        __resetZoom : function(curView)
        {
//~ this.debug("------->>>   volView.__resetZoom : function()   !!!!!!!");
			var canvasImage = curView.__loadImage;
			curView.__imgCanvasParams.imgContext.setTransform(1,0,0,1,0,0);
			curView.__htmlContextImage.drawImage(canvasImage, 0, 0);
			var outImg = curView.__processBrCr(curView.__imgCanvasParams.brightness, curView.__imgCanvasParams.contrast, true, curView);
			curView.__htmlContextImage.putImageData(outImg, 0, 0, canvasImage.width, canvasImage.height, 0, 0, curView.__scaledWidth, curView.__scaledHeight);
			curView.__imgCanvasParams.imgContext.drawImage(curView.__htmlCanvasImage, 0, 0);
			curView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
			curView.__drawingCanvasParams.drawingContext.drawImage(curView.__htmlCanvasLabels, 0, 0);
			curView.__display.hrzntlShift = 0;
			curView.__display.vrtclShift = 0;
			curView.__display.wheelScale = 0;
			curView.__display.curCtxtZoom = 1;
		},
		
		__copyDisplay : function (sourceVolViewer,targetVolViewer)
		{
//~ this.debug("------->>>   volView.__copyDisplay : function()   !!!!!!!");

			targetVolViewer.__display = Object.create(sourceVolViewer.__display);
			targetVolViewer.__display.hrzntlShift = targetVolViewer.__display.hrzntlShift*sourceVolViewer.__scale[0]/targetVolViewer.__scale[0];
			targetVolViewer.__display.vrtclShift = targetVolViewer.__display.vrtclShift*sourceVolViewer.__scale[1]/targetVolViewer.__scale[1];
			targetVolViewer.__drawZoomedCanvas(targetVolViewer.__display.curCtxtZoom,true);
			targetVolViewer.__spinner.setValue(targetVolViewer.__display.depthShift);
		},
		
		__loadDisplay : function ()
		{
//~ this.debug("------->>>   volView.__loadDisplay : function()   !!!!!!!");

			var loadDispRequest = new XMLHttpRequest();
			var volView = this ;
			var tools = volView.__master.__tools;
			
			loadDispRequest.onreadystatechange = function()
			{
				if(this.readyState == 4 && this.status == 200)
				{
					// so far so good
					if(this.responseXML!=null)
					{
						var response = this.responseXML;
volView.debug("1048 : response : " + response);
						var display=response.getElementsByTagName("display")[0];
						if (display==null)
							return;
						for (var key  in volView.__display)
						{
								if (key == 'length' || !volView.__display.hasOwnProperty(key))
										continue;
								volView.__display[key] = parseFloat(response.getElementsByTagName(key)[0].getAttribute("value"),10);
								//~ volView.debug(key + " : " + volView.__display[key]);
						}
						if((tools.__eraserCursor!=null)&&(!volView.__isSegWindow))
						{
							tools.__eraserCursor.set({width: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*volView.__display.curCtxtZoom/volView.__scale[0]+1),
															height: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*volView.__display.curCtxtZoom/volView.__scale[1]+1)});
						}
						if((volView.__mouseActionMode==4)&&(!volView.__isSegWindow))
						{
						////Move eraser to mouse position
							tools.__eraserCursor.set({marginLeft: Math.round((volView.__display.onDispMouseHrzPos-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[0]))*volView.__display.curCtxtZoom),
														marginTop: Math.round((volView.__display.onDispMouseVrtPos-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[1]))*volView.__display.curCtxtZoom)});
						}
						volView.__spinner.setValue(volView.__display.depthShift);
						volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,true);
						volView.fireEvent("changeDisplay");
					}
					else
					{
							alert("Global Params : Failure...");
							return;
					}
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					// fetched the wrong page or network error...
					alert('Global Params : "Fetched the wrong page" OR "Network error"');
				}
			};
			
			if(tools.getSessionDirectory()!=null) // go see segTools
			{
				loadDispRequest.open("GET", volView.__fileBrowser.getFileURL(tools.getSessionDirectory() + "/savedDisplay.xml?nocache="+Math.random()), false);
				loadDispRequest.send(null);
			}
			else
			{
				var volDirectory = volView.__file.substring(0,volView.__file.lastIndexOf('/'));
				loadDispRequest.open("GET", volView.__fileBrowser.getFileURL(volDirectory + "/savedDisplay.xml?nocache="+Math.random()), false);
				//~ loadDispRequest.send(null);
			}
		},
		
		////Write xml with display parameters
		__saveDisplay : function(callback)
        {
//~ this.debug("------->>>   volView.__saveDisplay : function()   !!!!!!!");

			var volView = this;
			
			var xmlContent = '\n';

			for (var key  in volView.__display)
			{
				if (key == 'length' || !volView.__display.hasOwnProperty(key))
				{
						continue;
				}
				var paramAttribute = {value : volView.__display[key] + ""};
				xmlContent += volView.__master.__element(key, "", paramAttribute) + '\n';
				volView.debug(key + " : " + volView.__display[key]);
			}
			
			var parameterMap = {
					"action" : "save_xml_file",
					"file_name" : "savedDisplay.xml",
					"xmlData" : volView.__master.__element('display', xmlContent)
				};
			if(tools.getSessionDirectory()!=null) // go see segTools
			{
				parameterMap.output_directory = tools.getSessionDirectory();
			}
			else
			{
				parameterMap.output_directory = volView.__file.substring(0,volView.__file.lastIndexOf('/'));
			}
			volView.__fileBrowser.getActions().launchAction(parameterMap, callback);
		},
		
		
	////Draw circle at mouse position
	////The labels image is not modified
		__drawBrush : function(mouseEvent,scale)
        {
//~ this.debug("------->>>   volView.__drawBrush : function()   !!!!!!!");
			var volView = this;
			var tools = volView.__master.__tools;
			var canvasLocation=volView.__imageCanvas.getContentLocation();
            var tempX = (mouseEvent.getDocumentLeft()-canvasLocation.left)/scale;
            var tempY = (mouseEvent.getDocumentTop()-canvasLocation.top)/scale;
            var tempMargin = 4/scale;
            if((tempMargin<tempX)&&(tempX<volView.__scaledWidth/scale-tempMargin)&&(tempMargin<tempY)&&(tempY<volView.__scaledHeight/scale-tempMargin))
            {
				volView.__drawingCanvasParams.drawingContext.setTransform(volView.__display.curCtxtZoom/volView.__scale[0],0,0,volView.__display.curCtxtZoom/volView.__scale[1],0,0);
				volView.__drawingCanvasParams.drawingContext.strokeStyle = tools.__penSize.getValue()*volView.__display.curCtxtZoom;
                volView.__drawingCanvasParams.drawingContext.strokeStyle = volView.__drawingCanvasParams.currentColor;
                volView.__drawingCanvasParams.drawingContext.fillStyle = volView.__drawingCanvasParams.currentColor;
                volView.__drawingCanvasParams.drawingContext.beginPath();
                volView.__drawingCanvasParams.drawingContext.arc(tempX*volView.__scale[0],
																tempY*volView.__scale[1],
																Math.round(tools.__penSize.getValue()/2),
                                                                0, Math.PI * 2, false);
                volView.__drawingCanvasParams.drawingContext.closePath();
                volView.__drawingCanvasParams.drawingContext.fill();
				volView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
            }
            else
              	volView.__drawingCanvas.releaseCapture();
		},

	////Function applies brightness and contrast values
        __processBrCr : function(inBrightness, inContrast, inLegacy, curView)
        {
//~ this.debug("------->>>   volView.__processBrCr : function()   !!!!!!!");
			if((typeof curView!="undefined")&&(curView==this))
				var volView = curView;
			else
				var volView = this;
			var canvasImage = volView.__loadImage;
            var brightness = inBrightness; //parsing ???
            var contrast = inContrast; //parsing ???
            var legacy = !!(inLegacy && inLegacy != "false");
            var brightMul=1;
            if (legacy) {
                brightness = Math.min(150,Math.max(-150,brightness));
            } else {
                brightMul = 1 + Math.min(150,Math.max(-150,brightness)) / 150;
            }
            contrast = Math.max(0,contrast+1);
            var dataDesc=null;
            if (typeof volView.__htmlContextImage.getImageData == "function")
            {
                dataDesc = volView.__htmlContextImage.getImageData(0, 0, volView.__dimensions[0], volView.__dimensions[1]);
                var data = dataDesc.data;
                var p = canvasImage.width * canvasImage.height;
                var pix = p*4, pix1, pix2;
                var mul, add;
                if (contrast != 1) {
                    if (legacy) {
                        mul = contrast;
                        add = (brightness - 128) * contrast + 128;
                    } else {
                        mul = brightMul * contrast;
                        add = - contrast * 128 + 128;
                    }
                } else {  // this if-then is not necessary anymore, is it?
                    if (legacy) {
                        mul = 1;
                        add = brightness;
                    } else {
                        mul = brightMul;
                        add = 0;
                    }
                }

	            var r, g, b,a,c;
	            var r1=1/256;
	            var r2=1/(256*256);
	            var max=volView.__scalarMax;
	            var min=volView.__scalarMin;
	            var shift=-min;
	            var scale=255/(max-min);
				if(volView.__isSegWindow) //~ segColor test
				{
					pix=0;
					while (p--){
						c= data[pix];
						c=c* mul + add;
						if (c>255)
							c=255;
						else if (c<0)
							c=0;
						data[pix++]=c;
						data[pix++]=c;
						data[pix++]=c;
						data[pix++]=255;
					}
				}
				else
				{
					if (volView.__formatSelectBox.getSelection()[0].getLabel()=="png")
					{
						switch (volView.__scalarSize)
						{
						case 1:
							if (volView.__scalarType==3)
							{
								pix=0;
							// unsigned char: no need to check for sign
								while (p--) {
									c=data[pix];
									c=(c+shift)*scale;
									c=c* mul + add;
									
									if (c>255)
										c=255;
									else if (c<0)
										c=0;
									data[pix++]=c;
									data[pix++]=c;
									data[pix++]=c;
									data[pix++]=255;
									}
								}
								else
								{
									pix=0;
									while (p--) {
										c=data[pix];
										if (c>127)
											c-=256;
										c=(c+shift)*scale;
										c=c* mul + add;
										
										if (c>255)
											c=255;
										else if (c<0)
											c=0;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=255;
									}
								}
								break;
							case 2:
								if (volView.__scalarType==4)
								{
								// signed short : need to check for sign
									pix=0;
									while (p--){
										r= data[pix];
										g= data[pix+1];
										c=r+256*g;
										// check sign
										if (g>127)
											c-=65536;
										c=(c+shift)*scale;
										c=c* mul + add;
										
										if (c>255)
											c=255;
										else if (c<0)
											c=0;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=255;
									}
								}
								else
								{
								// unsigned short : no need to check sign
									pix=0;
									while (p--){
										r= data[pix];
										g= data[pix+1];
										c=r+256*g;
										c=(c+shift)*scale;
										c=c* mul + add;
										if (c>255)
											c=255;
										else if (c<0)
											c=0;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=255;
									}
								}
								break;
							case 4:
								if (volView.__scalarType==7)
								{
									// unsigned int : no need to check sign
									pix=0;
									while (p--){
										r= data[pix];
										g= data[pix+1];
										b= data[pix+2];
										a= data[pix+3];
										c=r+256*g+65536*b;
										c=(c+shift)*scale;
										c=c* mul + add;
										if (c>255)
										c=255;
										else if (c<0)
										c=0;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=255;
									}
								}
								else
								{
									// signed int : check sign
									pix=0;
									while (p--){
										r= data[pix];
										g= data[pix+1];
										b= data[pix+2];
										a= data[pix+3];
										c=r+256*g+65536*b;
										if (c>8388607)
											c-=16777216;
										c=(c+shift)*scale;
										c=c* mul + add;
										if (c>255)
											c=255;
										else if (c<0)
											c=0;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=c;
										data[pix++]=255;
									}
								}
								break;
								default :
									alert("format not supported. please repport");
						}
					}
					else
					{
						// format is jpeg : just copy the pixels
						pix=0;
						while (p--){
							c= data[pix];
							c=c* mul + add;
							if (c>255)
								c=255;
							else if (c<0)
								c=0;
							data[pix++]=c;
							data[pix++]=c;
							data[pix++]=c;
							data[pix++]=255;
							}
					}
				}
				dataDesc.data = data;
				volView.__pixels=data;
				volView.__imageData=dataDesc;
				volView.fireEvent("changeSlice");
				return dataDesc;
			}
			else
			{
				var virginImage = new Image();
				return virginImage;
			}
        },
		
		////Save current labels image (used before any modification on the canvas)
		__save2undoStack : function (mouseEvent)
		{
//~ this.debug("------->>>   volView.__save2undoStack : function()   !!!!!!!");

			var volView = this;
			
			if(!mouseEvent.isRightPressed())
			{
				var tempData = [];
				if(volView.__ctrlZData.length==0)
				{
					tempData[0] = volView.__htmlContextLabels.getImageData(0, 0,  volView.__dimensions[0],  volView.__dimensions[1]);
				}
				else
				{
					if(volView.__ctrlZData.length<volView.__undoLimit)
					{
						for(var i=0; i<volView.__ctrlZData.length; i++)
						{
							tempData[volView.__ctrlZData.length-i] = volView.__ctrlZData[volView.__ctrlZData.length-i-1];
						}
						tempData[0] = volView.__htmlContextLabels.getImageData(0, 0,  volView.__dimensions[0],  volView.__dimensions[1]);
					}
					else
					{
						if(volView.__ctrlZData.length==volView.__undoLimit)
						{
							for(var i=1; i<volView.__ctrlZData.length; i++)
							{
								tempData[volView.__ctrlZData.length-i] = volView.__ctrlZData[volView.__ctrlZData.length-i-1];
							}
							tempData[0] = volView.__htmlContextLabels.getImageData(0, 0, volView.__dimensions[0], volView.__dimensions[1]);
						}
					}
				}
				volView.__ctrlZData = tempData;
			}
		},
		
		////Pops out the last state in the "undo" stack and draw image on the canvas
		__undoFnct : function(mouseEvent)
		{
//~ this.debug("------->>>   volView.__undoFnct : function()   !!!!!!!");

			var volView = this;
			
			if(mouseEvent.isRightPressed())
			{
				volView.__currentSeedsModified=true;
				if(0<volView.__ctrlZData.length)
				{
					volView.__htmlContextLabels.putImageData(volView.__ctrlZData[0], 0, 0);
					volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,false);
				}
				var tempData = [];
				for(var i=1; i<volView.__ctrlZData.length; i++)
				{
					tempData[i-1] = volView.__ctrlZData[i];
				}
				volView.__ctrlZData = tempData;
			}
		},
		
		////Clear labels canvas at mouse position
		__eraseFnct : function (autoComplete)
		{
//~ this.debug("------->>>   volView.__eraseFnct : function()   !!!!!!!");

			var volView = this;
			var tools = volView.__master.__tools;
			
			tools.__eraserCursor.capture();
			volView.__currentSeedsModified=true;
			var tempX, tempY;
			if(autoComplete)
			{
				tempX = (volView.__mouseData.recentX+volView.__display.onDispMouseHrzPos)/2-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[0]);
				tempY = (volView.__mouseData.recentY+volView.__display.onDispMouseVrtPos)/2-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[1]);
				var newCoor = volView.__changeInto05Coordinates(tempX*volView.__scale[0],tempY*volView.__scale[1]);
				tempX = newCoor.newX;
				tempY = newCoor.newY;
				var newDims = volView.__changeInto05Coordinates(tools.__eraserCoeff*tools.__penSize.getValue(),tools.__eraserCoeff*tools.__penSize.getValue());
				var tempDim = newDims.newX;
				volView.__htmlContextLabels.clearRect(tempX,
													tempY,
													tempDim,
													tempDim);
			}
			tempX = volView.__display.onDispMouseHrzPos-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[0]);
			tempY = volView.__display.onDispMouseVrtPos-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[1]);
			var newCoor = volView.__changeInto05Coordinates(tempX*volView.__scale[0],tempY*volView.__scale[1]);
			tempX = newCoor.newX;
			tempY = newCoor.newY;
			var newDims = volView.__changeInto05Coordinates(tools.__eraserCoeff*tools.__penSize.getValue(),tools.__eraserCoeff*tools.__penSize.getValue());
			var tempDim = newDims.newX;
			volView.__htmlContextLabels.clearRect(tempX,
												tempY,
												tempDim,
												tempDim);
			volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,false);
			volView.__mouseData.recentX = volView.__display.onDispMouseHrzPos;
			volView.__mouseData.recentY = volView.__display.onDispMouseVrtPos;
		},
		
		__clearDrawingCanvas : function()
		{
//~ this.debug("------->>>   volView.__clearDrawingCanvas : function()   !!!!!!!");

			var volView = this;
			var tools = volView.__master.__tools;
			
			volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, 2*volView.__scaledWidth+32, 2*volView.__scaledHeight+32);
			volView.__htmlContextLabels.clearRect(-16, -16, 2*volView.__scaledWidth+32, 2*volView.__scaledHeight+32);
			volView.__htmlContextLabels.beginPath();
			if(!volView.__isSegWindow)
				tools.__eraserCursor.exclude();
		},
		
		
		
		__buildUI : function ()
		{
this.debug("------->>>   volView.__buildUI : function()   !!!!!!!");

			var volView = this;
			var tools = volView.__master.__tools;

			var spacing=5;
			var windowLayout=new qx.ui.layout.HBox();
			windowLayout.setSpacing(spacing);
			volView.__window.setLayout(windowLayout);
		
			var mLCL=new qx.ui.layout.VBox();
			mLCL.setSpacing(spacing);
			volView.__mainLeftContainer = new qx.ui.container.Composite(mLCL);
			//~ var scrollContainer = new qx.ui.container.Scroll(volView.__mainLeftContainer); //~ resizing Scroll
			//~ scrollContainer.set({scrollbarX : "on", scrollbarY : "on"});
            //~ var listeners = qx.event.Registration.getManager(scrollContainer).getListeners(scrollContainer, "mousewheel");
            //~ if (listeners)
                //~ for (var i = 0; i < listeners.length; i++)
                    //~ scrollContainer.removeListener("mousewheel", listeners[i].handler, scrollContainer);
			//~ volView.__window.add(scrollContainer, {flex: 2}); //~ resizing Scroll
			volView.__window.add(volView.__mainLeftContainer, {flex:1}); //~ comment when resizing Scroll
		
			var tLCL=new qx.ui.layout.HBox();
			tLCL.setSpacing(spacing);
			volView.__topLeftContainer = new qx.ui.container.Composite(tLCL);
			volView.__mainLeftContainer.add(volView.__topLeftContainer);

			var iCL=new qx.ui.layout.HBox();
			iCL.setSpacing(spacing);
			volView.__imageContainer = new qx.ui.container.Composite(iCL);
			volView.__mainLeftContainer.add(volView.__imageContainer, {flex : 1});
			//~ volView.__mainLeftContainer.add(volView.__imageContainer);
			
		////Create brightness/contrast fixing on/off button
			volView.__brghtnssCntrstButton = new qx.ui.form.ToggleButton(null, "desk/Contrast_Logo_petit.PNG");

			volView.__brghtnssCntrstButton.set({toolTipText : "LUMINOSITE/CONTRASTE"});

			volView.__brghtnssCntrstButton.addListener("changeValue", function(event)
			{
	//~ this.debug("1125 : >>>>>>>   addListener(changeValue, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if(event.getData())
					volView.__setMouseActionMode(1);
				else
					volView.__setMouseActionMode(0);
			}, volView);
			
		////Create reset brightness/contrast button
			var resetBrCrButton = new qx.ui.form.Button("Reset");
            
			resetBrCrButton.set({opacity: 0.5, enabled : false});
			
			resetBrCrButton.addListener("execute", function(event)
			{
	//~ this.debug("1139 : >>>>>>>   addListener(execute, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
                volView.__imgCanvasParams.brightness = 0;
                volView.__imgCanvasParams.contrast = 0;
				volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,true);
                resetBrCrButton.set({opacity: 0.5, enabled : false});
                volView.__brghtnssCntrstButton.setValue(false);
            });
            
            
            
			var useLblsColorsCheckBox = new qx.ui.form.CheckBox("Use Label Colors");
			useLblsColorsCheckBox.addListener("changeValue", function(event) //~ segColor test
			{
	//~ this.debug("1152 : >>>>>>>   addListener(changeValue, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				volView.__isSegWindow = event.getData();
				volView.__updateVolume();
			},this);
			
            
            
		////Create slider
            var slider = new qx.ui.form.Slider();
            slider.setWidth(30);
            slider.setMinWidth(30); //~ winSeparate test
            slider.setMaxWidth(30); //~ winSeparate test
            slider.setMaximum(volView.__dimensions[2]-1);
            slider.setMinimum(0);
            slider.setOrientation("vertical");
            volView.__slider=slider;
			
		////Create spinner and sync it with the slider
            var spinner = new qx.ui.form.Spinner();
            volView.__spinner=spinner;
            spinner.setMaximum(volView.__dimensions[2]-1);
            spinner.setMinimum(0);
            spinner.setValue(0);
            slider.addListener("changeValue",function(e){
	//~ this.debug("1176 : >>>>>>>   addListener(changeValue, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
                spinner.setValue(volView.__dimensions[2]-1-e.getData());});
            
			volView.__orientationSelect = volView.__getOrientationSelectBox();
			
			volView.__topLeftContainer.add(spinner);
			volView.__topLeftContainer.add(volView.__brghtnssCntrstButton);
			volView.__topLeftContainer.add(resetBrCrButton);
			//~ volView.__topLeftContainer.add(useLblsColorsCheckBox); //~ segColor test
			
			
			volView.__topLeftContainer.add(new qx.ui.core.Spacer(),{flex : 7});
			volView.__formatSelectBox=volView.__getFormatSelectBox();
			volView.__topLeftContainer.add(volView.__formatSelectBox);
			volView.__topLeftContainer.add(new qx.ui.core.Spacer(),{flex : 1});
			volView.__topLeftContainer.add(volView.__orientationSelect);
			volView.__topLeftContainer.add(new qx.ui.core.Spacer(),{flex : 3});
			volView.__topLeftContainer.add(volView.__getDragAndDropLabel());
			
			volView.__topLeftContainer.addListener("appear", function(event)
			{
				//~ volView.debug("1233 : volView.__topLeftContainer.addListener(appear, function(event) !!!");
				volView.__topLeftContainer.add(tools.__getPaintPanelVisibilitySwitch());
				volView.__setAsCurrent();
			}, this);

			
			
			volView.__updateContext = function(event)
			{
	//~ this.debug("1650: >>>>>>>   addListener(__updateContext, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if((volView.__imageCanvas != null)&&(volView.__drawingCanvas != null)&&(volView.__htmlContextImage != null)&&(volView.__htmlContextLabels != null))
				{
					volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,true);
				}
				volView.fireEvent("changeDisplay");
			};
			
			volView.__mouseDownHandler = function(event)
            {
	//~ this.debug("1660: >>>>>>>   addListener(__mouseDownHandler, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
			////"Undo" (draw previous canvas)
				volView.__undoFnct(event);
			////Locate mouse
				volView.__getPosition(event,true);
			////Draw at cursor position, activate drawing, activate brightness/contrast fixing
				if ((event.isLeftPressed())&&(!event.isShiftPressed()))
                {
 					volView.__mouseData.mouseLeftDownFlag = true;
					volView.__mouseActionActive = true;
					volView.__save2undoStack(event);
					switch (volView.__mouseActionMode)
                    {
						case 4:
							tools.__eraserCursor.capture();
							if(tools.__eraserCursor.getVisibility()=="excluded")
								tools.__eraserCursor.show();
							break;
						case 3:
							if(!volView.__mouseData.mouseMiddleDownFlag)
								volView.__drawBrush(event,volView.__display.curCtxtZoom);
							volView.__htmlContextLabels.lineWidth = tools.__penSize.getValue();
							volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
							volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
							volView.__htmlContextLabels.beginPath();
							var newCoor = volView.__changeInto05Coordinates(volView.__display.onDispMouseHrzPos*volView.__scale[0],volView.__display.onDispMouseVrtPos*volView.__scale[1]);
							var tempX = newCoor.newX;
							var tempY = newCoor.newY;
							volView.__htmlContextLabels.arc(tempX,
															tempY,
															tools.__penSize.getValue()/2,
															0, Math.PI*2, false);
							volView.__htmlContextLabels.closePath();
							volView.__htmlContextLabels.fill();
							if (volView.__segmentationInProgress==false)
								tools.__startSegmentationButton.setEnabled(true);

							volView.__currentSeedsModified=true;
							break;
						default :
                    }
                    volView.__htmlContextLabels.beginPath();
                    
					//~ if(volView.__drawingCanvas != null)
							//~ volView.__drawingCanvas.resetCursor();
					//~ if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
							//~ tools.__eraserCursor.resetCursor();
					
					spinner.releaseCapture();
					tools.__penSize.releaseCapture();
                }
			////Activate moving
                if(((event.isShiftPressed())||(event.isMiddlePressed()))&&(1<=volView.__display.curCtxtZoom))
                //~ if(((event.isShiftPressed())||(event.isMiddlePressed()))) //~ zoomOUT
				{
					drawingCanvas.set({cursor: "move"});
					if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
							tools.__eraserCursor.set({cursor: "move"});
					volView.__mouseData.mouseMiddleDownFlag = true;
				}
			////Update image
				if(!((volView.__mouseData.brCrFixingFlag)&&(volView.__mouseData.mouseLeftDownFlag)))
				{
					drawZoomedCanvas(volView.__display.curCtxtZoom,false);
				}
			////Draw cursor
				if(volView.__mouseActionMode==3)
				{
					volView.__drawBrush(event,volView.__display.curCtxtZoom);
				}
				volView.__mouseData.recentX = volView.__display.onDispMouseHrzPos;
                volView.__mouseData.recentY = volView.__display.onDispMouseVrtPos;
            };
			
			volView.__display.wheelScale = 0;
            volView.__mouseWheelHandler = function(event)
            {
	//~ this.debug("1288: >>>>>>>   addListener(__mouseWheelHandler, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				var curView = tools.__curView;
				if(((typeof curView!="undefined")&&(this==curView))||(this==tools.__eraserCursor))
				{
					var tempScale = curView.__display.wheelScale;
					tempScale += -event.getWheelDelta()/8;
					curView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
					curView.__imgCanvasParams.imgContext.setTransform(1,0,0,1,0,0);
					var currentZoom = curView.__display.curCtxtZoom;
					var zoomFactor = Math.pow(2,tempScale);
				////Apply zoom
					if((1<=zoomFactor)&&(zoomFactor<=curView.__MaxZoom))	////Only zoom no shrinking and not more than Max zoom
				//~ zoomOUT
					//~ if(zoomFactor<=curView.__MaxZoom)	//// Zoom in and zoom out
					{
						curView.debug(" zoom = x" + zoomFactor);
						var location=curView.__imageCanvas.getContentLocation();
						curView.__display.onDispMouseHrzPos = event.getDocumentLeft()-location.left;
						curView.__display.onDispMouseVrtPos = event.getDocumentTop()-location.top;
						var onImageX = curView.__display.hrzntlShift + curView.__display.onDispMouseHrzPos;
						var onImageY = curView.__display.vrtclShift + curView.__display.onDispMouseVrtPos;
						curView.__imgCanvasParams.imgContext.clearRect(-16,-16,curView.__dimensions[0]*curView.__scaledWidth+32,curView.__dimensions[1]*curView.__scaledHeight+32);
						curView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, curView.__dimensions[0]*curView.__scaledWidth+32, curView.__dimensions[1]*curView.__scaledHeight+32);
					////Zoom in
						curView.__drawingCanvasParams.drawingContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
						curView.__imgCanvasParams.imgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
						curView.__display.hrzntlShift = onImageX*zoomFactor/currentZoom-curView.__display.onDispMouseHrzPos;
						curView.__display.vrtclShift = onImageY*zoomFactor/currentZoom-curView.__display.onDispMouseVrtPos;
						//~ var newCoor = curView.__changeInto05Coordinates(curView.__display.hrzntlShift,curView.__display.vrtclShift);
						//~ curView.__display.hrzntlShift = newCoor.newX;
						//~ curView.__display.vrtclShift = newCoor.newY;
						if((tools.__eraserCursor!=null)&&(!curView.__isSegWindow))
								tools.__eraserCursor.set({width: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*zoomFactor/curView.__scale[0])+1,
															height: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*zoomFactor/curView.__scale[1])+1});
					////Place the center of the eraser at mouse position
						if((curView.__mouseActionMode==4)&&(!curView.__isSegWindow))
						{
							var canvasLocation=curView.__imageCanvas.getContentLocation();
							var tempX = (event.getDocumentLeft()-canvasLocation.left)/curView.__display.curCtxtZoom;
							var tempY = (event.getDocumentTop()-canvasLocation.top)/curView.__display.curCtxtZoom;
							var canvasLocation = curView.__imageCanvas.getContentLocation();
							tools.__eraserCursor.set({marginLeft: Math.round(canvasLocation.left+(tempX-tools.__eraserCoeff*tools.__penSize.getValue()/(2*curView.__scale[0]))*curView.__display.curCtxtZoom),
														marginTop: Math.round(canvasLocation.top+(tempY-tools.__eraserCoeff*tools.__penSize.getValue()/(2*curView.__scale[1]))*curView.__display.curCtxtZoom)});
						}
						curView.__display.wheelScale = tempScale;
						curView.__display.curCtxtZoom = zoomFactor;
					////Reset image and drawing canvas
						if(zoomFactor==1)
						{
							curView.__resetZoom(curView);
						}
					}
				//~ zoomOUT : comment else code below
					else
						if(zoomFactor<1)
							curView.__resetZoom(curView);
					curView.__drawZoomedCanvas(curView.__display.curCtxtZoom, true, curView);
				////Draw cursor
					if(curView.__mouseActionMode==3)
					{
						curView.__drawBrush(event,curView.__display.curCtxtZoom);
					}
				////Alert all viewers that zoom has changed
					curView.fireEvent("changeDisplay");
				}
            };
			
			volView.__mouseMoveHandler = function(event)
            {
	//~ this.debug("1354: >>>>>>>   addListener(__mouseMoveHandler, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				volView.__getPosition(event,true);
                //~ if((volView.__mouseData.mouseMiddleDownFlag)&&(volView.__mouseActionMode!=4))
                if(volView.__mouseData.mouseMiddleDownFlag)
                {
					volView.__moveCanvas();
				}
					
				switch (volView.__mouseActionMode)
				{
					case 4 :
						tools.__eraserCursor.capture();
						if(tools.__eraserCursor.getVisibility()=="excluded")
							tools.__eraserCursor.show();
						////Set eraser cursor position
						var canvasLocation=volView.__imageCanvas.getContentLocation();
						var tempX = (event.getDocumentLeft()-canvasLocation.left)/volView.__display.curCtxtZoom;
						var tempY = (event.getDocumentTop()-canvasLocation.top)/volView.__display.curCtxtZoom;
						tools.__eraserCursor.set({marginLeft: Math.round((tempX-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[0]))*volView.__display.curCtxtZoom),
													marginTop: Math.round((tempY-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[1]))*volView.__display.curCtxtZoom)});
						if(volView.__mouseData.mouseLeftDownFlag)
						{
							////Erase at mouse position
							volView.__eraseFnct(true);
						}
						break;
					case 3 :
						drawZoomedCanvas(volView.__display.curCtxtZoom,false);
						volView.__drawingCanvas.capture();
						if(!volView.__mouseData.mouseMiddleDownFlag)
							volView.__drawBrush(event,volView.__display.curCtxtZoom);
						break;
					default:
				}

				if (volView.__mouseActionActive)
				{
					switch (volView.__mouseActionMode)
					{
					case 1 :
						////Use mouse mouvement to set brightness/contrast
						var tempBrightness = volView.__imgCanvasParams.brightness + (volView.__display.onDispMouseVrtPos-volView.__mouseData.recentY)*150/volView.__scaledHeight;
						var tempContrast = volView.__imgCanvasParams.contrast + (volView.__display.onDispMouseHrzPos-volView.__mouseData.recentX)*5/volView.__scaledWidth;
						if((0<tempBrightness+150)&&(tempBrightness<150))
							volView.__imgCanvasParams.brightness = tempBrightness;
						if((0<tempContrast+1)&&(tempContrast<20))
							volView.__imgCanvasParams.contrast = tempContrast;
						resetBrCrButton.set({opacity: 1, enabled : true});
						drawZoomedCanvas(volView.__display.curCtxtZoom,true);
						volView.__mouseData.recentX = volView.__display.onDispMouseHrzPos;
						volView.__mouseData.recentY = volView.__display.onDispMouseVrtPos;
 						break;
					case 3 : 
						////Draw to mouse position
						volView.__drawingCanvas.capture();
						volView.__htmlContextLabels.lineWidth = tools.__penSize.getValue();
						volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
						volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
						var newCoor = volView.__changeInto05Coordinates(volView.__display.onDispMouseHrzPos*volView.__scale[0],volView.__display.onDispMouseVrtPos*volView.__scale[1]);
						volView.__htmlContextLabels.lineTo(newCoor.newX,newCoor.newY);
						volView.__htmlContextLabels.stroke();
						break;
					case 4 :
						tools.__eraserCursor.capture();
						volView.__mouseData.mouseLeftDownFlag = true;
						if(tools.__eraserCursor.getVisibility()=="excluded")
							tools.__eraserCursor.show();
						////Set eraser cursor position
						var canvasLocation=volView.__imageCanvas.getContentLocation();
						var tempX = (event.getDocumentLeft()-canvasLocation.left)/volView.__display.curCtxtZoom;
						var tempY = (event.getDocumentTop()-canvasLocation.top)/volView.__display.curCtxtZoom;
						tools.__eraserCursor.set({marginLeft: Math.round((tempX-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[0]))*volView.__display.curCtxtZoom),
													marginTop: Math.round((tempY-tools.__eraserCoeff*tools.__penSize.getValue()/(2*volView.__scale[1]))*volView.__display.curCtxtZoom)});
						////Erase at mouse position
						volView.__eraseFnct(true);
						break;
					default:
					}
                }
           };
			
			volView.__mouseUpHandler = function(event)
            {
	//~ this.debug("1437 : >>>>>>>   addListener(__mouseUpHandler, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
                volView.__mouseData.mouseLeftDownFlag = false;
				volView.__mouseData.mouseMiddleDownFlag = false;
				if (!event.isLeftPressed())
					volView.__save2undoStack(event);
				volView.__mouseActionActive = false;
				if((tools.__eraserCursor!=null)&&(!volView.__isSegWindow))
					tools.__eraserCursor.releaseCapture();
				if(volView.__drawingCanvas != null)
					volView.__drawingCanvas.resetCursor();
				if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
					tools.__eraserCursor.resetCursor();
            };
            
			volView.__mouseOverHandler = function(event)
			{
	//~ this.debug("1449 : >>>>>>>   addListener(__mouseOverHandler, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
					volView.__eraseFnct(true);
					
				//~ if(volView.__drawingCanvas != null)
					//~ volView.__drawingCanvas.resetCursor();
				//~ if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
					//~ tools.__eraserCursor.resetCursor();
				
			};
			
			
			
		////Create results array for each slice image
            for(var i=0; i<volView.__dimensions[2]; i++)
            {
                volView.__horizSlices.sliceResults[i] = [];
				volView.__horizSlices.usedSliceSeeds[i] = [];
            }
			
			
			volView.__imageCanvas = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
			var imgCanvas = new qx.ui.embed.Canvas().set({syncDimension: true,
															zIndex: volView.__imageZ,
															width : Math.floor(volView.__scaledWidth),
															height : Math.floor(volView.__scaledHeight) });

			volView.__imageCanvas.add(imgCanvas);
			volView.__imageContainer.addAt(volView.__imageCanvas, 0, {flex: 2});
			volView.__imageContainer.addAt(slider, 1, {flex : 1});
			
			var widthHeightRatio = volView.__scaledWidth/volView.__scaledHeight;
			var initResizeCount = 0;
			var initResizeTimes = 3; //~ the extra times it takes to resize the display at the beginning (while loading window elements)
			var displayBorder = volView.getContentPaddingBottom();
			var scrollBarsLength = 16;
			var winTitleBarHeight = 26;
			var eventWidth;
			var eventHeight;
			var widthCandidate;
			var heightCandidate;
			volView.__imageCanvas.addListener("resize", function(event) //~ resizing
			{
//~ this.debug("1948 : >>>>>>>   addListener(resize, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
 				//~ volView.debug("resize event!"); //~ resizing
				
				
				var eraserTest = false;
				if((tools.__eraserButton!=null)&&(!volView.__isSegWindow))
					eraserTest = tools.__eraserButton.getValue();
					
				if(!eraserTest)
				{
					
				//~ volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
				//~ volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);
				
					eventWidth = event.getData().width;
					eventHeight = event.getData().height;
					widthCandidate = Math.round(widthHeightRatio*eventHeight);
					heightCandidate = Math.round(eventWidth/widthHeightRatio);
					
					if(eventWidth>=widthCandidate)
					{
						volView.__scaledWidth = eventWidth;
						volView.__scaledHeight = heightCandidate;
					}
					else
					{
						volView.__scaledWidth = widthCandidate;
						volView.__scaledHeight = eventHeight;
					}
					
				//~ volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
				//~ volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);
				
					if(initResizeCount<=initResizeTimes)
					{
				//~ volView.debug(">>>>>>> " + initResizeCount + "<=" + initResizeTimes);
						if(initResizeCount==initResizeTimes)
						{
					//~ volView.debug(initResizeCount + "==" + initResizeTimes + "!!!!!!!");
							volView.setMinHeight(Math.round(volView.__scaledHeight/2) + winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*displayBorder); //~winSeparate test
						}
						volView.setHeight(volView.__scaledHeight + winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*displayBorder + 1); //~winSeparate test
						volView.setWidth(volView.__scaledWidth + volView.__imageContainer.getLayout().getSpacing() + volView.__slider.getWidth() + 2*displayBorder + 2); //~winSeparate test
					}
					else
					{
				//~ volView.debug("..." + initResizeCount + ">" + initResizeTimes);
						//~ volView.setAllowMaximize(true);
						volView.__imageContainer.setWidth(volView.getWidth() - (volView.__imageContainer.getLayout().getSpacing() + volView.__slider.getWidth() + displayBorder) ); //~winSeparate test
						volView.__imageContainer.setMinHeight(volView.getHeight() - (winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*displayBorder) - 1 ); //~winSeparate test
						volView.__imageContainer.setMaxHeight(volView.getHeight() - (winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*displayBorder) - 1 ); //~winSeparate test
						var height2set = volView.__imageContainer.getHeight();
						volView.__slider.setMinHeight(height2set);
						volView.__slider.setMaxHeight(height2set);
						if(volView.__getSeedsLists("seedsList")!=null)
						{
							var seedsList = volView.__getSeedsLists("seedsList");
							if(seedsList!=null)
							{
								seedsList.setMinHeight(height2set);
								seedsList.setMaxHeight(height2set);
							}
						}
						if(volView.__getSeedsLists("oppositeList")!=null)
						{
							var correctionsList = volView.__getSeedsLists("oppositeList");
							if(correctionsList!=null)
							{
								correctionsList.setMinHeight(height2set);
								correctionsList.setMaxHeight(height2set);
							}
						}
					}
					
					++initResizeCount;
					
					imgCanvas.set({width : volView.__scaledWidth,
									height : volView.__scaledHeight });
					drawingCanvas.set({width : volView.__scaledWidth,
										height : volView.__scaledHeight });
										
					if((tools.__eraserCursor!=null)&&(!volView.__isSegWindow))
						tools.__eraserCursor.set({width: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*volView.__display.curCtxtZoom/volView.__scale[0]+1),
												height: Math.ceil(tools.__eraserCoeff*tools.__penSize.getValue()*volView.__display.curCtxtZoom/volView.__scale[1]+1)});
					
					var oldS0 = volView.__scale[0];
					var oldS1 = volView.__scale[1];
					volView.__scale[0] = volView.__dimensions[0]/volView.__scaledWidth;
					volView.__scale[1] = volView.__dimensions[1]/volView.__scaledHeight;
					
					volView.__display.hrzntlShift = volView.__display.hrzntlShift*oldS0/volView.__scale[0];
					volView.__display.vrtclShift = volView.__display.vrtclShift*oldS1/volView.__scale[1];

				}
				//~ volView.debug("1024 : __saveDisplay !");
				//~ volView.__saveDisplay();
				
		//~ volView.debug("</resize>");
			},this);

			//~ var tempWidth = volView.__scaledWidth;
			volView.addListener("beforeMaximize", function(event)
			{
	//~ this.debug("1563 : >>>>>>>   addListener(beforeMaximize, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				//~ volView.debug("event.getEventPhase() : " + event.getEventPhase());
				//~ volView.debug("event.getType() : " + event.getType());
				//~ volView.debug("event.getOriginalTarget() : " + event.getOriginalTarget());
				//~ volView.debug("event.getRelatedTarget() : " + event.getRelatedTarget());
				//~ volView.debug("event.getTarget() : " + event.getTarget());
				//~ volView.debug("beforeMaximize event!");
				//~ volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
				//~ volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);
				//~ volView.debug("</beforeMaximize>");
				//~ tempWidth = volView.__scaledWidth;
				//~ volView.__saveDisplay(); // unused...
			},this);
			volView.addListener("maximize", function(event)
			{
	//~ this.debug("1578 : >>>>>>>   addListener(maximize, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				//~ volView.debug("event.getEventPhase() : " + event.getEventPhase());
				//~ volView.debug("event.getType() : " + event.getType());
				//~ volView.debug("event.getOriginalTarget() : " + event.getOriginalTarget());
				//~ volView.debug("event.getRelatedTarget() : " + event.getRelatedTarget());
				//~ volView.debug("event.getTarget() : " + event.getTarget());
				//~ volView.debug("maximize event!");
				//~ volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
				//~ volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);
				volView.__imageContainer.setMinHeight(volView.getLayoutParent().getHeight() - (winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*displayBorder) - 1 ); //~winSeparate test
				volView.__imageContainer.setMaxHeight(volView.getHeight() - (winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*displayBorder) - 1 ); //~winSeparate test
				var height2set = volView.__imageContainer.getHeight();
				volView.__slider.setMinHeight(height2set);
				volView.__slider.setMaxHeight(height2set);
				if(volView.__getSeedsLists("seedsList")!=null)
				{
					var seedsList = volView.__getSeedsLists("seedsList");
					if(seedsList!=null)
					{
						seedsList.setMinHeight(height2set);
						seedsList.setMaxHeight(height2set);
					}
				}
				if(volView.__getSeedsLists("oppositeList")!=null)
				{
					var correctionsList = volView.__getSeedsLists("oppositeList");
					if(correctionsList!=null)
					{
						correctionsList.setMinHeight(height2set);
						correctionsList.setMaxHeight(height2set);
					}
				}
				//~ volView.debug("</maximize>");
				//~ volView.__saveDisplay(); // unused...
			},this);
			volView.addListener("resize", function(event)
			{
	//~ this.debug("1596 : >>>>>>>   addListener(resize, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				//~ volView.debug("event.getEventPhase() : " + event.getEventPhase());
				//~ volView.debug("event.getType() : " + event.getType());
				//~ volView.debug("event.getOriginalTarget() : " + event.getOriginalTarget());
				//~ volView.debug("event.getRelatedTarget() : " + event.getRelatedTarget());
				//~ volView.debug("event.getTarget() : " + event.getTarget());
				//~ volView.debug("resize window event!");
				//~ volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
				//~ volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);
				volView.__imageContainer.setMinHeight(volView.getHeight() - (winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*displayBorder) - 1 ); //~winSeparate test
				volView.__imageContainer.setMaxHeight(volView.getHeight() - (winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + 2*displayBorder) - 1 ); //~winSeparate test
				var height2set = volView.__imageContainer.getHeight();
				volView.__slider.setMinHeight(height2set);
				volView.__slider.setMaxHeight(height2set);
				if(volView.__getSeedsLists("seedsList")!=null)
				{
					var seedsList = volView.__getSeedsLists("seedsList");
					if(seedsList!=null)
					{
						seedsList.setMinHeight(height2set);
						seedsList.setMaxHeight(height2set);
					}
				}
				if(volView.__getSeedsLists("oppositeList")!=null)
				{
					var correctionsList = volView.__getSeedsLists("oppositeList");
					if(correctionsList!=null)
					{
						correctionsList.setMinHeight(height2set);
						correctionsList.setMaxHeight(height2set);
					}
				}
				//~ volView.debug("</resize window>");
				
				////~ volView.__saveDisplay(); // unused...
			},this);
			
			
			volView.__imageCanvas.addListener("mouseout", function(event)
			{
	//~ this.debug("1614 : >>>>>>>   addListener(mouseout, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				volView.__mouseActionActive = false;
	//			if(((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.brCrFixingFlag))&&(volView.__mouseActionMode!=4))
//				{
					volView.__htmlContextLabels.beginPath();
					volView.__mouseData.mouseLeftDownFlag = false;
					volView.__mouseData.mouseMiddleDownFlag = false;
//				}
			},this);

			volView.__imageCanvas.addListener("mouseover", function(event)
			{
	//~ this.debug("1629 : >>>>>>>   addListener(mouseover, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
					volView.__eraseFnct(true);
					
				//~ if(volView.__drawingCanvas != null)
					//~ volView.__drawingCanvas.resetCursor();
				//~ if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
					//~ tools.__eraserCursor.resetCursor();
				
			},this);
			
			volView.__imageCanvas.addListener("mousemove", function(event)
			{
	//~ this.debug("1640 : >>>>>>>   addListener(mousemove, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if(event.isLeftPressed())
				{
					if((tools.__eraserCursor!=null)&&(!volView.__isSegWindow))
						tools.__eraserCursor.capture();
					if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
						volView.__eraseFnct(true);
				}
			},this);
			
			volView.__imageCanvas.addListener("mousedown", function(event)
			{
	//~ this.debug("1652 : >>>>>>>   addListener(mousedown, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
					if((tools.__eraserCursor!=null)&&(!volView.__isSegWindow))
						tools.__eraserCursor.capture();
						
				//~ if(volView.__drawingCanvas != null)
					//~ volView.__drawingCanvas.resetCursor();
				//~ if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
					//~ tools.__eraserCursor.resetCursor();
				
			},this);
			
			
			
			volView.__loadImage = new Image();

			//~ volView.__loadSeeds=new Image(); // moved to volMaster  in  __updateSeeds
			
            var drawingCanvas = new qx.ui.embed.Canvas().set({syncDimension: true,
																zIndex: volView.__drawingCanvasZ,
																width : Math.floor(volView.__scaledWidth),
																height : Math.floor(volView.__scaledHeight) });
			volView.__drawingCanvas=drawingCanvas;
			volView.__imageCanvas.add(drawingCanvas);
			
            // HTML embed for background image
            var embedHtmlCodeImage = '<canvas id="htmlTagCanvasImage" width="' + volView.__dimensions[0] + '" height="' + volView.__dimensions[1] + '" ></canvas>';
            var embedObjectImage = new qx.ui.embed.Html(embedHtmlCodeImage);
            embedObjectImage.setDecorator("main");
			
            var containerLayoutImage = new qx.ui.layout.VBox();
            var containerHtmlImage = new qx.ui.container.Composite(containerLayoutImage);
            containerHtmlImage.add(embedObjectImage);
			volView.__embedObjectImage=embedObjectImage;
			volView.__imageCanvas.add(containerHtmlImage);
			containerHtmlImage.setOpacity(0);
			
			
            // HTML embed for drawn labels
            var embedHtmlCodeLabels = '<canvas id="htmlTagCanvasLabels" width="' + volView.__dimensions[0] + '" height="' + volView.__dimensions[1] + '" ></canvas>';
            var embedObjectLabels = new qx.ui.embed.Html(embedHtmlCodeLabels);
            embedObjectLabels.setDecorator("main");
			
            var containerLayoutLabels = new qx.ui.layout.VBox();
            var containerHtmlLabels = new qx.ui.container.Composite(containerLayoutLabels);
            containerHtmlLabels.add(embedObjectLabels);
			volView.__embedObjectLabels=embedObjectLabels;
			volView.__imageCanvas.add(containerHtmlLabels);
			containerHtmlLabels.setOpacity(0);


            // HTML embed for segmented image
            var embedHtmlCodeSegImg = '<canvas id="htmlTagCanvasSegImg" width="' + volView.__scaledWidth + '" height="' + volView.__scaledHeight + '" ></canvas>';
            var embedObjectSegImg = new qx.ui.embed.Html(embedHtmlCodeSegImg);
            embedObjectSegImg.setDecorator("main");
			
            var containerLayoutSegImg = new qx.ui.layout.VBox();
            var containerHtmlSegImg = new qx.ui.container.Composite(containerLayoutSegImg);
            containerHtmlSegImg.add(embedObjectSegImg);
			volView.__embedObjectSegImg=embedObjectSegImg;
			
			volView.__imageCanvas.add(containerHtmlSegImg);
			
            // HTML embed for seeds used for segmentation
            var embedHtmlCodeUsedSeeds = '<canvas id="htmlTagCanvasUsedSeeds" width="' + volView.__scaledWidth + '" height="' + volView.__scaledHeight + '" ></canvas>';
            var embedObjectUsedSeeds = new qx.ui.embed.Html(embedHtmlCodeUsedSeeds);
            embedObjectUsedSeeds.setDecorator("main");
			
            var containerLayoutUsedSeeds = new qx.ui.layout.VBox();
            var containerHtmlUsedSeeds = new qx.ui.container.Composite(containerLayoutUsedSeeds);
            containerHtmlUsedSeeds.add(embedObjectUsedSeeds);
			volView.__embedObjectUsedSeeds=embedObjectUsedSeeds;
			volView.__imageCanvas.add(containerHtmlUsedSeeds);
	
			spinner.addListener("changeValue", function(event)
			{
	this.debug("1730 : >>>>>>>   addListener(changeValue, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				volView.__htmlContextLabels.beginPath(); // seb : why???
				volView.__mouseData.mouseLeftDownFlag = false;
				
				volView.__saveCurrentSeeds();

				var newSliceIndex=event.getData();
				if (newSliceIndex!=Math.round(newSliceIndex))
				{
					spinner.setValue(Math.round(newSliceIndex));
					return;
				}
				slider.setValue(volView.__dimensions[2]-1-newSliceIndex);

				volView.__display.depthShift = newSliceIndex;
				
				if(volView.__master.__tools.__seedsTypeSelectBox!=null)//~ classTest
					var tempSeedsArray = volView.__master.__tools.__seedsTypeSelectBox.getSelection()[0].getUserData("seedsArray")[volView.__display.orientation];
				//~ classTest
			//~ Test is using seeds or just visualisation
				if(tempSeedsArray!=null)
				{
					volView.debug("tempSeedsArray!=null !!!");
					volView.__master.__updateAll();
					
					volView.__updateImage(); //~ copied from just below...
				}
				else
				{
					volView.debug("1732 : volView.__updateImage(); !");
				////Update image canvas
					volView.__updateImage(); //~ copied from __updateAll
				}
				
				spinner.releaseCapture();
				tools.__penSize.releaseCapture();
				
			}, this);
			
			spinner.addListener("mouseout", function(event)
			{
	//~ this.debug("1766 : >>>>>>>   addListener(mouseout, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				spinner.releaseCapture();
				
				if(volView.__drawingCanvas != null)
					volView.__drawingCanvas.resetCursor();
				if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
					tools.__eraserCursor.resetCursor();
			}, this);
			
		//	spinner.setValue(0);//Math.round(0.5*volView.__numberOfSlices));



		function waitForinit()
		{
			// wait for the canvas to really appear in the window otherwise things get bad
			if ((volView.__embedObjectImage.getContentElement().getDomElement()==null)||
				(volView.__embedObjectLabels.getContentElement().getDomElement()==null)||
				(drawingCanvas.getContext2d()==null)||
				(imgCanvas.getContext2d()==null))
				{
//					console.log("not yet ready");
					setTimeout(waitForinit, 100);
				}
			else
			{
//				console.log("ready");
				volView.__htmlCanvasLabels = volView.__embedObjectLabels.getContentElement().getDomElement().firstChild;
				volView.__htmlContextLabels = volView.__htmlCanvasLabels.getContext("2d");
				volView.__drawingCanvasParams.drawingContext = drawingCanvas.getContext2d();
                volView.__imgCanvasParams.imgContext = imgCanvas.getContext2d();

				volView.__htmlCanvasImage = volView.__embedObjectImage.getContentElement().getDomElement().firstChild;
				volView.__htmlContextImage = volView.__htmlCanvasImage.getContext("2d");
				
				
				volView.__drawingCanvasParams.drawingContext.setTransform(volView.__display.curCtxtZoom,0,0,volView.__display.curCtxtZoom,0,0);
				volView.__drawingCanvasParams.drawingContext.mozImageSmoothingEnabled = false;
				volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
				volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
				volView.__htmlContextLabels.lineWidth = volView.__drawingCanvasParams.myLineWidth*volView.__display.curCtxtZoom;
				volView.__htmlContextLabels.lineCap = volView.__drawingCanvasParams.myLineCap;
				volView.__htmlContextLabels.lineJoin = volView.__drawingCanvasParams.myLineJoin;
				volView.__htmlContextLabels.miterLimit = volView.__drawingCanvasParams.myMiterLimit;
				volView.__htmlContextLabels.setTransform(volView.__display.curCtxtZoom,0,0,volView.__display.curCtxtZoom,0,0);
				volView.__htmlContextLabels.mozImageSmoothingEnabled = false;
				
				
				drawingCanvas.addListener("redraw", volView.__updateContext, volView);
				drawingCanvas.addListener("mousedown", volView.__mouseDownHandler, volView);
				drawingCanvas.addListener("mousewheel", volView.__mouseWheelHandler, volView);
				drawingCanvas.addListener("mousemove", volView.__mouseMoveHandler, volView);
				drawingCanvas.addListener("mouseup", volView.__mouseUpHandler, volView);
				drawingCanvas.addListener("mouseover", volView.__mouseOverHandler, volView);
				
				
				imgCanvas.addListener("redraw", function(event)
				{
	//~ this.debug("1828 : >>>>>>>   addListener(redraw, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
					volView.__htmlContextImage.drawImage(volView.__loadImage, 0, 0);
					volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage, 0, 0);
		        });

				imgCanvas.addListener("mousemove", function(event)
				{
	//~ this.debug("1835 : >>>>>>>   addListener(mousemove, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
					if((tools.__eraserCursor!=null)&&(!volView.__isSegWindow))
						tools.__eraserCursor.capture();
					if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
						volView.__eraseFnct(true);
				},this);
			
				imgCanvas.addListener("mouseover", function(event)
				{
	//~ this.debug("1844 : >>>>>>>   addListener(mouseover, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
					if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
						volView.__eraseFnct(true);
					
					//~ if(volView.__drawingCanvas != null)
						//~ volView.__drawingCanvas.resetCursor();
					//~ if(tools.__eraserCursor != null)
						//~ tools.__eraserCursor.resetCursor();
					
				},this);
			
				imgCanvas.addListener("mousedown", function(event)
				{
	//~ this.debug("1855 : >>>>>>>   addListener(mousedown, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
					if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
						if(tools.__eraserCursor!=null)
							tools.__eraserCursor.capture();
							
					//~ if(volView.__drawingCanvas != null)
						//~ volView.__drawingCanvas.resetCursor();
					//~ if((tools.__eraserCursor != null)&&(!volView.__isSegWindow))
						//~ tools.__eraserCursor.resetCursor();
					
				},this);
			
				spinner.setValue(Math.round(volView.__dimensions[2]/2));
				volView.setReady(true);
			}
		}
		waitForinit();

		volView.__window.open();

		/* ************************************************************************************************************************************* */
		//
		//	F U N C T I O N S
		//
		/* ************************************************************************************************************************************* */
		
		////Function applies zoom to image and drawing cavas
			var drawZoomedCanvas = function(zoomFactor,movement, curView)
            {
//~ volView.debug("------->>>   volView.__drawZoomedCanvas : function()   !!!!!!!");
				var sx = volView.__display.hrzntlShift/zoomFactor;
				var sy = volView.__display.vrtclShift/zoomFactor;
                var sdw = volView.__scaledWidth/zoomFactor;
                var sdh = volView.__scaledHeight/zoomFactor;
				var dx = 0;
				var dy = 0;
				var dw = 0;
				var dh = 0;
				if(volView.__scaledWidth<volView.__display.hrzntlShift/zoomFactor+volView.__scaledWidth/zoomFactor)
					sdw = sdw - (volView.__display.hrzntlShift/zoomFactor+volView.__scaledWidth/zoomFactor - volView.__scaledWidth);
				if(volView.__scaledHeight<volView.__display.vrtclShift/zoomFactor+volView.__scaledHeight/zoomFactor)
					sdh = sdh - (volView.__display.vrtclShift/zoomFactor+volView.__scaledHeight/zoomFactor - volView.__scaledHeight);
				if(volView.__display.hrzntlShift<0)
				{
					dx =  - volView.__display.hrzntlShift/zoomFactor;
					//~ if(zoomFactor<1)
						//~ dx =  - volView.__display.hrzntlShift*zoomFactor;
				}
				if(volView.__display.vrtclShift<0)
				{
					dy =  - volView.__display.vrtclShift/zoomFactor;
					//~ if(zoomFactor<1)
						//~ dy =  - volView.__display.vrtclShift*zoomFactor;
				}
			////Make sure all variables respect their allowed value range
				dx = avoidEscaping(dx, 0, volView.__scaledWidth-1);
				dy = avoidEscaping(dy, 0, volView.__scaledHeight-1);
				dw = avoidEscaping(sdw, 1, volView.__scaledWidth);
				dh = avoidEscaping(sdh, 1, volView.__scaledHeight);
				sx = avoidEscaping(sx*volView.__scale[0], 0, volView.__dimensions[0] - 1);
				sy = avoidEscaping(sy*volView.__scale[1], 0, volView.__dimensions[1] - 1);
				//~ sdw = Math.floor(sdw*volView.__scale[0]);
				sdw = sdw*volView.__scale[0]; //~ zoomOUT : comment
				//~ sdw = avoidEscaping(sdw*volView.__scale[0], 1, volView.__dimensions[0] - sx); //~ zoomOUT
				sdw = Math.floor(sdw);
				//~ if(sdw<1)
				//~ {
					//~ sdw = 1;
					//~ sx = volView.__dimensions[0] - 1;
				//~ }
				//~ sdh = Math.floor(sdh*volView.__scale[1]);
				sdh = sdh*volView.__scale[1]; //~ zoomOUT : comment
				//~ sdh = avoidEscaping(sdh*volView.__scale[1], 1, volView.__dimensions[1] - sy); //~ zoomOUT
				sdh = Math.floor(sdh);
				//~ if(sdh<1)
				//~ {
					//~ sdh = 1;
					//~ sy = volView.__dimensions[0] - 1;
				//~ }
					//~ if(sx+sdw>volView.__dimensions[0])
					//~ {
						//~ sx = volView.__dimensions[0] - sdw;
					//~ }		
					//~ if(sy+sdh>volView.__dimensions[1])
					//~ {
						//~ sy = volView.__dimensions[1] - sdh;
					//~ }
				if(false)
				{
					volView.debug("<<<<<<<   drawZoomedCanvas   >>>>>>>");
					//~ volView.debug("volView.__display.hrzntlShift : " + volView.__display.hrzntlShift);
					//~ volView.debug("volView.__display.vrtclShift : " + volView.__display.vrtclShift);
					//~ volView.debug("zoomFactor : " + zoomFactor);
					//~ volView.debug("movement : " + movement);
					volView.debug("sx : " + sx);
					volView.debug("sy : " + sy);
					volView.debug("sdw : " + sdw);
					volView.debug("sdh : " + sdh);
					volView.debug("dx : " + dx);
					volView.debug("dy : " + dy);
					volView.debug("dw : " + dw);
					volView.debug("dh : " + dh);
					/*
					volView.debug("volView.__scale[0] : " + volView.__scale[0]);
					volView.debug("volView.__scale[1] : " + volView.__scale[1]);
					volView.debug("sx*volView.__scale[0] : " + sx*volView.__scale[0]);
					volView.debug("sy*volView.__scale[1] : " + sy*volView.__scale[1]);
					volView.debug("dx*volView.__scale[0] : " + dx*volView.__scale[0]);
					volView.debug("dy*volView.__scale[1] : " + dy*volView.__scale[1]);
					volView.debug("sdw*volView.__scale[0] : " + sdw*volView.__scale[0]);
					volView.debug("sdh*volView.__scale[1] : " + sdh*volView.__scale[1]);
					volView.debug("dw*volView.__scale[0] : " + dw*volView.__scale[0]);
					volView.debug("dh*volView.__scale[1] : " + dh*volView.__scale[1]);
					volView.debug("sx/volView.__scale[0] : " + sx/volView.__scale[0]);
					volView.debug("sy/volView.__scale[1] : " + sy/volView.__scale[1]);
					volView.debug("dx/volView.__scale[0] : " + dx/volView.__scale[0]);
					volView.debug("dy/volView.__scale[1] : " + dy/volView.__scale[1]);
					volView.debug("sdw/volView.__scale[0] : " + sdw/volView.__scale[0]);
					volView.debug("sdh/volView.__scale[1] : " + sdh/volView.__scale[1]);
					volView.debug("dw/volView.__scale[0] : " + dw/volView.__scale[0]);
					volView.debug("dh/volView.__scale[1] : " + dh/volView.__scale[1]);
					*/
					volView.debug("volView.__dimensions[0] : " + volView.__dimensions[0]);
					volView.debug("volView.__dimensions[1] : " + volView.__dimensions[1]);
					/*
					volView.debug("volView.__dimensions[0]*volView.__scale[0] : " + volView.__dimensions[0]*volView.__scale[0]);
					volView.debug("volView.__dimensions[1]*volView.__scale[1] : " + volView.__dimensions[1]*volView.__scale[1]);
					volView.debug("volView.__dimensions[0]/volView.__scale[0] : " + volView.__dimensions[0]/volView.__scale[0]);
					volView.debug("volView.__dimensions[1]/volView.__scale[1] : " + volView.__dimensions[1]/volView.__scale[1]);
					*/
					/*
					volView.debug("volView.__dimensions[0]*zoomFactor : " + volView.__dimensions[0]*zoomFactor);
					volView.debug("volView.__dimensions[1]*zoomFactor : " + volView.__dimensions[1]*zoomFactor);
					volView.debug("volView.__dimensions[0]/zoomFactor : " + volView.__dimensions[0]/zoomFactor);
					volView.debug("volView.__dimensions[1]/zoomFactor : " + volView.__dimensions[1]/zoomFactor);
					*/
					volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
					volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);
					/*
					volView.debug("volView.__scaledWidth*volView.__scale[0] : " + volView.__scaledWidth*volView.__scale[0]);
					volView.debug("volView.__scaledHeight*volView.__scale[1] : " + volView.__scaledHeight*volView.__scale[1]);
					volView.debug("volView.__scaledWidth/volView.__scale[0] : " + volView.__scaledWidth/volView.__scale[0]);
					volView.debug("volView.__scaledHeight/volView.__scale[1] : " + volView.__scaledHeight/volView.__scale[1]);
					*/
					/*
					volView.debug("volView.__scaledWidth*zoomFactor : " + volView.__scaledWidth*zoomFactor);
					volView.debug("volView.__scaledHeight*zoomFactor : " + volView.__scaledHeight*zoomFactor);
					volView.debug("volView.__scaledWidth/zoomFactor : " + volView.__scaledWidth/zoomFactor);
					volView.debug("volView.__scaledHeight/zoomFactor : " + volView.__scaledHeight/zoomFactor);
					*/
					/*
					volView.debug("volView.__htmlCanvasLabels.width : " + volView.__htmlCanvasLabels.width);
					volView.debug("volView.__htmlCanvasLabels.height : " + volView.__htmlCanvasLabels.height);
					volView.debug("volView.__drawingCanvas.width : " + volView.__drawingCanvas.getWidth());
					volView.debug("volView.__drawingCanvas.height : " + volView.__drawingCanvas.getHeight());
					*/
					/*
					volView.debug("volView.__htmlCanvasImage.width : " + volView.__htmlCanvasImage.width);
					volView.debug("volView.__htmlCanvasImage.height : " + volView.__htmlCanvasImage.height);
					volView.debug("imgCanvas.width : " + imgCanvas.getWidth());
					volView.debug("imgCanvas.height : " + imgCanvas.getHeight());
					*/
					volView.debug("<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>");
				}
				volView.__drawingCanvasParams.drawingContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
				volView.__imgCanvasParams.imgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
				var borderFlag = true;
			////Refresh image while drawing
				if(movement)
				{
					if(volView.__loadImage.complete)
					{
						volView.__htmlContextImage.drawImage(volView.__loadImage, 0, 0);
						var outImg = volView.__processBrCr(volView.__imgCanvasParams.brightness, volView.__imgCanvasParams.contrast, true, volView);
						volView.__htmlContextImage.putImageData(outImg, 0, 0);
						var tempFill = volView.__imgCanvasParams.imgContext.fillStyle;
						volView.__imgCanvasParams.imgContext.fillStyle = '#4682B4';
						volView.__imgCanvasParams.imgContext.fillRect(0, 0, volView.__dimensions[0]*volView.__scaledWidth+32, volView.__dimensions[1]*volView.__scaledHeight+32);
						volView.__imgCanvasParams.imgContext.fillStyle = tempFill;
					if(borderFlag)
					{
						var tempImgBounds = drawBorder(zoomFactor, sx, sy, sdw, sdh, dx, dy, dw, dh, true); //~ compute new bounds when using border
						volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage,
																		sx,
																		sy,
																		sdw,
																		sdh,
																		tempImgBounds[0],
																		tempImgBounds[1],
																		tempImgBounds[2],
																		tempImgBounds[3]);
					}
					else
						volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage,
																		sx,
																		sy,
																		sdw,
																		sdh,
																		dx,
																		dy,
																		dw,
																		dh);
					}
					else
					{
						volView.__htmlContextImage.clearRect(-16, -16, volView.__dimensions[0]*volView.__scaledWidth+32, volView.__dimensions[1]*volView.__scaledHeight+32);
						volView.__htmlContextImage.font = 'bold 21px sans-serif';
						volView.__htmlContextImage.textBaseLine = 'bottom';
						volView.__htmlContextImage.fillText('Image not yet loaded', (volView.__scaledWidth-volView.__scaledHeight)/2, volView.__scaledHeight/2);
						volView.__imgCanvasParams.imgContext.clearRect(-16, -16, volView.__dimensions[0]*volView.__scaledWidth+32, volView.__dimensions[1]*volView.__scaledHeight+32);
					}
				}
			if(borderFlag)
			{
				var tempDrawingBounds = drawBorder(zoomFactor, sx, sy, sdw, sdh, dx, dy, dw, dh, false); //~ compute new bounds when using border
				dx = tempDrawingBounds[0];
				dy = tempDrawingBounds[1];
				dw = tempDrawingBounds[2];
				dh = tempDrawingBounds[3];
			}
				volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__dimensions[0]*volView.__scaledWidth+32, volView.__dimensions[1]*volView.__scaledHeight+32);
				if(volView.__master.__tools.isVisible())
				{
					volView.__drawingCanvasParams.drawingContext.drawImage(volView.__htmlCanvasLabels,
																			sx,
																			sy,
																			sdw,
																			sdh,
																			dx,
																			dy,
																			dw,
																			dh);
				}
		//~ volView.debug("</drawZoomedCanvas>");
			};
			
			volView.__drawZoomedCanvas = drawZoomedCanvas;
			
			
			
			var avoidEscaping = function(var2Limit, varMin, varMax)
            {
				if(var2Limit<varMin)
					var2Limit = varMin;
				if(var2Limit>varMax)
					var2Limit = varMax;
					
				return var2Limit;
			};
			
			
			
			var drawBorder = function(zoomFactor, sx, sy, sdw, sdh, old_dx, old_dy, old_dw, old_dh, drawOnly)
            {
				var newBounds = []; //~ will contain respectively  dx, dy, dw and dh  to use
					newBounds[0] = old_dx;
					newBounds[1] = old_dy;
					newBounds[2] = old_dw;
					newBounds[3] = old_dh;
				
				var whatContext = volView.__imgCanvasParams.imgContext;
				whatContext.strokeStyle = '#FD8C00';
				whatContext.lineWidth = volView.__imageBorder;
				
				var drawNorth = false;
				var drawWest = false;
				var drawSouth = false;
				var drawEast = false;
				
					var southMax = Math.floor(volView.__dimensions[1]/zoomFactor - 1);
					var eastMax = Math.floor(volView.__dimensions[0]/zoomFactor - 1);
				//~ if((zoomFactor==1)&&(((sx==0)&&(old_dx==0))||((sy==0)&&(old_dy==0))))
				//~ {
				//~ volView.debug("'if' is positive !");
					if((sx==0)&&(old_dx==0)&&(zoomFactor==1))
					{
						newBounds[0] = volView.__imageBorder; //~ new dx
						newBounds[2] = old_dw - 2*volView.__imageBorder; //~ new dw
						drawWest = true;
						drawEast = true;
					}
					if((sy==0)&&(old_dy==0)&&(zoomFactor==1))
					{
						newBounds[1] = volView.__imageBorder; //~ new dy
						newBounds[3] = old_dh - 2*volView.__imageBorder; //~ new dh
						drawNorth = true;
						drawSouth = true;
					}
				//~ }
				//~ else
				//~ {
				//~ volView.debug("doing else...");
					if(old_dy>0)	//// North border will be drawn
					{
						newBounds[1] = old_dy + volView.__imageBorder;
						newBounds[3] = newBounds[3] - volView.__imageBorder;
						drawNorth = true;
					}
					if(old_dx>0)	//// West border will be drawn
					{
						newBounds[0] = old_dx + volView.__imageBorder;
						newBounds[2] = newBounds[2] - volView.__imageBorder;
						drawWest = true;
					}
					//~ var southMax = Math.floor(volView.__dimensions[1]/zoomFactor - 1);
					if((sy>0)&&(sdh<=southMax))	//// South border will be drawn
					{
						newBounds[3] = newBounds[3] - volView.__imageBorder;
						drawSouth = true;
					}
					//~ var eastMax = Math.floor(volView.__dimensions[0]/zoomFactor - 1);
					if((sx>0)&&(sdw<=eastMax))	//// East border will be drawn
					{
						newBounds[2] = newBounds[2] - volView.__imageBorder;
						drawEast = true;
					}
				//~ }
			//~ volView.debug("N:" + drawNorth + ", W:" + drawWest + ", S:" + drawSouth + ", E:" + drawEast);
			//// Draw borders if necessary
				if(drawOnly)
				{
					var xCoord;
					var yCoord;
					//// Draw North border
					if(drawNorth==true)
					{
						var xExtension = 0;
						if(drawWest==true)
						{
							xCoord = newBounds[0]-volView.__imageBorder;
							xExtension = volView.__imageBorder;
						}
						else
						{
							xCoord = 0;
						}
						yCoord = newBounds[1]-volView.__imageBorder + volView.__imageBorder/2;
						whatContext.beginPath();
						whatContext.moveTo(xCoord, yCoord);
						whatContext.lineTo(newBounds[2]+volView.__imageBorder + xExtension, yCoord);
						whatContext.stroke();
						whatContext.closePath();
					}
					//// Draw West border
					if(drawWest==true)
					{
						var yExtension = 0;
						if(drawNorth==true)
						{
							yCoord = newBounds[1]-volView.__imageBorder;
							yExtension = volView.__imageBorder;
						}
						else
						{
							yCoord = 0;
						}
						xCoord = newBounds[0]-volView.__imageBorder + volView.__imageBorder/2;
						whatContext.beginPath();
						whatContext.moveTo(xCoord, yCoord);
						whatContext.lineTo(xCoord, newBounds[3]+volView.__imageBorder + yExtension);
						whatContext.stroke();
						whatContext.closePath();
					}
					//// Draw South border
					if(drawSouth==true)
					{
						var xShift = -volView.__imageBorder/2;
						var xExtension = 0;
						if(drawWest==true)
							xCoord = newBounds[0]-volView.__imageBorder;
						else
							xCoord = 0;
						if(drawNorth==true)
						{
							xShift = volView.__imageBorder/2;
							if(drawWest==true)
								xExtension = volView.__imageBorder;
						}
						yCoord = newBounds[3]+volView.__imageBorder + xShift;
						whatContext.beginPath();
						whatContext.moveTo(xCoord, yCoord);
						whatContext.lineTo(newBounds[2]+volView.__imageBorder + xExtension, yCoord);
						whatContext.stroke();
						whatContext.closePath();
					}
					//// Draw East border
					if(drawEast==true)
					{
						var yShift = -volView.__imageBorder/2;
						var yExtension = 0;
						if(drawNorth==true)
							yCoord = newBounds[1]-volView.__imageBorder;
						else
							yCoord = 0;
						if(drawWest==true)
						{
							yShift = volView.__imageBorder/2;
							if(drawNorth==true)
								yExtension = volView.__imageBorder;
						}
						xCoord = newBounds[2]+volView.__imageBorder + yShift;
						whatContext.beginPath();
						whatContext.moveTo(xCoord, yCoord);
						whatContext.lineTo(xCoord, newBounds[3]+volView.__imageBorder + yExtension);
						whatContext.stroke();
						whatContext.closePath();
					}
				}
				
				if((!drawNorth)&&(!drawWest)&&(!drawSouth)&&(!drawEast))
				{
					newBounds[2] = newBounds[2] + volView.__imageBorder;
					newBounds[3] = newBounds[3] + volView.__imageBorder;
				}
				
				return newBounds;
			};
			
            
            
		},
		
       ////Create and add the jpeg/png format select box
       __getFormatSelectBox : function()
		{
this.debug("------->>>   volView.__getFormatSelectBox : function()   !!!!!!!");

			var volView = this;
			
			var selectBox= new qx.ui.form.SelectBox();
			selectBox.set({width: 52});
			var JPGFormat = new qx.ui.form.ListItem("jpg");
			JPGFormat.setUserData("path",volView.__pathJPG);
			selectBox.add(JPGFormat);
			var PNGFormat = new qx.ui.form.ListItem("png");
			selectBox.add(PNGFormat);
			
			selectBox.addListener('changeSelection', function (e){
	//~ this.debug("2258 : >>>>>>>   addListener(changeSelection, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
			//console.log("change...");
				var path=selectBox.getSelection()[0].getUserData("path");
				switch(path)
				{
				case null :
					//~ //we need to compute png slices : launch action"
					var parameterMap={
						"action" : "slice_volume",
						"input_volume" : volView.__file,
						"output_directory" : "cache\/",
						"format" : "0"};
					//~ segColor test
					if(volView.__isSegWindow)
					{
						parameterMap.action = "slice_volume_color";
						parameterMap.format = "0";
					}
				//~ orion test (change orientation param in volume_slice action : actions.xml)
					parameterMap.slice_orientation = volView.__display.orientation;
					var slicingLabel=new qx.ui.basic.Label("computing...");
					volView.__topLeftContainer.addAfter(slicingLabel,selectBox);
					function getAnswer(e)
					{
						var req = e.getTarget();
						var slicesDirectory=req.getResponseText().split("\n")[0];
						PNGFormat.setUserData("path",
							volView.__fileBrowser.getFileURL(slicesDirectory));
						volView.__topLeftContainer.remove(slicingLabel);
						selectBox.setSelection([PNGFormat]);
					}

					PNGFormat.setUserData("path","computing");
					// switch back to before computing is done png
					selectBox.setSelection([JPGFormat]);
					selectBox.close();
					volView.__topLeftContainer.addAfter(slicingLabel,selectBox);
					volView.__fileBrowser.getActions().launchAction(parameterMap, getAnswer, this);
					break;
				case "computing":
					// slices are being computed. re-switch to jpg
					selectBox.setSelection([JPGFormat]);
					selectBox.close();
					break;
				default :
					// slices are ready (PNG or JPG)
					volView.__updateImage();
				}}, this);
			return (selectBox);
		},
		
       ////Create and add the orientation select box
       //~ orion test
       __getOrientationSelectBox : function()
		{
this.debug("------->>>   volView.__getOrientationSelectBox : function()   !!!!!!!");

			var volView = this;
			
			var selectBox= new qx.ui.form.SelectBox();
			selectBox.set({width: 64});
			var XY__Z = new qx.ui.form.ListItem("Z : XY");
			selectBox.add(XY__Z);
			XY__Z.setUserData("index","0");
			XY__Z.setUserData("path",volView.__pathJPG);
			var ZY__X = new qx.ui.form.ListItem("X : ZY");
			ZY__X.setUserData("index","1");
			selectBox.add(ZY__X);
			var XZ__Y = new qx.ui.form.ListItem("Y : XZ");
			XZ__Y.setUserData("index","2");
			selectBox.add(XZ__Y);
			selectBox.setSelection([selectBox.getChildren()[volView.__display.orientation]]);
			
			selectBox.addListener('changeSelection', function (e)
			{
	//~ this.debug("2631 : >>>>>>>   addListener(changeSelection, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				var volView = this;
				
				volView.__display.orientation = selectBox.getSelection()[0].getUserData("index");
				
				var selected = selectBox.getSelection()[0];
				var path = selected.getUserData("path");
				switch(path)
				{
					case null :
						//~ //we need to compute png slices : launch action"
						var parameterMap={
							"action" : "slice_volume",
							"input_volume" : volView.__file,
							"output_directory" : "cache\/",
							"format" : "1"};
						//~ segColor test
						if(volView.__isSegWindow)
						{
							parameterMap.action = "slice_volume_color";
							parameterMap.format = "0";
						}
						
					//~ orion test (change orientation param in volume_slice action : actions.xml)
						parameterMap.slice_orientation = volView.__display.orientation;
						
						function getAnswer(e)
						{
							var req = e.getTarget();
							var slicesDirectory=req.getResponseText().split("\n")[0];
							selected.setUserData("path",
								volView.__fileBrowser.getFileURL(slicesDirectory));
						}
						
						selected.setUserData("path","computing");
						selectBox.close();
						volView.__fileBrowser.getActions().launchAction(parameterMap, getAnswer, this);
						break;
					case "computing":
						selectBox.close();
						break;
					default :
						// slices are ready (PNG or JPG)
						volView.__updateImage();
				}
				
				if (volView.__fileBrowser!=null)
				{
					volView.__setVolume(volView.__file, volView.__fileBrowser);
					volView.__updateVolume(true);
				}
				else
					alert ("error : no filebrowser provided for volView");
					
			}, this);
			
			return (selectBox);
			
		},
		
		__getDragAndDropLabel : function ()
		{
this.debug("------->>>   volView.__getDragAndDropLabel : function()   !!!!!!!");

			var volView  = this;
			
			var dragLabel=new qx.ui.basic.Label("Link").set({
        decorator: "main"});
			// drag and drop support
			dragLabel.setDraggable(true);
			dragLabel.addListener("dragstart", function(e) {
	//~ this.debug("2700 : >>>>>>>   addListener(dragstart, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				e.addAction("alias");
				e.addType("volumeSlice");
				});

			dragLabel.addListener("droprequest", function(e) {
	//~ this.debug("2706 : >>>>>>>   addListener(droprequest, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
					var type = e.getCurrentType();
					switch (type)
					{
					case "volumeSlice":
						e.addData(type, volView);
						break;
					default :
						alert ("type "+type+"not supported for drag and drop");
					}
				}, this);

		// enable linking between volume viewers by drag and drop
			volView.__mainLeftContainer.setDroppable(true);
			volView.__mainLeftContainer.addListener("drop", function(e) {
	//~ this.debug("2721 : >>>>>>>   addListener(drop, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				if (e.supportsType("volumeSlice"))
				{
					volView.linkToVolumeViewer(e.getData("volumeSlice"));
				}
				else
				{
					alert("drop type not allowed for this widget!");
				}
			},this);

			// add listener on close window event to remove bindings
			volView.__window.addListener("beforeClose", function (e){
	//~ this.debug("2734 : >>>>>>>   addListener(beforeClose, function(event)   !!!!!!!!!!!!!!!!!!!!!!!!!");
				//~ volView.__saveDisplay(); //~ Sorry, there's problems with this. Try again later...
				var bindings=volView.__spinner.getBindings();
				// according to the documentation, getBindings returns : An array of binding informations. 
				//Every binding information is an array itself containing 
				//	id,
                //  sourceObject,
				//	sourceEvent,
				//	targetObject,
				//	targetProperty.
				for (var i=0;i<bindings.length;i++)
				{
					var binding=bindings[i];
					var targetObject=binding[3];
					// loop through all target bindings to remove the reverse binding
					var targetBindings=targetObject.getBindings();
					for (var j=0;j<targetBindings.length;j++)
					{
						var targetBinding=targetBindings[j];
						if(volView.__spinner==targetBinding[3])
						{
							targetObject.removeBinding(targetBinding[0]);
							break;
						}
					}
				}
				volView.__spinner.removeAllBindings();
			},this);
				
			return dragLabel;
		},
		
		
		
		__createSeedsLists : function()
		{
this.debug("------->>>   volView.__createSeedsLists : function()   !!!!!!!");
			var volView = this;
			
			var tools = volView.__master.__tools;
			
			var theMaster = volView.__master;
			
			var volFile = volView.__file;
			
			var fileBrowser = volView.__fileBrowser;
			
			
			
			// create seeds list
			var seedsList=new qx.ui.form.List();
			seedsList.setWidth(30);
			seedsList.setScrollbarY("off");
			var winTitleBarHeight = 26;
			var displayBorder = volView.getContentPaddingBottom();
			tools.getLayoutParent().add(seedsList,
										{left:volView.getBounds().left + volView.getBounds().width + 5,
										top: volView.getBounds().top + winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + displayBorder});
			seedsList.set({height:volView.__slider.getBounds().height, zIndex:volView.getZIndex()});
			seedsList.setVisibility("excluded");
			
			
			
			// create corrections list
			var correctionsList=new qx.ui.form.List();
			correctionsList.setWidth(30);
			correctionsList.setScrollbarY("off");
			tools.getLayoutParent().add(correctionsList,
										{left:volView.getBounds().left + volView.getBounds().width + 5,
										top: volView.getBounds().top + winTitleBarHeight + volView.__mainLeftContainer.getChildren()[0].getBounds().height + volView.__mainLeftContainer.getLayout().getSpacing() + displayBorder});
			correctionsList.set({height:volView.__slider.getBounds().height, zIndex:volView.getZIndex()});
			correctionsList.setVisibility("excluded");
			
			
			
			seedsList.addListener("removeItem", function(event) {
//~ volView.debug("seedsList.addListener(removeItem, function(event) !!!");
				if (seedsList.getChildren().length==0)
					tools.__startSegmentationButton.setEnabled(false);
				}, this);

			seedsList.addListener("addItem", function(event) {
//~ volView.debug("seedsList.addListener(addItem, function(event) !!!");
				tools.__startSegmentationButton.setEnabled(true);
				}, this);
			
			
			var keyPressHandler = function(event)
			{
volView.debug("var keyPressHandler = function(event) !!!");
				if(event.getKeyIdentifier()=="Delete")
				{
					var selectedChild = this.getSelection()[0];
					if (selectedChild!=null)
					{
						var sliceId = selectedChild.getUserData("slice");
					////Erase image on the server
						theMaster.__eraseFile(tools.getSessionDirectory()+"/"+volView.__getSeedFileName(sliceId));
						tools.__seedsTypeSelectBox.getSelection()[0].getUserData("seedsArray")[volView.__display.orientation][sliceId]=0;
						volView.__clearDrawingCanvas();
						this.remove(selectedChild); //  this  : the given List (see below)
			//~ volView.debug(" 2968 : addListener(keypress, function(event) : theMaster.__saveSeedsXML(); !");
						theMaster.__saveSeedsXML();
					}
				}
			};
			seedsList.addListener("keypress", keyPressHandler, seedsList);
			correctionsList.addListener("keypress", keyPressHandler, correctionsList);
			
			
			
			var createdLists = [];
			createdLists[0] = seedsList;
			createdLists[1] = correctionsList;
			
			
			return createdLists;
			
			
		},
		
		__getSeedsLists : function(key,seedsTypeListItem)
		{
//~ this.debug("------->>>   volView.__getSeedsLists : function()   !!!!!!!");

			volView = this;
			
			var seedsList = null;
			var seedsTypeSelectBox = volView.__master.__tools.__seedsTypeSelectBox;
			if(seedsTypeSelectBox!=null)
			{
				var mySeedsTypeListItem = null;
				if(seedsTypeListItem!=null)
					mySeedsTypeListItem = seedsTypeListItem;
				else
					mySeedsTypeListItem = seedsTypeSelectBox.getSelection()[0];
				if(mySeedsTypeListItem!=null)
				{
					seedsList = mySeedsTypeListItem.getUserData(key)[volView.getUserData("viewerIndex")];
				}
			}
			
			return seedsList;
		},
		
		__addNewSeedItemToList : function (sliceId, seedsTypeListItem)
		{
this.debug("------->>>   volView.__addNewSeedItemToList : function()   !!!!!!!");

			var volView = this;
			
			var tools = volView.__master.__tools;
			
			var theMaster = volView.__master;
			
			var volFile = volView.__file;
			
			var fileBrowser = volView.__fileBrowser;
			
			
//~ volView.debug("3168 : seedsTypeListItem : " + seedsTypeListItem);
			if (seedsTypeListItem==null)
				seedsTypeListItem=tools.__seedsTypeSelectBox.getSelection()[0];

			var sliceItem = new qx.ui.form.ListItem(""+ sliceId);
			sliceItem.setUserData("slice",sliceId);
			sliceItem.addListener("click", function(event)
			{
//~ volView.debug("sliceItem.addListener(click, function(event) !!!");
				volView.__spinner.setValue(event.getTarget().getUserData("slice"));
			}, this);
			
			var seedsList = volView.__getSeedsLists("seedsList",seedsTypeListItem);
//~ volView.debug("3180 : seedsList : " + seedsList);
			var seeds = seedsList.getChildren();
			var tempPos = 0;
//~ volView.debug("3183 : seeds.length : " +seeds.length);
			for(var i=0; i<seeds.length; i++)
			{
				if(seeds[i].getUserData("slice")>sliceId)
					tempPos++;
			}
			seedsList.addAt(sliceItem, tempPos);
			
			var seedsArray=seedsTypeListItem.getUserData("seedsArray")[volView.__display.orientation];
//~ volView.debug("3192 : seedsArray : " + seedsArray);
			seedsArray[sliceId] = sliceItem;
//~ volView.debug("3194 : seedsArray : " + seedsArray);
		},
		
		__getSeedFileName : function(sliceId, seedsTypeSelectBoxItem)
		{
//~ this.debug("------->>>   volView.__getSeedFileName : function()   !!!!!!!");

			var volView = this;
			
			var tools = volView.__master.__tools;
			
			var theMaster = volView.__master;
			
			var volFile = volView.__file;
			
			var fileBrowser = volView.__fileBrowser;
			
			
			if (seedsTypeSelectBoxItem==null)
				seedsTypeSelectBoxItem=tools.__seedsTypeSelectBox.getSelection()[0];
			var filePrefix = seedsTypeSelectBoxItem.getUserData("filePrefix");
			//~ orion test (change orientation param in volume_slice action : actions.xml)
			switch(volView.__display.orientation)
			{
				// ZY X
				case 1 :
					return filePrefix +"ZY"+(volView.__slicesNameOffset + sliceId) +".png";
					break;
				// XZ Y
				case 2 :
					return filePrefix +"XZ"+(volView.__slicesNameOffset + sliceId) +".png";
					break;
				// XY Z
				default :
					return filePrefix +"XY"+(volView.__slicesNameOffset + sliceId) +".png";
			}
		},
		
		__saveCurrentSeeds : function(callback)
		{
this.debug("------->>>   volView.__saveCurrentSeeds : function()   !!!!!!!");

			var volView = this;
			
			var tools = volView.__master.__tools;
			
			var theMaster = volView.__master;
			
			var volFile = volView.__file;
			
			var fileBrowser = volView.__fileBrowser;
			
			
			var launchCallBack = false;
			
			
			var oldSliceIndex = volView.__display.depthShift;
			
			if (volView.__currentSeedsModified!=false)
			{
				var sliceData = volView.__htmlContextImage.getImageData(0, 0, volView.__dimensions[0], volView.__dimensions[1]);
				var pixels = sliceData.data;
				var seeds = volView.__htmlContextLabels.getImageData(0, 0, volView.__dimensions[0], volView.__dimensions[1]).data;
				var isAllBlack = true;
				var labelColors = tools.__labelColors;
				for(var i=0; i<seeds.length; i+=4)
				{
					if(128<=seeds[i+3])  //  if( color is solid not totally transparent, ie. alpha=0) <-> if( not background )
					{
						var dRed = 0;
						var dGreen = 0;
						var dBlue = 0;
						var distance = 500000;
						var rightColorIndex = 0;
						for(var j=0; j!=labelColors.length; j++)
						{
							var color=labelColors[j];
							dRed = color.red-seeds[i];
							dGreen = color.green-seeds[i+1];
							dBlue = color.blue-seeds[i+2];
							var testD = dRed*dRed+dGreen*dGreen+dBlue*dBlue;
							if(testD<distance)
							{
								distance = testD;
								rightColorIndex = j;
							}
						}
						var rightColor=labelColors[rightColorIndex];
						pixels[i] = rightColor.red;
						pixels[i+1] = rightColor.green;
						pixels[i+2] = rightColor.blue;
						pixels[i+3] = 255;
						isAllBlack = false;
					}
					////Comment "else" to send combined image
					else
					{
						pixels[i] = 0;
						pixels[i+1] = 0;
						pixels[i+2] = 0;
						pixels[i+3] = 0;
					}
				}
				if(!isAllBlack)
				{
					var numberOfRemainingRequests=2;
					var success=function (e) {
						numberOfRemainingRequests--;
						if ((numberOfRemainingRequests==0)&&(callback!=null))
						{
                            volView.__currentSeedsModified=false;
                            if (callback != null)
                               callback();
						}
					};

					////Send png image to server
					sliceData.data = pixels;
					volView.__htmlContextLabels.putImageData(sliceData, 0, 0);
					var pngImg = volView.__htmlCanvasLabels.toDataURL("image/png");
					var commaIndex=pngImg.lastIndexOf(",");
					var base64Img = pngImg.substring(commaIndex+1,pngImg.length);
					var parameterMap={
						"action" : "save_binary_file",
						"file_name" : volView.__getSeedFileName(volView.__display.depthShift),
						"base64Data" : base64Img,
						"output_directory" : tools.getSessionDirectory()};

					this.__fileBrowser.getActions().launchAction(parameterMap, success);
	//~ volView.debug("3323 : tools : " + tools);
	//~ volView.debug("3324 : tools.__seedsTypeSelectBox : " + tools.__seedsTypeSelectBox);
	//~ volView.debug("3325 : tools.__seedsTypeSelectBox.getSelection() : " + tools.__seedsTypeSelectBox.getSelection());
					var seedsTypeSelectBoxItem = tools.__seedsTypeSelectBox.getSelection()[0];
	//~ volView.debug("3327 : seedsTypeSelectBoxItem : " + seedsTypeSelectBoxItem);
	//~ volView.debug("3328 : seedsTypeSelectBoxItem.getUserData(cacheTags) : " + seedsTypeSelectBoxItem.getUserData("cacheTags"));
					seedsTypeSelectBoxItem.getUserData("cacheTags")[volView.__display.orientation][volView.__display.depthShift]=
                                            Math.random();
					if(seedsTypeSelectBoxItem.getUserData("seedsArray")[volView.__display.orientation][oldSliceIndex]==0)
						volView.__addNewSeedItemToList(oldSliceIndex);
					
					
					
					theMaster.__saveSeedsXML(success);
					
					
					
				}
				else
					launchCallBack = true;
			}
			else
				launchCallBack = true;
			
			if(launchCallBack==true)
			{
				if (callback != null)
					callback();
			}
			
		}
		
		
		
		
		
	} //// END of   members :
	
	
	
	
	
	
	
}); //// END of   qx.Class.define("desk.volView",

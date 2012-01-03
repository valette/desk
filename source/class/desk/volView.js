qx.Class.define("desk.volView", 
{
  extend : qx.ui.window.Window,

	construct : function(file, fileBrowser)
	{		
		this.base(arguments);
		this.__window=this;//new qx.ui.window.Window();

        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }

    ////Global variables

		// init 
		this.__horizSlices={
		usedSliceSeeds : [],
		sliceResults : []
		};

		this.__ctrlZData=[];

// Données pour la position de l'objet window qui contient l'interface
//(position par rapport au document <-> fenêtre de l'explorateur)
// La largeur et la hauteur sont des valeurs par défaut. Si les widgets
//dans la fenêtre ont besoin de plus d'espace, la fenêtre s'élargit
// d'elle-même...normalement...
		this.__winMap = {
			left : 16,
			top : 8,
			width : 400,
			height : 444
		};

		// Données globales pour le canvas qx.html.Canvas des seeds (utilisé pour l'affichage)
		this.__drawingCanvasParams = {
			sliceNumber : 0,
			drawingContext : null,     //Variable pour le contexte du canvas qx.html.Canvas des seeds (utilisé pour l'affichage)
			paintFlag : false,     //Indique si l'utilisateur est en train de dessiner
			eraseFlag : false,     //Indique si l'utilisateur est en train d'effacer
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
			orientation : 0,		// defines the horizontal, vertical and depth coordinates
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
			showMaximize: true,
			showClose: true,
			resizable: true,
			movable : true
			});

		this.setLayout(new qx.ui.layout.Canvas());

		if (fileBrowser!==null)
		{
			this.__setVolume(file, fileBrowser);
			this.__updateVolume(true);
		}
		else
			alert ("error : no filebrowser provided for volView");

		this.addListener("mousemove", function(event)
		{
			if((this.__mouseActionActive==true)&&(this.__mouseActionMode==4))
			{
				if(this.__drawingCanvas != null)
					this.__drawingCanvas.resetCursor();
				
				if(this.__eraserCursor != null)
					this.__eraserCursor.resetCursor();
			}
			
			
			if(this.__eraserButton!=null)
				if(this.__mouseActionMode==4)
					this.__eraserButton.setValue(true);
				else
					this.__eraserButton.setValue(false);
			
			if(this.__brghtnssCntrstButton!=null)
				if(this.__mouseActionMode==1)
					this.__brghtnssCntrstButton.setValue(true);
				else
					this.__brghtnssCntrstButton.setValue(false);
			
		}, this);
		
		this.open();
		
		return (this);

	},

	events : {
		// the "changeSlice" event is fired whenever the slice or contrast/luminosity change
		"changeSlice" : "qx.event.type.Event",
		"changeDisplay" : "qx.event.type.Event"
	},

	properties : {
	// the "ready" property is true when the UI is ready.
		ready : { init : false, check: "Boolean", event : "changeReady"},
		sessionDirectory : { init : null, event : "changeSessionDirectory"}
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

		__mainRightContainer : null,
		__topRightContainer : null,
		__bottomRightContainer : null,
		__slider : null,
		__spinner : null,
		__formatSelectBox : null,

		__segmentationInProgress : false,
		__startSegmentationButton : null,
		__extractMeshesButton : null,

		// the main tabview
		__tabView : null,

		__currentSeedsModified : false,

		__seedsTypeSelectBox : null,

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

// Tableau contenant les couleurs des seeds
         __labelColors : null,

         __imageZ : 1,     // Indice de position en z du canvas image (tout au fond)

         __MaxZoom : 8,     //Limite du zoom : x4
         __timestamp : 0,     //Valeur calculée pour différencier les images dans le caché de l'explorateur
         __eraserCoeff : 2,     //Taille gomme  =  eraserCoeff * taille crayon --> c'est plus agréable d'effacer comme ça
         __numberOfSlices : 0,     //Contient le nombre de slides récuperé à partir du fichier xml (le programme est fait pour  numberOfSlices = "z")

         __slicesNameOffset : 0,     //Contient la valeur de l'offset récuperé à partir du fichier xml
         __eraserCursorZ : 65535,     //Indice de position en z du widget qui représente la gomme (toujours devant)
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
		
		__penSize : null,
		__eraserButton : null,
		__eraserCursor : null,
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

		getWindow : function() {
			return this.__window;},

		__setVolume : function (file,fileBrowser) {
			this.__fileBrowser=fileBrowser;
			this.__file=file;
		},

		linkToVolumeViewer : function (volumeViewer)
		{
			var myVolumeViewer=this;
			function applyLink()
			{
				var displayControl = false;
				volumeViewer.__spinner.bind("value", myVolumeViewer.__spinner, "value");
				myVolumeViewer.__spinner.bind("value", volumeViewer.__spinner, "value");
				myVolumeViewer.__copyDisplay(volumeViewer,myVolumeViewer);
				myVolumeViewer.__saveDisplay();
				myVolumeViewer.addListener("changeDisplay", function(event)
				{
					if(displayControl==false)
					{
						displayControl = true;
						volumeViewer.__copyDisplay(myVolumeViewer,volumeViewer);
					}
					displayControl = false;
				});
				volumeViewer.addListener("changeDisplay", function(event)
				{
					if(displayControl==false)
					{
						displayControl = true;
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
						applyLink()});
			}

			if (volumeViewer!=this)
			{
				if (this.isReady())
					meReady();
				else
				{
					this.addListenerOnce("changeReady", function () {
						meReady();});
				}
			}
		},

		__updateVolume : function(buildUI)
		{
			var volView=this;
			
			if (buildUI===true)
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
			if(volView.__formatSelectBox!=null)
			{
				//~ volView.debug("volView.__formatSelectBox : " + volView.__formatSelectBox);
				//~ volView.debug("volView.__formatSelectBox.getSelection() : " + volView.__formatSelectBox.getSelection());
				//~ volView.debug("volView.__formatSelectBox.getSelectables() : " + volView.__formatSelectBox.getSelectables());
				var selection = volView.__formatSelectBox.getSelection();
				var selectables = volView.__formatSelectBox.getSelectables();
			}
			if((volView.__isSegWindow)&&(selection==selectables[1]))
			{
				parameterMap.action = "slice_volume_color";
				parameterMap.format = "0";
			}
			//~ orion test (change orientation param in volume_slice action : actions.xml)
			if(false)
			{
				//~ parameterMap.slice_orientaion = "1"; //~ ZY X
				parameterMap.slice_orientaion = "2"; //~ XZ Y
			}
			
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
						if(this.responseXML!==null)
						{
							var response = this.responseXML;
							var volume=response.getElementsByTagName("volume")[0];
							if (volume===null)
								return;

							//~ volView.__numberOfSlices = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("z"),10);
							volView.__slicesNameOffset = parseInt(response.getElementsByTagName("slicesprefix")[0].getAttribute("offset"),10);
							volView.__slicesNamePrefix = response.getElementsByTagName("slicesprefix")[0].firstChild.nodeValue;
							volView.__timestamp = response.getElementsByTagName("slicesprefix")[0].getAttribute("volView.__timestamp");

							if (volView.__timestamp===null)
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
					//~ orion test (change orientation param in volume_slice action : actions.xml)
					if(false)
					{
						//~ volView.__extent=new Array(tempExtent[4],
													//~ tempExtent[5],
													//~ tempExtent[2],
													//~ tempExtent[3],
													//~ tempExtent[0],
													//~ tempExtent[1]); //~ ZY X
						volView.__extent=new Array(tempExtent[0],
													tempExtent[1],
													tempExtent[4],
													tempExtent[5],
													tempExtent[1],
													tempExtent[2]); //~ XZ Y
					}
					else
					{
						volView.__extent=new Array(tempExtent[0],
													tempExtent[1],
													tempExtent[2],
													tempExtent[3],
													tempExtent[4],
													tempExtent[5]); //~ XY Z
					}
						
							//~ var XMLdimensions=volume.getElementsByTagName("dimensions")[0];
							//~ volView.__dimensions=new Array(parseInt(XMLdimensions.getAttribute("x"),10),
															//~ parseInt(XMLdimensions.getAttribute("y"),10),
															//~ parseInt(XMLdimensions.getAttribute("z"),10));
							var XMLdimensions=volume.getElementsByTagName("dimensions")[0];
							var tempDimensions=new Array(parseInt(XMLdimensions.getAttribute("x"),10),
															parseInt(XMLdimensions.getAttribute("y"),10),
															parseInt(XMLdimensions.getAttribute("z"),10));
					//~ orion test (change orientation param in volume_slice action : actions.xml)
					if(false)
					{
						//~ volView.__dimensions=new Array(tempDimensions[2],
														//~ tempDimensions[1],
														//~ tempDimensions[0]); //~ ZY X
						volView.__dimensions=new Array(tempDimensions[0],
														tempDimensions[2],
														tempDimensions[1]); //~ XZ Y
					}
					else
					{
						volView.__dimensions=new Array(tempDimensions[0],
														tempDimensions[1],
														tempDimensions[2]); //~ XY Z
					}
							
							//~ var XMLspacing=volume.getElementsByTagName("spacing")[0];
							//~ volView.__spacing=new Array(parseFloat(XMLspacing.getAttribute("x")),
														//~ parseFloat(XMLspacing.getAttribute("y")),
														//~ parseFloat(XMLspacing.getAttribute("z")));
							var XMLspacing=volume.getElementsByTagName("spacing")[0];
							var tempSpacing=new Array(parseFloat(XMLspacing.getAttribute("x")),
														parseFloat(XMLspacing.getAttribute("y")),
														parseFloat(XMLspacing.getAttribute("z")));
					//~ orion test (change orientation param in volume_slice action : actions.xml)
					if(false)
					{
						//~ volView.__spacing=new Array(tempSpacing[2],
													//~ tempSpacing[1],
													//~ tempSpacing[0]); //~ ZY X
						volView.__spacing=new Array(tempSpacing[0],
													tempSpacing[2],
													tempSpacing[1]); //~ XZ Y
					}
					else
					{
						volView.__spacing=new Array(tempSpacing[0],
													tempSpacing[1],
													tempSpacing[2]); //~ XY Z
					}
							
							//~  Faire test sur l'orientation pour choisir le bon spacing[i]							
							volView.debug("volView.__spacing[0] : " + volView.__spacing[0]);
							volView.debug("volView.__spacing[1] : " + volView.__spacing[1]);
							//~ volView.debug("volView.__spacing[2] : " + volView.__spacing[2]);
							//~ volView.__spacing[0] = 1; //~ don't use spacing
							//~ volView.__spacing[1] = 1; //~ don't use spacing
							//~ volView.__spacing[2] = 1; //~ don't use spacing
							 //~ Set min window :
							var initSizeCoeff = 0.1; //~ allows to set window at min size no matter the image dimensions
							volView.__scale = [];
							volView.__scale[0] = volView.__spacing[1]/initSizeCoeff; //~ when resizing window dimensions
							volView.__scale[1] = volView.__spacing[0]/initSizeCoeff; //~ when resizing window dimensions
							volView.__scale[2] = volView.__spacing[2]/initSizeCoeff; //~ when resizing window dimensions
							//~ volView.__scale[0] = volView.__spacing[1]; //~ use original image dimensions to create display
							//~ volView.__scale[1] = volView.__spacing[0]; //~ use original image dimensions to create display
							//~ volView.__scale[2] = volView.__spacing[2]; //~ use original image dimensions to create display
							volView.debug("volView.__dimensions[0] : " + volView.__dimensions[0]);
							volView.debug("volView.__dimensions[1] : " + volView.__dimensions[1]);
							//~ volView.debug("volView.__dimensions[2] : " + volView.__dimensions[2]);
							volView.__scaledWidth = volView.__dimensions[0]/volView.__scale[0];
							volView.__scaledHeight = volView.__dimensions[1]/volView.__scale[1];
							volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
							volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);

							volView.debug("volView.__dimensions[0]/volView.__scale[0] : " + volView.__dimensions[0]/volView.__scale[0]);
							volView.debug("volView.__dimensions[1]/volView.__scale[1] : " + volView.__dimensions[1]/volView.__scale[1]);
							volView.debug("volView.__dimensions[0]*volView.__scale[0] : " + volView.__dimensions[0]*volView.__scale[0]);
							volView.debug("volView.__dimensions[1]*volView.__scale[1] : " + volView.__dimensions[1]*volView.__scale[1]);
							//~ var XMLorigin=volume.getElementsByTagName("origin")[0];
							//~ volView.__origin=new Array(parseFloat(XMLorigin.getAttribute("x")),
														//~ parseFloat(XMLorigin.getAttribute("y")),
														//~ parseFloat(XMLorigin.getAttribute("z")));
							var XMLorigin=volume.getElementsByTagName("origin")[0];
							var tempOrigin=new Array(parseFloat(XMLorigin.getAttribute("x")),
														parseFloat(XMLorigin.getAttribute("y")),
														parseFloat(XMLorigin.getAttribute("z")));
					//~ orion test (change orientation param in volume_slice action : actions.xml)
					if(false)
					{
						//~ volView.__origin=new Array(tempOrigin[2],
													//~ tempOrigin[1],
													//~ tempOrigin[0]); //~ ZY X
						volView.__origin=new Array(tempOrigin[0],
													tempOrigin[2],
													tempOrigin[1]); //~ XZ Y
					}
					else
					{
						volView.__origin=new Array(tempOrigin[0],
													tempOrigin[1],
													tempOrigin[2]); //~ XY Z
					}

							var XMLscalars=volume.getElementsByTagName("scalars")[0];
							volView.__scalarType=parseInt(XMLscalars.getAttribute("type"),10);
							volView.__scalarSize=parseInt(XMLscalars.getAttribute("size"),10);
							volView.__scalarMin=parseFloat(XMLscalars.getAttribute("min"),10);
							volView.__scalarMax=parseFloat(XMLscalars.getAttribute("max"),10);
							
							if (buildUI)
							{
								volView.removeAll();
								volView.__buildUI();
							}
							else
								volView.__updateAll();

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
			
		},


		__updateImage : function () {
			var volView=this;
			var slice=volView.__spinner.getValue();
			
			this.__loadImage.onload = function()
			{
				if(volView.__drawingCanvasParams.drawingContext!==null)
					volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,true);
			};

			var selection=this.__formatSelectBox.getSelection()[0];
			this.__loadImage.src=selection.getUserData("path") + "/sliceXY" + 
				(this.__slicesNameOffset+slice) + 
				"." + selection.getLabel() + "?nocache=" + this.__timestamp;
			//~ orion test (change orientation param in volume_slice action : actions.xml)
			if(false)
			{
				//~ this.__loadImage.src=selection.getUserData("path") + "/sliceZY" +
					//~ (this.__slicesNameOffset+slice) + 
					//~ "." + selection.getLabel() + "?nocache=" + this.__timestamp; //~ ZY X
				this.__loadImage.src=selection.getUserData("path") + "/sliceXZ" +
					(this.__slicesNameOffset+slice) + 
					"." + selection.getLabel() + "?nocache=" + this.__timestamp; //~ XZ Y
			}
		},

		__updateSeeds : function () {
			var volView=this;
			var sliceId=volView.__spinner.getValue();
			//~ var oldSeedSlice=volView.__currentSeedsSlice;
			var oldSeedSlice=volView.__display.depthShift;

			var selection=this.__formatSelectBox.getSelection()[0];

			var seedsURL=volView.__fileBrowser.getFileURL(this.getSessionDirectory()+"/"+this.getSeedFileName(sliceId))+
				"?nocache=" + this.__seedsTypeSelectBox.getSelection()[0].getUserData("cacheTags")[sliceId];

			// test wether the seed is already loaded. If yes, we need to recreate the Image
			if (oldSeedSlice==sliceId)
				this.__loadSeeds=new Image();

			this.__loadSeeds.onload = function (){
				if(volView.__drawingCanvasParams.drawingContext!==null)
				{
					volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, 2*volView.__scaledWidth+32, 2*volView.__scaledHeight+32);
					volView.__htmlContextLabels.clearRect(-16, -16, 2*volView.__scaledWidth+32, 2*volView.__scaledHeight+32);
					volView.__htmlContextLabels.drawImage(volView.__loadSeeds, 0, 0);
					volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,true);
					//~ volView.__currentSeedsSlice=sliceId;
					volView.__display.depthShift = sliceId;
				}
			};

			this.__loadSeeds.src=seedsURL;
		},

		setMouseActionMode : function (mode) {
			if (mode!=1)
			{
					this.__brghtnssCntrstButton.setValue(false);
			}

			if (mode!=3)
			{
                    this.__drawingCanvasParams.paintFlag = false;
                    if(this.__colorsContainer!=null)
                    {
						var unfocusedBorder = new qx.ui.decoration.Single(2, "solid", "black");
						var children = this.__colorsContainer.getChildren();
						for(var i=0; i<children.length; i++)
						{
							children[i].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
							this.__drawingCanvasParams.paintFlag = false;
						}
					}
					this.__drawingCanvas.releaseCapture();
			}

			if ((mode!=4)&&(this.__eraserCursor!==null))
			{
					this.__eraserCursor.releaseCapture();
					this.__eraserCursor.exclude();
					this.__eraserButton.setValue(false);
			}
			
			if(this.__drawingCanvas != null)
					this.__drawingCanvas.resetCursor();
			if(this.__eraserCursor != null)
					this.__eraserCursor.resetCursor();
			
			this.__mouseActionMode = mode;
		},
		
		
		
		__buildUI : function () {

			var volView=this;

			var spacing=5;
			var windowLayout=new qx.ui.layout.HBox();
			windowLayout.setSpacing(spacing);
			volView.__window.setLayout(windowLayout);
		
			var mLCL=new qx.ui.layout.VBox();
			mLCL.setSpacing(spacing);
			volView.__mainLeftContainer = new qx.ui.container.Composite(mLCL);
			volView.__window.add(volView.__mainLeftContainer, {flex:1});
		
			var tLCL=new qx.ui.layout.HBox();
			tLCL.setSpacing(spacing);
			volView.__topLeftContainer = new qx.ui.container.Composite(tLCL);
			volView.__mainLeftContainer.add(volView.__topLeftContainer);

			var iCL=new qx.ui.layout.HBox();
			iCL.setSpacing(spacing);
			volView.__imageContainer = new qx.ui.container.Composite(iCL);
			volView.__imageContainer.setMinWidth(Math.floor(this.__scaledWidth)); //~ Set min window
			volView.__imageContainer.setMinHeight(Math.floor(this.__scaledHeight)); //~ Set min window
			volView.__mainLeftContainer.add(volView.__imageContainer, {flex : 3});
			//~ volView.__mainLeftContainer.add(volView.__imageContainer);
			
		////Create brightness/contrast fixing on/off button
			volView.__brghtnssCntrstButton = new qx.ui.form.ToggleButton(null, "desk/Contrast_Logo_petit.PNG");

			volView.__brghtnssCntrstButton.set({toolTipText : "LUMINOSITE/CONTRASTE"});

			volView.__brghtnssCntrstButton.addListener("changeValue", function(event)
			{
				if(event.getData())
					volView.setMouseActionMode(1);
				else
					volView.setMouseActionMode(0);
			}, volView);
			
		////Create reset brightness/contrast button
			var resetBrCrButton = new qx.ui.form.Button("Reset");
            
			resetBrCrButton.set({opacity: 0.5, enabled : false});
			
			resetBrCrButton.addListener("execute", function(event)
			{
                volView.__imgCanvasParams.brightness = 0;
                volView.__imgCanvasParams.contrast = 0;
				volView.__drawZoomedCanvas(volView.__display.curCtxtZoom,true);
                resetBrCrButton.set({opacity: 0.5, enabled : false});
                volView.__brghtnssCntrstButton.setValue(false);
            });
            
            
            
			var useLblsColorsCheckBox = new qx.ui.form.CheckBox("Use Label Colors");
			useLblsColorsCheckBox.addListener("changeValue", function(event) //~ segColor test
			{
				volView.__isSegWindow = event.getData();
				volView.__updateVolume();
			},this);
			
            
            
		////Create slider
            var slider = new qx.ui.form.Slider();
            slider.setWidth(30);
            slider.setMaximum(volView.__dimensions[2]-1);
            slider.setMinimum(0);
            slider.setOrientation("vertical");
            this.__slider=slider;
			
		////Create spinner and sync it with the slider
            var spinner = new qx.ui.form.Spinner();
            this.__spinner=spinner;
            spinner.setMaximum(volView.__dimensions[2]-1);
            spinner.setMinimum(0);
            spinner.setValue(0);
            slider.addListener("changeValue",function(e){
                spinner.setValue(volView.__dimensions[2]-1-e.getData());});

			volView.__topLeftContainer.add(spinner);
			volView.__topLeftContainer.add(volView.__brghtnssCntrstButton);
			volView.__topLeftContainer.add(resetBrCrButton);
			//~ volView.__topLeftContainer.add(useLblsColorsCheckBox); //~ segColor test
			
			volView.__topLeftContainer.add(new qx.ui.core.Spacer(),{flex : 1});
			volView.__formatSelectBox=volView.__getFormatSelectBox();
			volView.__topLeftContainer.add(volView.__formatSelectBox);
			volView.__topLeftContainer.add(new qx.ui.core.Spacer(),{flex : 1});
			volView.__topLeftContainer.add(volView.__getDragAndDropLabel());	
			volView.__topLeftContainer.add(volView.__getPaintPanelVisibilitySwitch());
			
			
			volView.__updateContext = function(event)
			{
				if((this.__imageCanvas != null)&&(this.__drawingCanvas != null)&&(this.__htmlContextImage != null)&&(this.__htmlContextLabels != null))
					this.__drawZoomedCanvas(this.__display.curCtxtZoom,true);
				volView.fireEvent("changeDisplay");
			};
			
			volView.__mouseDownHandler = function(event)
            {
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
							volView.__eraserCursor.capture();
							if(volView.__eraserCursor.getVisibility()=="excluded")
								volView.__eraserCursor.show();
							break;
						case 3:
							if(!volView.__mouseData.mouseMiddleDownFlag)
								drawBrush(event,volView.__display.curCtxtZoom);
							volView.__htmlContextLabels.lineWidth = volView.__penSize.getValue();
							volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
							volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
							volView.__htmlContextLabels.beginPath();
							var newCoor = volView.__changeInto05Coordinates(volView.__display.onDispMouseHrzPos*volView.__scale[0],volView.__display.onDispMouseVrtPos*volView.__scale[1]);
							var tempX = newCoor.newX;
							var tempY = newCoor.newY;
							volView.__htmlContextLabels.arc(tempX,
															tempY,
															volView.__penSize.getValue()/2,
															0, Math.PI*2, false);
							volView.__htmlContextLabels.closePath();
							volView.__htmlContextLabels.fill();
							if (volView.__segmentationInProgress===false)
								volView.__startSegmentationButton.setEnabled(true);

							volView.__currentSeedsModified=true;
							break;
						default :
                    }
                    volView.__htmlContextLabels.beginPath();
					if(this.__drawingCanvas != null)
							this.__drawingCanvas.resetCursor();
					if(this.__eraserCursor != null)
							this.__eraserCursor.resetCursor();
                }
			////Activate moving
                if(((event.isShiftPressed())||(event.isMiddlePressed()))&&(1<=volView.__display.curCtxtZoom))
				{
					drawingCanvas.set({cursor: "move"});
					if(volView.__eraserCursor != null)
							volView.__eraserCursor.set({cursor: "move"});
					volView.__mouseData.mouseMiddleDownFlag = true;
				}
			////Update image
				if(!((volView.__mouseData.brCrFixingFlag)&&(volView.__mouseData.mouseLeftDownFlag)))
				{
					//~ volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, 2*volView.__scaledWidth+32, 2*volView.__scaledHeight+32);
					drawZoomedCanvas(volView.__display.curCtxtZoom,false);
				}
			////Draw cursor
				if(volView.__mouseActionMode==3)
				{
					drawBrush(event,volView.__display.curCtxtZoom);
				}
				volView.__mouseData.recentX = volView.__display.onDispMouseHrzPos;
                volView.__mouseData.recentY = volView.__display.onDispMouseVrtPos;
            };
			
			volView.__display.wheelScale = 0;
            volView.__mouseWheelHandler = function(event, isMasterWindow)
            {
				var tempScale = volView.__display.wheelScale;
				tempScale += -event.getWheelDelta()/8;
				volView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
				volView.__imgCanvasParams.imgContext.setTransform(1,0,0,1,0,0);
				var curentZoom = volView.__display.curCtxtZoom;
				var zoomFactor = Math.pow(2,tempScale);
			////Apply zoom
				if((1<=zoomFactor)&&(zoomFactor<=volView.__MaxZoom))	////Only zoom no shrinking and not more than Max zoom
				{
					volView.debug(" zoom = x" + zoomFactor);
					var location=volView.__imageCanvas.getContentLocation();
					volView.__display.onDispMouseHrzPos = event.getDocumentLeft()-location.left;
					volView.__display.onDispMouseVrtPos = event.getDocumentTop()-location.top;
					var onImageX = volView.__display.hrzntlShift + volView.__display.onDispMouseHrzPos;
					var onImageY = volView.__display.vrtclShift + volView.__display.onDispMouseVrtPos;
					volView.__imgCanvasParams.imgContext.clearRect(-16,-16,volView.__scaledWidth/volView.__scale[0]+32, volView.__scaledHeight/volView.__scale[1]+32);
					volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, 2*volView.__scaledWidth+32, 2*volView.__scaledHeight+32);
				////Zoom in
					volView.__drawingCanvasParams.drawingContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
					volView.__imgCanvasParams.imgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
					volView.__display.hrzntlShift = onImageX*zoomFactor/curentZoom-volView.__display.onDispMouseHrzPos;
					volView.__display.vrtclShift = onImageY*zoomFactor/curentZoom-volView.__display.onDispMouseVrtPos;
					//~ var newCoor = volView.__changeInto05Coordinates(volView.__display.hrzntlShift,volView.__display.vrtclShift);
					//~ volView.__display.hrzntlShift = newCoor.newX;
					//~ volView.__display.vrtclShift = newCoor.newY;
					if (volView.__eraserCursor!==null)
							volView.__eraserCursor.set({width: Math.ceil(volView.__eraserCoeff*volView.__penSize.getValue()*zoomFactor/volView.__scale[0])+1,
														height: Math.ceil(volView.__eraserCoeff*volView.__penSize.getValue()*zoomFactor/volView.__scale[1])+1});
				////Place the center of the eraser at mouse position
					if((volView.__drawingCanvasParams.eraseFlag)&&(volView.__mouseActionMode==4))
					{
						var canvasLocation=volView.__imageCanvas.getContentLocation();
						var tempX = (event.getDocumentLeft()-canvasLocation.left)/volView.__display.curCtxtZoom;
						var tempY = (event.getDocumentTop()-canvasLocation.top)/volView.__display.curCtxtZoom;
						volView.__eraserCursor.set({marginLeft: Math.round((tempX-volView.__eraserCoeff*volView.__penSize.getValue()/(2*volView.__scale[0]))*volView.__display.curCtxtZoom),
													marginTop: Math.round((tempY-volView.__eraserCoeff*volView.__penSize.getValue()/(2*volView.__scale[1]))*volView.__display.curCtxtZoom)});
					}
					volView.__display.wheelScale = tempScale;
					volView.__display.curCtxtZoom = zoomFactor;
				////Reset image and drawing canvas
					if(zoomFactor==1)
					{
						resetZoom();
					}
				}
				else
					if(zoomFactor<1)
						resetZoom();
				drawZoomedCanvas(volView.__display.curCtxtZoom,true);
			////Draw cursor
				if(volView.__mouseActionMode==3)
				{
					drawBrush(event,volView.__display.curCtxtZoom);
				}
			////Alert all viewers that zoom has changed
				volView.fireEvent("changeDisplay");
            };
			
			volView.__mouseMoveHandler = function(event)
            {
				volView.__getPosition(event,true);
                //~ if((volView.__mouseData.mouseMiddleDownFlag)&&(volView.__mouseActionMode!=4))
                if(volView.__mouseData.mouseMiddleDownFlag)
                {
					volView.__moveCanvas();
				}
					
				switch (volView.__mouseActionMode)
				{
					case 4 :
						volView.__eraserCursor.capture();
						if(volView.__eraserCursor.getVisibility()=="excluded")
							volView.__eraserCursor.show();
						////Set eraser cursor position
						var canvasLocation=volView.__imageCanvas.getContentLocation();
						var tempX = (event.getDocumentLeft()-canvasLocation.left)/volView.__display.curCtxtZoom;
						var tempY = (event.getDocumentTop()-canvasLocation.top)/volView.__display.curCtxtZoom;
						volView.__eraserCursor.set({marginLeft: Math.round((tempX-volView.__eraserCoeff*volView.__penSize.getValue()/(2*volView.__scale[0]))*volView.__display.curCtxtZoom),
													marginTop: Math.round((tempY-volView.__eraserCoeff*volView.__penSize.getValue()/(2*volView.__scale[1]))*volView.__display.curCtxtZoom)});
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
							drawBrush(event,volView.__display.curCtxtZoom);
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
						volView.__htmlContextLabels.lineWidth = volView.__penSize.getValue();
						volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
						volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
						var newCoor = this.__changeInto05Coordinates(volView.__display.onDispMouseHrzPos*volView.__scale[0],volView.__display.onDispMouseVrtPos*volView.__scale[1]);
						volView.__htmlContextLabels.lineTo(newCoor.newX,newCoor.newY);
						volView.__htmlContextLabels.stroke();
						break;
					case 4 :
						volView.__eraserCursor.capture();
						volView.__mouseData.mouseLeftDownFlag = true;
						if(volView.__eraserCursor.getVisibility()=="excluded")
							volView.__eraserCursor.show();
						////Set eraser cursor position
						var canvasLocation=volView.__imageCanvas.getContentLocation();
						var tempX = (event.getDocumentLeft()-canvasLocation.left)/volView.__display.curCtxtZoom;
						var tempY = (event.getDocumentTop()-canvasLocation.top)/volView.__display.curCtxtZoom;
						volView.__eraserCursor.set({marginLeft: Math.round((tempX-volView.__eraserCoeff*volView.__penSize.getValue()/(2*volView.__scale[0]))*volView.__display.curCtxtZoom),
													marginTop: Math.round((tempY-volView.__eraserCoeff*volView.__penSize.getValue()/(2*volView.__scale[1]))*volView.__display.curCtxtZoom)});
						////Erase at mouse position
						volView.__eraseFnct(true);
						break;
					default:
					}
                }
           };
			
			volView.__mouseUpHandler = function(event)
            {
                volView.__mouseData.mouseLeftDownFlag = false;
				volView.__mouseData.mouseMiddleDownFlag = false;
				if (!event.isLeftPressed())
					volView.__save2undoStack(event);
				volView.__mouseActionActive = false;
				if(volView.__eraserCursor!=null)
					volView.__eraserCursor.releaseCapture();
            };
            
			volView.__mouseOverHandler = function(event)
			{
				if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
					volView.__eraseFnct(true);
				if(this.__drawingCanvas != null)
					this.__drawingCanvas.resetCursor();
				if(this.__eraserCursor != null)
					this.__eraserCursor.resetCursor();
			};
			
			
			
		////Create results array for each slice image
            for(var i=0; i<volView.__dimensions[2]; i++)
            {
                volView.__horizSlices.sliceResults[i] = [];
				volView.__horizSlices.usedSliceSeeds[i] = [];
            }
			
			
			this.__imageCanvas = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
			var imgCanvas = new qx.ui.embed.Canvas().set({syncDimension: true,
															zIndex: volView.__imageZ,
															width : Math.floor(volView.__scaledWidth),
															height : Math.floor(volView.__scaledHeight) });

			this.__imageCanvas.add(imgCanvas);
			this.__imageContainer.addAt(this.__imageCanvas, 0, {flex:2});
			this.__imageContainer.addAt(slider, 1, {flex : 1});
			
			
			var widthHeightRatio = this.__scaledWidth/this.__scaledHeight;
			//~ var simpleViewWidth = this.__scaledWidth;
			//~ var segmentationViewWidth = this.__scaledWidth;
			this.__imageCanvas.addListener("resize", function(event)
			{
				var eraserTest = false;
				if(this.__eraserButton!=null)
					eraserTest = this.__eraserButton.getValue();
				if(!eraserTest)
				{
					this.debug("Resize !");
					//~ if(this.__mainRightContainer==null)
						//~ this.debug("only viewer (Paint button has NOT been pressed)");
					//~ else
						//~ if(!this.__mainRightContainer.isVisible())
							//~ this.debug("only viewer (Paint button HAS been pressed)");
						//~ else
							//~ this.debug("Paint ON");
					
					//~ this.debug("B: this.__scaledWidth : " + this.__scaledWidth);
					this.__scaledWidth = event.getData().width;
					//~ this.debug("A: this.__scaledWidth : " + this.__scaledWidth);
					//~ this.__scaledHeight = event.getData().height;
					this.__scaledHeight = Math.round(this.__scaledWidth/widthHeightRatio);
					
					this.__imageContainer.setMinHeight(this.__scaledHeight); //~ Set min window
					this.setHeight(this.__scaledHeight);
					
					imgCanvas.set({width : this.__scaledWidth,
									height : this.__scaledHeight });
					drawingCanvas.set({width : this.__scaledWidth,
										height : this.__scaledHeight });
										
					if(this.__eraserCursor!=null)
						this.__eraserCursor.set({width: Math.ceil(this.__eraserCoeff*this.__penSize.getValue()*this.__display.curCtxtZoom/this.__scale[0]+1),
												height: Math.ceil(this.__eraserCoeff*this.__penSize.getValue()*this.__display.curCtxtZoom/this.__scale[1]+1)});
					
					var oldS0 = this.__scale[0];
					var oldS1 = this.__scale[1];
					this.__scale[0] = this.__dimensions[0]/this.__scaledWidth;
					this.__scale[1] = this.__dimensions[1]/this.__scaledHeight;
					
					this.__display.hrzntlShift = this.__display.hrzntlShift*oldS0/this.__scale[0];
					this.__display.vrtclShift = this.__display.vrtclShift*oldS1/this.__scale[1];
				}
				//~ this.debug("1024 : __saveDisplay !");
				//~ this.__saveDisplay();
			},this);
			var tempWidth = this.__scaledWidth;
			this.addListener("beforeMaximize", function(event)
			{
				//~ this.debug("event.getEventPhase() : " + event.getEventPhase());
				//~ this.debug("event.getType() : " + event.getType());
				//~ this.debug("event.getOriginalTarget() : " + event.getOriginalTarget());
				//~ this.debug("event.getRelatedTarget() : " + event.getRelatedTarget());
				//~ this.debug("event.getTarget() : " + event.getTarget());
				tempWidth = this.__scaledWidth;
				//~ this.__saveDisplay();
			},this);
			this.addListener("maximize", function(event)
			{
				//~ this.debug("event.getEventPhase() : " + event.getEventPhase());
				//~ this.debug("event.getType() : " + event.getType());
				//~ this.debug("event.getOriginalTarget() : " + event.getOriginalTarget());
				//~ this.debug("event.getRelatedTarget() : " + event.getRelatedTarget());
				//~ this.debug("event.getTarget() : " + event.getTarget());
				//~ this.__saveDisplay();
			},this);
			
			
			this.__imageCanvas.addListener("mouseout", function(event)
			{
				this.__mouseActionActive = false;
	//			if(((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.brCrFixingFlag))&&(!volView.__drawingCanvasParams.eraseFlag))
//				{
					volView.__htmlContextLabels.beginPath();
					volView.__mouseData.mouseLeftDownFlag = false;
					volView.__mouseData.mouseMiddleDownFlag = false;
//				}
			},this);

			this.__imageCanvas.addListener("mouseover", function(event)
			{
				if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
					volView.__eraseFnct(true);
				if(this.__drawingCanvas != null)
					this.__drawingCanvas.resetCursor();
				if(this.__eraserCursor != null)
					this.__eraserCursor.resetCursor();
			},this);
			
			this.__imageCanvas.addListener("mousemove", function(event)
			{
				if(event.isLeftPressed())
				{
					if(volView.__eraserCursor!=null)
						volView.__eraserCursor.capture();
					if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
						volView.__eraseFnct(true);
				}
			},this);
			
			this.__imageCanvas.addListener("mousedown", function(event)
			{
				if((this.__mouseData.mouseLeftDownFlag)&&(this.__mouseActionMode==4))
					if(volView.__eraserCursor!=null)
						this.__eraserCursor.capture();
				if(this.__drawingCanvas != null)
					this.__drawingCanvas.resetCursor();
				if(this.__eraserCursor != null)
					this.__eraserCursor.resetCursor();
			},this);
			
			//~ this.__imageCanvas.addListener("click", function(event)
			//~ {
				//~ volView.__winMap.left = volView.getBounds().left;
				//~ volView.__winMap.top = volView.getBounds().top;
			//~ },this);			
			
			var canvasImage = new Image();

			volView.__loadImage=canvasImage;

			volView.__loadSeeds=new Image();
			
            var drawingCanvas = new qx.ui.embed.Canvas().set({syncDimension: true,
																zIndex: volView.__drawingCanvasZ,
																width : Math.floor(volView.__scaledWidth),
																height : Math.floor(volView.__scaledHeight) });
			this.__drawingCanvas=drawingCanvas;
			this.__imageCanvas.add(drawingCanvas);
			
            // HTML embed for background image
            var embedHtmlCodeImage = '<canvas id="htmlTagCanvasImage" width="' + volView.__dimensions[0] + '" height="' + volView.__dimensions[1] + '" ></canvas>';
            var embedObjectImage = new qx.ui.embed.Html(embedHtmlCodeImage);
            embedObjectImage.setDecorator("main");
			
            var containerLayoutImage = new qx.ui.layout.VBox();
            var containerHtmlImage = new qx.ui.container.Composite(containerLayoutImage);
            containerHtmlImage.add(embedObjectImage);
			this.__embedObjectImage=embedObjectImage;
			this.__imageCanvas.add(containerHtmlImage);
			containerHtmlImage.setOpacity(0);
			
			
            // HTML embed for drawn labels
            var embedHtmlCodeLabels = '<canvas id="htmlTagCanvasLabels" width="' + volView.__dimensions[0] + '" height="' + volView.__dimensions[1] + '" ></canvas>';
            var embedObjectLabels = new qx.ui.embed.Html(embedHtmlCodeLabels);
            embedObjectLabels.setDecorator("main");
			
            var containerLayoutLabels = new qx.ui.layout.VBox();
            var containerHtmlLabels = new qx.ui.container.Composite(containerLayoutLabels);
            containerHtmlLabels.add(embedObjectLabels);
			this.__embedObjectLabels=embedObjectLabels;
			this.__imageCanvas.add(containerHtmlLabels);
			containerHtmlLabels.setOpacity(0);


            // HTML embed for segmented image
            var embedHtmlCodeSegImg = '<canvas id="htmlTagCanvasSegImg" width="' + volView.__scaledWidth + '" height="' + volView.__scaledHeight + '" ></canvas>';
            var embedObjectSegImg = new qx.ui.embed.Html(embedHtmlCodeSegImg);
            embedObjectSegImg.setDecorator("main");
			
            var containerLayoutSegImg = new qx.ui.layout.VBox();
            var containerHtmlSegImg = new qx.ui.container.Composite(containerLayoutSegImg);
            containerHtmlSegImg.add(embedObjectSegImg);
			this.__embedObjectSegImg=embedObjectSegImg;
			
			this.__imageCanvas.add(containerHtmlSegImg);
			
            // HTML embed for seeds used for segmentation
            var embedHtmlCodeUsedSeeds = '<canvas id="htmlTagCanvasUsedSeeds" width="' + volView.__scaledWidth + '" height="' + volView.__scaledHeight + '" ></canvas>';
            var embedObjectUsedSeeds = new qx.ui.embed.Html(embedHtmlCodeUsedSeeds);
            embedObjectUsedSeeds.setDecorator("main");
			
            var containerLayoutUsedSeeds = new qx.ui.layout.VBox();
            var containerHtmlUsedSeeds = new qx.ui.container.Composite(containerLayoutUsedSeeds);
            containerHtmlUsedSeeds.add(embedObjectUsedSeeds);
			this.__embedObjectUsedSeeds=embedObjectUsedSeeds;
			this.__imageCanvas.add(containerHtmlUsedSeeds);
	
			spinner.addListener("changeValue", function(event)
			{
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
				volView.__updateAll();
			}, this);
			
			spinner.addListener("mouseout", function(event)
			{
				if(this.__drawingCanvas != null)
					this.__drawingCanvas.resetCursor();
				if(this.__eraserCursor != null)
					this.__eraserCursor.resetCursor();
			}, this);
			
		//	spinner.setValue(0);//Math.round(0.5*volView.__numberOfSlices));



		function waitForinit()
		{
			// wait for the canvas to really appear in the window otherwise things get bad
			if ((volView.__embedObjectImage.getContentElement().getDomElement()===null)||
				(volView.__embedObjectLabels.getContentElement().getDomElement()===null)||
				(drawingCanvas.getContext2d()===null)||
				(imgCanvas.getContext2d()===null))
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
					volView.__htmlContextImage.drawImage(canvasImage, 0, 0);
					volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage, 0, 0);
		        });

				imgCanvas.addListener("mousemove", function(event)
				{
					if(volView.__eraserCursor!=null)
						volView.__eraserCursor.capture();
					if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
						volView.__eraseFnct(true);
				},this);
			
				imgCanvas.addListener("mouseover", function(event)
				{
					if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
						volView.__eraseFnct(true);
					if(this.__drawingCanvas != null)
						this.__drawingCanvas.resetCursor();
					if(this.__eraserCursor != null)
						this.__eraserCursor.resetCursor();
				},this);
			
				imgCanvas.addListener("mousedown", function(event)
				{
					if((this.__mouseData.mouseLeftDownFlag)&&(this.__mouseActionMode==4))
						if(volView.__eraserCursor!=null)
							this.__eraserCursor.capture();
					if(this.__drawingCanvas != null)
						this.__drawingCanvas.resetCursor();
					if(this.__eraserCursor != null)
						this.__eraserCursor.resetCursor();
				},this);
			
				spinner.setValue(Math.round(volView.__dimensions[2]/2));
				volView.setReady(true);
			}
		}
		waitForinit();

		this.__window.open();

		/* ************************************************************************************************************************************* */
		//
		//	F U N C T I O N S
		//
		/* ************************************************************************************************************************************* */

		////Function applies zoom to image and drawing cavas
			var drawZoomedCanvas = function(zoomFactor,movement)
            {
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
					dx =  - volView.__display.hrzntlShift/zoomFactor;
				if(volView.__display.vrtclShift<0)
					dy =  - volView.__display.vrtclShift/zoomFactor;
			////Make sure all variables respect their allowed value range
				dx = Math.floor(dx);
				if(dx<1)
					dx = 0;
				dy = Math.floor(dy);
				if(dy<1)
					dy = 0;
				dw = Math.floor(sdw);
				if(sdw<1)
				{
					dw = 1;
					dx = volView.__scaledWidth - 1;
				}
				dh = Math.floor(sdh);
				if(sdh<1)
				{
					dh = 1;
					dy = volView.__scaledHeight - 1;
				}
				sx = Math.floor(sx*volView.__scale[0]);
				if(sx<1)
					sx = 0;
				sy = Math.floor(sy*volView.__scale[1]);
				if(sy<1)
					sy = 0;
				sdw = Math.floor(sdw*volView.__scale[0]);
				if(sdw<1)
				{
					sdw = 1;
					sx = volView.__dimensions[0] - 1;
				}
				sdh = Math.floor(sdh*volView.__scale[1]);
				if(sdh<1)
				{
					sdh = 1;
					sy = volView.__dimensions[0] - 1;
				}
				if(false)
				{
					volView.debug("<<<<<<<   drawZoomedCanvas   >>>>>>>");
					//~ volView.debug("sx : " + sx);
					//~ volView.debug("sy : " + sy);
					//~ volView.debug("sdw : " + sdw);
					//~ volView.debug("sdh : " + sdh);
					//~ volView.debug("dx : " + dx);
					//~ volView.debug("dy : " + dy);
					//~ volView.debug("dw : " + dw);
					//~ volView.debug("dh : " + dh);
					//~ volView.debug("sx*volView.__scale[0] : " + sx*volView.__scale[0]);
					//~ volView.debug("sy*volView.__scale[1] : " + sy*volView.__scale[1]);
					//~ volView.debug("dx*volView.__scale[0] : " + dx*volView.__scale[0]);
					//~ volView.debug("dy*volView.__scale[1] : " + dy*volView.__scale[1]);
					//~ volView.debug("sdw*volView.__scale[0] : " + sdw*volView.__scale[0]);
					//~ volView.debug("sdh*volView.__scale[1] : " + sdh*volView.__scale[1]);
					//~ volView.debug("sx/volView.__scale[0] : " + sx/volView.__scale[0]);
					//~ volView.debug("sy/volView.__scale[1] : " + sy/volView.__scale[1]);
					//~ volView.debug("dx/volView.__scale[0] : " + dx/volView.__scale[0]);
					//~ volView.debug("dy/volView.__scale[1] : " + dy/volView.__scale[1]);
					//~ volView.debug("sdw/volView.__scale[0] : " + sdw/volView.__scale[0]);
					//~ volView.debug("sdh/volView.__scale[1] : " + sdh/volView.__scale[1]);
					volView.debug("volView.__dimensions[0] : " + volView.__dimensions[0]);
					volView.debug("volView.__dimensions[1] : " + volView.__dimensions[1]);
					volView.debug("volView.__dimensions[0]/volView.__scale[0] : " + volView.__dimensions[0]/volView.__scale[0]);
					volView.debug("volView.__dimensions[1]/volView.__scale[1] : " + volView.__dimensions[1]/volView.__scale[1]);
					//~ volView.debug("volView.__scale[0] : " + volView.__scale[0]);
					//~ volView.debug("volView.__scale[1] : " + volView.__scale[1]);
					volView.debug("volView.__scaledWidth : " + volView.__scaledWidth);
					volView.debug("volView.__scaledHeight : " + volView.__scaledHeight);
					//~ volView.debug("volView.__scaledWidth*volView.__scale[0] : " + volView.__scaledWidth*volView.__scale[0]);
					//~ volView.debug("volView.__scaledHeight*volView.__scale[1] : " + volView.__scaledHeight*volView.__scale[1]);
					volView.debug("volView.__htmlCanvasLabels.width : " + volView.__htmlCanvasLabels.width);
					volView.debug("volView.__htmlCanvasLabels.height : " + volView.__htmlCanvasLabels.height);
					volView.debug("volView.__drawingCanvas.width : " + volView.__drawingCanvas.getWidth());
					volView.debug("volView.__drawingCanvas.height : " + volView.__drawingCanvas.getHeight());
					//~ volView.debug("volView.__htmlCanvasImage.width : " + volView.__htmlCanvasImage.width);
					//~ volView.debug("volView.__htmlCanvasImage.height : " + volView.__htmlCanvasImage.height);
					//~ volView.debug("imgCanvas.width : " + imgCanvas.getWidth());
					//~ volView.debug("imgCanvas.height : " + imgCanvas.getHeight());
					volView.debug("<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>");
				}
				volView.__drawingCanvasParams.drawingContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
				volView.__imgCanvasParams.imgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
			////Refresh image while drawing
				if(movement)
				{
					if(canvasImage.complete)
					{
						volView.__htmlContextImage.drawImage(canvasImage, 0, 0);
						var outImg = processBrCr(volView.__imgCanvasParams.brightness, volView.__imgCanvasParams.contrast, true);
						volView.__htmlContextImage.putImageData(outImg, 0, 0);
						var tempFill = volView.__imgCanvasParams.imgContext.fillStyle;
						volView.__imgCanvasParams.imgContext.fillStyle = '#4682B4';
						volView.__imgCanvasParams.imgContext.fillRect(0, 0, volView.__scaledWidth, volView.__scaledHeight);
						volView.__imgCanvasParams.imgContext.fillStyle = tempFill;
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
						volView.__htmlContextImage.clearRect(-16, -16, volView.__scaledWidth/volView.__scale[0]+32, volView.__scaledHeight/volView.__scale[1]+32);
						volView.__htmlContextImage.font = 'bold 21px sans-serif';
						volView.__htmlContextImage.textBaseLine = 'bottom';
						volView.__htmlContextImage.fillText('Image not yet loaded', (volView.__scaledWidth-volView.__scaledHeight)/2, volView.__scaledHeight/2);
						volView.__imgCanvasParams.imgContext.clearRect(-16, -16, volView.__scaledWidth/volView.__scale[0]+32, volView.__scaledHeight/volView.__scale[1]+32);
					}
				}
				volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, 2*volView.__scaledWidth+32, 2*volView.__scaledHeight+32);
				volView.__drawingCanvasParams.drawingContext.drawImage(volView.__htmlCanvasLabels,
																		sx,
																		sy,
																		sdw,
																		sdh,
																		dx,
																		dy,
																		dw,
																		dh);
			};
			
			this.__drawZoomedCanvas = drawZoomedCanvas;
			
			
			
		////Draw circle at mouse position
		////The labels image is not modified
			var drawBrush = function(mouseEvent,scale)
            {
				var canvasLocation=volView.__imageCanvas.getContentLocation();
                var tempX = (mouseEvent.getDocumentLeft()-canvasLocation.left)/scale;
                var tempY = (mouseEvent.getDocumentTop()-canvasLocation.top)/scale;
                var tempMargin = 4/scale;
                if((tempMargin<tempX)&&(tempX<volView.__scaledWidth/scale-tempMargin)&&(tempMargin<tempY)&&(tempY<volView.__scaledHeight/scale-tempMargin))
                {
					volView.__drawingCanvasParams.drawingContext.setTransform(volView.__display.curCtxtZoom/volView.__scale[0],0,0,volView.__display.curCtxtZoom/volView.__scale[1],0,0);
					volView.__drawingCanvasParams.drawingContext.strokeStyle = volView.__penSize.getValue()*volView.__display.curCtxtZoom;
                    volView.__drawingCanvasParams.drawingContext.strokeStyle = volView.__drawingCanvasParams.currentColor;
                    volView.__drawingCanvasParams.drawingContext.fillStyle = volView.__drawingCanvasParams.currentColor;
                    volView.__drawingCanvasParams.drawingContext.beginPath();
                    volView.__drawingCanvasParams.drawingContext.arc(tempX*volView.__scale[0],
																	tempY*volView.__scale[1],
																	Math.ceil(volView.__penSize.getValue()/2),
                                                                    0, Math.PI * 2, false);
                    volView.__drawingCanvasParams.drawingContext.closePath();
                    volView.__drawingCanvasParams.drawingContext.fill();
					volView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
                }
                else
                	volView.__drawingCanvas.releaseCapture();
			};

		////Redraw image canvas at original scale
            var resetZoom = function(autoComplete)
            {
				volView.__imgCanvasParams.imgContext.setTransform(1,0,0,1,0,0);
				volView.__htmlContextImage.drawImage(canvasImage, 0, 0);
				var outImg = processBrCr(volView.__imgCanvasParams.brightness, volView.__imgCanvasParams.contrast, true);
				volView.__htmlContextImage.putImageData(outImg, 0, 0, canvasImage.width, canvasImage.height, 0, 0, volView.__scaledWidth, volView.__scaledHeight);
				volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage, 0, 0);
				volView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
				volView.__drawingCanvasParams.drawingContext.drawImage(volView.__htmlCanvasLabels, 0, 0);
				volView.__display.hrzntlShift = 0;
				volView.__display.vrtclShift = 0;
				volView.__display.wheelScale = 0;
				volView.__display.curCtxtZoom = 1;
			};


		////Function applies brightness and contrast values
            var processBrCr = function(inBrightness, inContrast, inLegacy)
            {
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
	        if(this.__isSegWindow) //~ segColor test
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
            };
            
		},

		////Redraw image and drawing canvas when translation
		__moveCanvas : function()
		{
			var tempDecaleX = this.__display.hrzntlShift/this.__display.curCtxtZoom + this.__mouseData.recentX-this.__display.onDispMouseHrzPos;
			var tempDecaleY = this.__display.vrtclShift/this.__display.curCtxtZoom + this.__mouseData.recentY-this.__display.onDispMouseVrtPos;
			this.__display.hrzntlShift = tempDecaleX;
			this.__display.vrtclShift = tempDecaleY;
			this.__display.hrzntlShift = this.__display.hrzntlShift*this.__display.curCtxtZoom;
			this.__display.vrtclShift = this.__display.vrtclShift*this.__display.curCtxtZoom;
			this.__drawZoomedCanvas(this.__display.curCtxtZoom,true);
			this.fireEvent("changeDisplay");
		},

		////Pops out the last state in the "undo" stack and draw image on the canvas
		__undoFnct : function(mouseEvent)
		{
			if(mouseEvent.isRightPressed())
			{
				this.__currentSeedsModified=true;
				if(0<this.__ctrlZData.length)
				{
					this.__htmlContextLabels.putImageData(this.__ctrlZData[0], 0, 0);
					this.__drawZoomedCanvas(this.__display.curCtxtZoom,false);
				}
				var tempData = [];
				for(var i=1; i<this.__ctrlZData.length; i++)
				{
					tempData[i-1] = this.__ctrlZData[i];
				}
				this.__ctrlZData = tempData;
			}
		},


		////Clear labels canvas at mouse position
		__eraseFnct : function (autoComplete)
		{
			this.__eraserCursor.capture();
			this.__currentSeedsModified=true;
			var tempX, tempY;
			if(autoComplete)
			{
				tempX = (this.__mouseData.recentX+this.__display.onDispMouseHrzPos)/2-this.__eraserCoeff*this.__penSize.getValue()/(2*this.__scale[0]);
				tempY = (this.__mouseData.recentY+this.__display.onDispMouseVrtPos)/2-this.__eraserCoeff*this.__penSize.getValue()/(2*this.__scale[1]);
				var newCoor = this.__changeInto05Coordinates(tempX*this.__scale[0],tempY*this.__scale[1]);
				tempX = newCoor.newX;
				tempY = newCoor.newY;
				var newDims = this.__changeInto05Coordinates(this.__eraserCoeff*this.__penSize.getValue(),this.__eraserCoeff*this.__penSize.getValue());
				var tempDim = newDims.newX;
				this.__htmlContextLabels.clearRect(tempX,
													tempY,
													tempDim,
													tempDim);
			}
			tempX = this.__display.onDispMouseHrzPos-this.__eraserCoeff*this.__penSize.getValue()/(2*this.__scale[0]);
			tempY = this.__display.onDispMouseVrtPos-this.__eraserCoeff*this.__penSize.getValue()/(2*this.__scale[1]);
			var newCoor = this.__changeInto05Coordinates(tempX*this.__scale[0],tempY*this.__scale[1]);
			tempX = newCoor.newX;
			tempY = newCoor.newY;
			var newDims = this.__changeInto05Coordinates(this.__eraserCoeff*this.__penSize.getValue(),this.__eraserCoeff*this.__penSize.getValue());
			var tempDim = newDims.newX;
			this.__htmlContextLabels.clearRect(tempX,
												tempY,
												tempDim,
												tempDim);
			this.__drawZoomedCanvas(this.__display.curCtxtZoom,false);
			this.__mouseData.recentX = this.__display.onDispMouseHrzPos;
			this.__mouseData.recentY = this.__display.onDispMouseVrtPos;
		},

        ////Computes on image mouse position
		////If(scaling) applies zoom factor for relative coordinates (on zoomed window)
		__getPosition : function (mouseEvent,scaling)
		{
			var canvasLocation=this.__imageCanvas.getContentLocation();
			this.__display.onDispMouseHrzPos = (mouseEvent.getDocumentLeft()-canvasLocation.left)/this.__display.curCtxtZoom;
			this.__display.onDispMouseVrtPos = (mouseEvent.getDocumentTop()-canvasLocation.top)/this.__display.curCtxtZoom;
			if(scaling)
			{
				this.__display.onDispMouseHrzPos = this.__display.hrzntlShift/this.__display.curCtxtZoom + this.__display.onDispMouseHrzPos;
				this.__display.onDispMouseVrtPos = this.__display.vrtclShift/this.__display.curCtxtZoom + this.__display.onDispMouseVrtPos;
			}
		},


		////Use a php file to remove the specified file in the server
		eraseFile : function(file)
        {
			var parameterMap={
				"action" : "delete_file",
				"file_name" : file};

			this.__fileBrowser.getActions().launchAction(parameterMap);
		},

		////Save current labels image (used before any modification on the canvas)
		__save2undoStack : function (mouseEvent)
		{
			if(!mouseEvent.isRightPressed())
			{
				var tempData = [];
				if(this.__ctrlZData.length===0)
				{
					tempData[0] = this.__htmlContextLabels.getImageData(0, 0,  this.__dimensions[0],  this.__dimensions[1]);
				}
				else
				{
					if(this.__ctrlZData.length<this.__undoLimit)
					{
						for(var i=0; i<this.__ctrlZData.length; i++)
						{
							tempData[this.__ctrlZData.length-i] = this.__ctrlZData[this.__ctrlZData.length-i-1];
						}
						tempData[0] = this.__htmlContextLabels.getImageData(0, 0,  this.__dimensions[0],  this.__dimensions[1]);
					}
					else
					{
						if(this.__ctrlZData.length==this.__undoLimit)
						{
							for(var i=1; i<this.__ctrlZData.length; i++)
							{
								tempData[this.__ctrlZData.length-i] = this.__ctrlZData[this.__ctrlZData.length-i-1];
							}
							tempData[0] = this.__htmlContextLabels.getImageData(0, 0, this.__dimensions[0], this.__dimensions[1]);
						}
					}
				}
				this.__ctrlZData = tempData;
			}
		},


		////Changes int coordinates into nearest  xxx,5  value to prevent some effects of antialiasing
		__changeInto05Coordinates : function(X,Y)
		{
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

		__getPaintPanelVisibilitySwitch : function ()
		{
			var volView=this;
			var fileBrowser=this.__fileBrowser;
			var paintPaneVisibilitySwitch=new qx.ui.form.ToggleButton("Paint");
			paintPaneVisibilitySwitch.addListener("changeValue", function (e)
			{
				if (e.getData())
				{
					if (this.__mainRightContainer===null)
						this.__buildRightContainer();
					this.__mainRightContainer.setVisibility("visible");
					this.__seedsTypeSelectBox.getSelection()[0].getUserData("seedsList").setVisibility("visible");
				}
				else
				{
					this.__mainRightContainer.setVisibility("excluded");
					this.__seedsTypeSelectBox.getSelection()[0].getUserData("seedsList").setVisibility("excluded");
				}
			}, this);
			return paintPaneVisibilitySwitch;
		},

		__buildRightContainer : function()
		{
			var spacing=5;
			var mRCL=new qx.ui.layout.VBox();
			mRCL.setSpacing(spacing);
			this.__mainRightContainer = new qx.ui.container.Composite(mRCL);
			this.__window.add(this.__mainRightContainer);
			this.__mainRightContainer.setVisibility("excluded");

			var tRCL=new qx.ui.layout.HBox();
			tRCL.setSpacing(spacing);
			this.__topRightContainer = new qx.ui.container.Composite(tRCL);

			var bRCL=new qx.ui.layout.HBox();
			bRCL.setSpacing(spacing);
			this.__bottomRightContainer= new qx.ui.container.Composite(bRCL);

			var volView=this;
		
		////Create pen tool
            volView.__penSize = new qx.ui.form.Spinner().set({
                minimum: 1,
                maximum: 100,
                value: volView.__drawingCanvasParams.myLineWidth
            });
			
            volView.__penSize.addListener("changeValue", function(event)
			{
                volView.__htmlContextLabels.lineWidth = event.getData()*Math.sqrt(volView.__scale[0]*volView.__scale[1]);
                volView.__eraserCursor.set({width: Math.ceil(volView.__eraserCoeff*volView.__penSize.getValue()*volView.__display.curCtxtZoom/volView.__scale[0]+1),
											height: Math.ceil(volView.__eraserCoeff*volView.__penSize.getValue()*volView.__display.curCtxtZoom/volView.__scale[1]+1)});
            });
            
			volView.__penSize.addListener("mouseout", function(event)
			{
				if(this.__drawingCanvas != null)
						this.__drawingCanvas.resetCursor();
				if(this.__eraserCursor != null)
						this.__eraserCursor.resetCursor();
			}, this);
			
			var penLabel = new qx.ui.basic.Label("Brush : ");
			
			this.__topRightContainer.add(penLabel);
			this.__topRightContainer.add(volView.__penSize);
			

		////Create eraser
            var eraserBorder = new qx.ui.decoration.Single(1, "solid", "black");
			
            volView.__eraserCursor = new qx.ui.core.Widget().set({
										backgroundColor: "white",
										decorator: eraserBorder,
										width: Math.ceil(volView.__eraserCoeff*volView.__drawingCanvasParams.myLineWidth*volView.__display.curCtxtZoom+1),
										height : Math.ceil(volView.__eraserCoeff*volView.__drawingCanvasParams.myLineWidth*volView.__display.curCtxtZoom+1),
										zIndex : volView.__eraserCursorZ
									});
			
            volView.__eraserCursor.addListener("mousedown", function(event)
			{
				volView.__eraserCursor.capture();
				if(this.__drawingCanvas != null)
						this.__drawingCanvas.resetCursor();
				if(this.__eraserCursor != null)
						this.__eraserCursor.resetCursor();
				volView.__mouseActionActive = true;
            ////Erase
				if((event.isLeftPressed())&&(volView.__mouseActionMode==4))
                {
					volView.__getPosition(event,true);
					volView.__save2undoStack(event);
					volView.__eraseFnct();
                    volView.__mouseData.mouseLeftDownFlag = true;	// Activate erasing while moving
                }
			////Activate moving
                if(event.isMiddlePressed())
                {
					volView.__getPosition(event,true);
					if(volView.__eraserCursor != null)
							volView.__eraserCursor.set({cursor: "move"});
                    volView.__mouseData.mouseMiddleDownFlag = true;
					volView.__mouseData.recentX = volView.__display.onDispMouseHrzPos;
					volView.__mouseData.recentY = volView.__display.onDispMouseVrtPos;
                 }
			////"Undo" (draw previous canvas)
				volView.__undoFnct(event);
            });
			
            volView.__eraserCursor.addListener("mousemove", function(event)
			{
				volView.__eraserCursor.capture();
				volView.__getPosition(event,false);	// No scaling so coordinates are compatible with placeEraser function
                var tempMargin = 4/volView.__display.curCtxtZoom;
			////Hide eraser if out of drawing zone
                if(!((tempMargin<=volView.__display.onDispMouseHrzPos)&&(volView.__display.onDispMouseHrzPos<=volView.__scaledWidth/volView.__display.curCtxtZoom-tempMargin)&&(tempMargin<=volView.__display.onDispMouseVrtPos)&&(volView.__display.onDispMouseVrtPos<=volView.__scaledHeight/volView.__display.curCtxtZoom-tempMargin)))
                {
                    if(volView.__eraserCursor.getVisibility()=="visible")
					{
                        volView.__eraserCursor.exclude();
					}
                }
			////Move eraser to mouse position
                volView.__eraserCursor.set({marginLeft: Math.round((volView.__display.onDispMouseHrzPos-volView.__eraserCoeff*volView.__penSize.getValue()/(2*volView.__scale[0]))*volView.__display.curCtxtZoom),
											marginTop: Math.round((volView.__display.onDispMouseVrtPos-volView.__eraserCoeff*volView.__penSize.getValue()/(2*volView.__scale[1]))*volView.__display.curCtxtZoom)});
				volView.__display.onDispMouseHrzPos = volView.__display.hrzntlShift/volView.__display.curCtxtZoom + volView.__display.onDispMouseHrzPos;
                volView.__display.onDispMouseVrtPos = volView.__display.vrtclShift/volView.__display.curCtxtZoom + volView.__display.onDispMouseVrtPos;
				if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
				{
					volView.__eraseFnct(true);
                }
                if(volView.__mouseData.mouseMiddleDownFlag)
                {
					volView.__moveCanvas();
                }
            },this);
            
            volView.__eraserCursor.addListener("mouseup", function(event)
			{
                volView.__mouseData.mouseMiddleDownFlag = false;
                volView.__mouseData.mouseLeftDownFlag = false;
                volView.__mouseActionActive = false;
                this.__eraserCursor.releaseCapture();
            },this);
			
			volView.__eraserCursor.addListener("mouseover", function(event)
			{
				volView.__eraserCursor.capture();
				if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
					volView.__eraseFnct(true);
				if(this.__drawingCanvas != null)
					this.__drawingCanvas.resetCursor();
				if(this.__eraserCursor != null)
					this.__eraserCursor.resetCursor();
			}, this);
			
			volView.__eraserCursor.addListener("mouseout", function(event)
			{
				if((this.__mouseData.mouseLeftDownFlag)&&(this.__mouseActionMode==4))
					this.__eraserCursor.capture();
				if((volView.__mouseData.mouseLeftDownFlag)&&(volView.__mouseActionMode==4))
					volView.__eraseFnct(true);
			}, this);
			
			volView.__eraserCursor.addListener("mousewheel", volView.__mouseWheelHandler, this);

			volView.__eraserCursor.resetCursor();
			
            volView.__eraserCursor.exclude();

			
			
			
		////Create eraser on/off button
            volView.__eraserButton = new qx.ui.form.ToggleButton("Eraser");
			
			volView.__eraserButton.addListener("changeValue", function(event)
			{
				if (event.getData()===true)
				{
					volView.__eraserCursor.capture();
					volView.setMouseActionMode(4);
				}
				else
					volView.setMouseActionMode(0);

                volView.__htmlContextLabels.beginPath();
                volView.__mouseData.mouseLeftDownFlag = false;
            });
			
			volView.__topRightContainer.add(volView.__eraserButton);

			
			
		////Create labels zone
			var paintPage = new qx.ui.tabview.Page("paint");
			var paintPageLayout=new qx.ui.layout.VBox();
			paintPageLayout.setSpacing(5);
            paintPage.setLayout(paintPageLayout);
			paintPage.add(this.__topRightContainer);

			volView.__colorsContainer=new qx.ui.container.Composite();
            volView.__colorsContainer.setLayout(new qx.ui.layout.Grid(1,1));
			paintPage.add(volView.__colorsContainer);

			var tabView = new qx.ui.tabview.TabView();
			volView.__tabView=tabView;
            tabView.add(paintPage);
			tabView.setVisibility("excluded");

			this.__mainRightContainer.add(this.__getSessionsWidget());

			this.__mainRightContainer.add(tabView);


		////Function creates one label box
			var unfocusedBorder = new qx.ui.decoration.Single(2, "solid", "black");
            var focusedBorder = new qx.ui.decoration.Single(3, "solid", "red");
			var boxWidth = 37;
			var columnLimit = 4;
			var colorCount = 4;
			var nbLines = 1;
			var createToolBox = function(inLabel)
            {
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
				labelBox.addListener("click", function(){
                    volView.__drawingCanvasParams.paintFlag = true;
                    volView.setMouseActionMode(3);
                    var i = 0;
                    var children = volView.__colorsContainer.getChildren();
                    while(children[i]!=this)
                    {
                        i++;
                    }
					if(!((children[i].getBackgroundColor()=="white")&&(!volView.__drawingCanvasParams.eraseFlag)))
                    {
                        children[i].set({decorator: focusedBorder, backgroundColor: "white"});
                        for(var j=0; j<nbLabels; j++)
                        {
                            if(j!=i)
                            {
                                children[j].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
                            }
                        }
                    }
				////Comment to desactivate color on/off on click
                    else
                    {
                        children[i].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
                        volView.__drawingCanvasParams.paintFlag = false;
                        volView.setMouseActionMode(0);
                    }
                    volView.__drawingCanvasParams.currentColor = colorBox.getBackgroundColor();
                    volView.__colorsContainer.set({opacity: 1});
                });
				var boxLabel = new qx.ui.basic.Label("\\" + inLabel.id + " : " + inLabel.name).set({alignX:"left"});
				labelBox.add(boxLabel);
				labelBox.add(colorBox);
				if(inLabel.id<=colorCount)
				{
					volView.__colorsContainer.add(labelBox, {column: inLabel.id-(nbLines-1)*columnLimit, row: (nbLines-1)});
				}
				else
				{
					nbLines++;
					volView.__colorsContainer.add(labelBox, {column: inLabel.id-(nbLines-1)*columnLimit, row: (nbLines-1)});
					colorCount += columnLimit;
				}
				var tempColors = volView.__colorsContainer._getChildren();
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
					if(this.responseXML!==null)
					{
						var response = this.responseXML;
						nbLabels = response.getElementsByTagName("color").length;
						volView.__labelColors=new Array(nbLabels);
						for(var i=0; i<nbLabels; i++)
						{
							var color=response.getElementsByTagName("color")[i];
							var label=parseInt(color.getAttribute("label"),10)
							var colorName=color.getAttribute("name");
							volView.__labelColors[i] = {
								red : color.getAttribute("red"),
								green : color.getAttribute("green"),
								blue : color.getAttribute("blue"),
								label : ""+label,
								name : colorName
							};
							var newLabel = {
								id : label,
								name : colorName,
								color : "rgb(" + volView.__labelColors[i].red + "," + volView.__labelColors[i].green + "," + volView.__labelColors[i].blue + ")"
							};
							newLabel.name = newLabel.name.replace(newLabel.name.charAt(0), newLabel.name.charAt(0).toUpperCase());
							createToolBox(newLabel);
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
			colorsParamRequest.open("GET", "/visu/colors3.xml", true);
			colorsParamRequest.send(null);

			volView.__seedsTypeSelectBox=volView.__getSeedsTypeSelectBox();
			paintPage.addAt(volView.__seedsTypeSelectBox,0);

			
			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("Opacity :");
			this.__topRightContainer.add(whileDrawingDrwngOpacityLabel);
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
			whileDrawingDrwngOpacitySlider.setValue(100);
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
					this.__drawingCanvas.set({opacity: event.getData()/100});
			},this);
            this.__topRightContainer.add(whileDrawingDrwngOpacitySlider, {flex : 1});

			paintPage.add(this.__bottomRightContainer);

			var clusteringPage = new qx.ui.tabview.Page("clustering");
            clusteringPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(clusteringPage);
			var clusteringAction=new desk.action("cvtseg2", false);
			clusteringAction.setActionParameters(
				{"input_volume" : volView.__file});

			clusteringAction.setOutputSubdirectory("clustering");
			
			clusteringAction.buildUI();
			clusteringPage.add(clusteringAction);

			var segmentationPage = new qx.ui.tabview.Page("segmentation");
            segmentationPage.setLayout(new qx.ui.layout.VBox());
			tabView.add(segmentationPage);
			var segmentationAction=new desk.action("cvtgcmultiseg", false);
			clusteringAction.setActionParameters({
				"input_volume" : volView.__file});

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
			
			this.addListener("changeSessionDirectory", function (e)
			{
				var directory=e.getData();
				medianFilteringAction.setOutputDirectory(directory);
				clusteringAction.setOutputDirectory(directory);
				segmentationAction.setOutputDirectory(directory);
				meshingAction.setOutputDirectory(directory);
				segmentationAction.setActionParameters({
					"input_volume" : volView.__file,
					"seeds" : volView.getSessionDirectory()+"/seeds.xml"});
				clusteringAction.setActionParameters({
					"input_volume" : volView.__file});
				meshingAction.setActionParameters({
					"input_volume" : volView.getSessionDirectory()+"/filtering/output.mhd"});
			});

			this.__startSegmentationButton=new qx.ui.form.Button("Start segmentation");
			this.__startSegmentationButton.addListener("execute", function ()
			{
				this.__startSegmentationButton.setEnabled(false);
				volView.__segmentationInProgress=true;
				volView.__saveCurrentSeeds(function() {
					medianFilteringAction.executeAction();});
			}, this);
			this.__bottomRightContainer.add(this.__startSegmentationButton);

			var meshingButton=new qx.ui.form.Button("extract meshes");
			this.__extractMeshesButton=meshingButton;
			meshingButton.addListener("execute", function () {
				this.__startSegmentationButton.setEnabled(false);
				meshingButton.setEnabled(false);
				meshingAction.executeAction();
				}, this);
			this.__bottomRightContainer.add(meshingButton);

			var segmentationViewer=null;
			medianFilteringAction.addListener("actionUpdated", function ()
			{
				this.__startSegmentationButton.setEnabled(true);
				if (segmentationViewer===null)
				{
					//~ segmentationViewer=new desk.volView(
						//~ medianFilteringAction.getOutputDirectory()+"/output.mhd",
						//~ volView.__fileBrowser);
					segmentationViewer=new desk.volView(
									medianFilteringAction.getOutputDirectory()+"/output.mhd",
									volView.__fileBrowser);
					segmentationViewer.linkToVolumeViewer(volView);
					segmentationViewer.__isSegWindow = true; //~ segColor test
					segmentationViewer.getWindow().addListener("beforeClose", function (e) {
							segmentationViewer=null;});
				}
				else
				{
					segmentationViewer.__isSegWindow = true; //~ segColor test
					segmentationViewer.__updateVolume();
				}
			}, this);

			meshingAction.addListener("actionUpdated", function ()
			{
				meshingButton.setEnabled(true);
				this.__startSegmentationButton.setEnabled(true);
				var meshesViewer=new desk.meshView(volView.getSessionDirectory()+"/meshes/meshes.xml",
								volView.__fileBrowser);
			}, this);

			this.__resetSeedsList();
            this.__imageCanvas.add(this.__eraserCursor);
            
		},

		__saveCurrentSeeds : function(callback)
		{
			var oldSliceIndex = this.__display.depthShift;
			
			if (this.__currentSeedsModified!==false)
			{
				var sliceData = this.__htmlContextImage.getImageData(0, 0, this.__dimensions[0], this.__dimensions[1]);
				var pixels = sliceData.data;
				var seeds = this.__htmlContextLabels.getImageData(0, 0, this.__dimensions[0], this.__dimensions[1]).data;
				var isAllBlack = true;
				var labelColors=this.__labelColors;
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
					var volView=this;
					var numberOfRemainingRequests=2;
					var success=function (e) {
						numberOfRemainingRequests--;
						if ((numberOfRemainingRequests===0)&&(callback!==null))
						{
                            volView.__currentSeedsModified=false;
                            if (callback != null)
                               callback();
						}
					};

					////Send png image to server
					sliceData.data = pixels;
					this.__htmlContextLabels.putImageData(sliceData, 0, 0);
					var pngImg = this.__htmlCanvasLabels.toDataURL("image/png");
					var commaIndex=pngImg.lastIndexOf(",");
					var base64Img = pngImg.substring(commaIndex+1,pngImg.length);
					var parameterMap={
						"action" : "save_binary_file",
						"file_name" : this.getSeedFileName(this.__display.depthShift),
						"base64Data" : base64Img,
						"output_directory" : this.getSessionDirectory()};

					this.__fileBrowser.getActions().launchAction(parameterMap, success);
					var seedsTypeSelectBoxItem=this.__seedsTypeSelectBox.getSelection()[0];
					seedsTypeSelectBoxItem.getUserData("cacheTags")[this.__display.depthShift]=
                                            Math.random();
					if(seedsTypeSelectBoxItem.getUserData("seedsArray")[oldSliceIndex]===0)
						this.__addNewSeedItemToList(oldSliceIndex);
					this.__saveSeedsXML(success);
					
				}
				else
				{
                    if (callback != null)
						callback();
				}
			}
			else
			{
				if (callback != null)
					callback();
			}
		},
		
		
		
        // XML writer with attributes and smart attribute quote escaping 
		/*
			Format a dictionary of attributes into a string suitable
			for inserting into the start tag of an element.  Be smart
		   about escaping embedded quotes in the attribute values.
		*/
		__formatAttributes : function (attributes)
		{
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
		},
		__element : function (name,content,attributes)
		{
			var att_str = '';
			if (attributes) { // tests false if this arg is missing!
				att_str = this.__formatAttributes(attributes);
			}
			var xml;
			if (!content){
				xml='<' + name + att_str + '/>';
			}
			else {
				xml='<' + name + att_str + '>' + content + '</'+name+'>';
			}
			return xml;
		},
		
		
		
		////Rewrite xml list of the drawn seeds
		__saveSeedsXML : function(callback)
        {
			var xmlContent = '\n';
			var colors='\n';
			for(var i=0; i<this.__labelColors.length; i++)
			{
				colors+=this.__element('color',null, this.__labelColors[i]);
			}
			xmlContent+=this.__element('colors', colors)+"\n";

			var seedsTypeItems=this.__seedsTypeSelectBox.getChildren();
			for (var i=0;i<seedsTypeItems.length;i++)
			{
				var item=seedsTypeItems[i];
				var seedsList=item.getUserData("seedsList");
				var filePrefix=item.getUserData("filePrefix");
				var slices=seedsList.getChildren();
				for(var j=0; j<slices.length; j++)
				{
					var sliceId=slices[j].getUserData("slice");
					var sliceAttributes = {slice: sliceId + ""};
					xmlContent += this.__element(filePrefix, this.getSeedFileName(sliceId, item), sliceAttributes) + '\n';
				}
			}

			var parameterMap={
				"action" : "save_xml_file",
				"file_name" : "seeds.xml",
				"xmlData" : this.__element('seeds', xmlContent),
				"output_directory" : this.getSessionDirectory()};

			this.__fileBrowser.getActions().launchAction(parameterMap, callback);
		},
			
			

		__clearDrawingCanvas : function()
		{
			this.__drawingCanvasParams.drawingContext.clearRect(-16, -16, 2*this.__scaledWidth+32, 2*this.__scaledHeight+32);
			this.__htmlContextLabels.clearRect(-16, -16, 2*this.__scaledWidth+32, 2*this.__scaledHeight+32);
			this.__htmlContextLabels.beginPath();
			this.__eraserCursor.exclude();
		},
		
		
		
		__copyDisplay : function (sourceVolViewer,targetVolViewer)
		{
			targetVolViewer.__display = Object.create(sourceVolViewer.__display);
			targetVolViewer.__display.hrzntlShift = targetVolViewer.__display.hrzntlShift*sourceVolViewer.__scale[0]/targetVolViewer.__scale[0];
			targetVolViewer.__display.vrtclShift = targetVolViewer.__display.vrtclShift*sourceVolViewer.__scale[1]/targetVolViewer.__scale[1];
			targetVolViewer.__drawZoomedCanvas(targetVolViewer.__display.curCtxtZoom,true);
			targetVolViewer.__spinner.setValue(targetVolViewer.__display.depthShift);
		},
		
		__loadDisplay : function ()
		{
			var loadDispRequest = new XMLHttpRequest();
			var tempVolView = this ;
			
			loadDispRequest.onreadystatechange = function()
			{
				if(this.readyState == 4 && this.status == 200)
				{
					// so far so good
					if(this.responseXML!==null)
					{
						var response = this.responseXML;
						var display=response.getElementsByTagName("display")[0];
						if (display==null)
							return;
						for (var key  in tempVolView.__display)
						{
								if (key === 'length' || !tempVolView.__display.hasOwnProperty(key))
										continue;
								tempVolView.__display[key] = parseFloat(response.getElementsByTagName(key)[0].getAttribute("value"),10);
								//~ tempVolView.debug(key + " : " + tempVolView.__display[key]);
						}
						if(tempVolView.__eraserCursor!=null)
						{
							tempVolView.__eraserCursor.set({width: Math.ceil(tempVolView.__eraserCoeff*tempVolView.__penSize.getValue()*tempVolView.__display.curCtxtZoom/tempVolView.__scale[0]+1),
															height: Math.ceil(tempVolView.__eraserCoeff*tempVolView.__penSize.getValue()*tempVolView.__display.curCtxtZoom/tempVolView.__scale[1]+1)});
						}
						if((tempVolView.__drawingCanvasParams.eraseFlag)&&(tempVolView.__mouseActionMode==4))
						{
						////Move eraser to mouse position
							tempVolView.__eraserCursor.set({marginLeft: Math.round((tempVolView.__display.onDispMouseHrzPos-tempVolView.__eraserCoeff*tempVolView.__penSize.getValue()/(2*tempVolView.__scale[0]))*tempVolView.__display.curCtxtZoom),
														marginTop: Math.round((tempVolView.__display.onDispMouseVrtPos-tempVolView.__eraserCoeff*tempVolView.__penSize.getValue()/(2*tempVolView.__scale[1]))*tempVolView.__display.curCtxtZoom)});
						}
						tempVolView.__spinner.setValue(tempVolView.__display.depthShift);
						tempVolView.__drawZoomedCanvas(tempVolView.__display.curCtxtZoom,true);
						tempVolView.fireEvent("changeDisplay");
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
			
			if(this.getSessionDirectory()!=null)
			{
				loadDispRequest.open("GET", this.__fileBrowser.getFileURL(this.getSessionDirectory() + "/savedDisplay.xml?nocache="+Math.random()), false);
				loadDispRequest.send(null);
			}
			else
			{
				var volDirectory = this.__file.substring(0,this.__file.lastIndexOf('/'));
				loadDispRequest.open("GET", this.__fileBrowser.getFileURL(volDirectory + "/savedDisplay.xml?nocache="+Math.random()), false);
				//~ loadDispRequest.send(null);
			}
		},
		
		////Write xml with display parameters
		__saveDisplay : function(callback)
        {
			var xmlContent = '\n';

			for (var key  in this.__display)
			{
				if (key === 'length' || !this.__display.hasOwnProperty(key))
				{
						continue;
				}
				var paramAttribute = {value : this.__display[key] + ""};
				xmlContent += this.__element(key, "", paramAttribute) + '\n';
				this.debug(key + " : " + this.__display[key]);
			}
			
			var parameterMap = {
					"action" : "save_xml_file",
					"file_name" : "savedDisplay.xml",
					"xmlData" : this.__element('display', xmlContent)
				};
			if(this.getSessionDirectory()!=null)
			{
				parameterMap.output_directory = this.getSessionDirectory();
			}
			else
			{
				parameterMap.output_directory = this.__file.substring(0,this.__file.lastIndexOf('/'));
			}
			this.__fileBrowser.getActions().launchAction(parameterMap, callback);
		},
		
		
		
		__updateAll : function()
		{
			var currentSlice=this.__display.depthShift;
			
			if (this.__seedsTypeSelectBox!==null)
			{
				var seedsTypeListItem=this.__seedsTypeSelectBox.getSelection()[0];

				var sliceItem=seedsTypeListItem.getUserData("seedsArray")[currentSlice];
				var seedsList=seedsTypeListItem.getUserData("seedsList");
				if(sliceItem!==0)
				{
					// the slice contains seeds
					this.__updateSeeds();
					seedsList.setSelection([sliceItem]);
				}
				else
				{
					// current slice has no seeds
					seedsList.resetSelection();
					this.__clearDrawingCanvas();
					this.__htmlContextLabels.clearRect(-16, -16, 2*this.__scaledWidth+32, 2*this.__scaledHeight+32);
				}
			}
			
			////Update image canvas
			this.__updateImage();

			////Clear "undo" stack
			this.__ctrlZData = [];
			this.__currentSeedsModified=false;
			
		},

		__loadSession : function()
		{
			this.__resetSeedsList();
			var colorsParamRequest = new XMLHttpRequest();
			var volView=this;
			colorsParamRequest.onreadystatechange = function()
			{
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(this.responseXML!==null)
					{
						var response = this.responseXML;
						var seedsTypes=volView.__seedsTypeSelectBox.getChildren();
						for (var j=0;j<seedsTypes.length;j++)
						{
							var seedsTypeSelectBoxItem=seedsTypes[j];
							var slices;
							if (seedsTypeSelectBoxItem.getUserData("filePrefix")=="seed")
								slices=response.getElementsByTagName("seed");
							else
								slices=response.getElementsByTagName("correction");

							for(var i=0; i<slices.length; i++)
							{
								var sliceId=parseInt(slices[i].getAttribute("slice"),10);
								volView.__addNewSeedItemToList(sliceId, seedsTypeSelectBoxItem);
							}
						}
						volView.__extractMeshesButton.setEnabled(true);
						volView.__loadDisplay();
						volView.__updateAll();
					}
					else
					{
						alert("no seeds found");
						volView.__updateAll();
					}
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					alert("no seeds found");

					volView.__updateAll();
				}
			};
			var filePrefix=this.__seedsTypeSelectBox.getSelection()[0].getLabel();
			colorsParamRequest.open("GET",
				volView.__fileBrowser.getFileURL(volView.getSessionDirectory()+"/seeds.xml?nocache="+Math.random()), true);
			colorsParamRequest.send(null);
		},

		__resetSeedsList : function()
		{
			var seedsTypeSelectBoxItems=this.__seedsTypeSelectBox.getChildren();
			var numberOfSlices=this.__dimensions[2];

			for (var i=0;i<seedsTypeSelectBoxItems.length;i++)
			{
				var item=seedsTypeSelectBoxItems[i];
				item.getUserData("seedsList").removeAll();
				var seedsArray=new Array(numberOfSlices);
				item.setUserData("seedsArray",seedsArray);
				var cacheTags=new Array(numberOfSlices);
				item.setUserData("cacheTags",cacheTags);
				for (var j=0;j!=numberOfSlices;j++)
				{
					cacheTags[j]=Math.random();
					seedsArray[j]=0;
				}
			}
			//~ this.__currentSeedsSlice = null;
			//~ this.__display.depthShift = 0;
		},

		__addNewSeedItemToList : function (sliceId, seedsTypeListItem)
		{
			if (seedsTypeListItem==null)
				seedsTypeListItem=this.__seedsTypeSelectBox.getSelection()[0];

			var seedsList=seedsTypeListItem.getUserData("seedsList");
			var seedsArray=seedsTypeListItem.getUserData("seedsArray");

			var sliceItem = new qx.ui.form.ListItem(""+ sliceId);
			sliceItem.setUserData("slice",sliceId);
			var tempPos = 0;
			var seeds=seedsList.getChildren();
			for(var i=0; i<seeds.length; i++)
			{
				if(seeds[i].getUserData("slice")>sliceId)
					tempPos++;
			}
			seedsList.addAt(sliceItem, tempPos);
			seedsArray[sliceId] = sliceItem;

			sliceItem.addListener("click", function(event)
				{this.__spinner.setValue(event.getTarget().getUserData("slice"));}, this);
		},

		__getSeedsTypeSelectBox : function() {
			var selectBox = new qx.ui.form.SelectBox();

			// create seeds list
			var seedsList=new qx.ui.form.List();
			seedsList.setWidth(30);
			seedsList.setScrollbarY("off");

			seedsList.addListener("removeItem", function(event) {
				if (seedsList.getChildren().length===0)
					this.__startSegmentationButton.setEnabled(false);
				}, this);

			seedsList.addListener("addItem", function(event) {
				this.__startSegmentationButton.setEnabled(true);
				}, this);

			seedsList.addListener("keypress", function(event)
			{
				if(event.getKeyIdentifier()=="Delete")
				{
					var selectedChild = seedsList.getSelection()[0];
					if (selectedChild!==null)
					{
						var sliceId = selectedChild.getUserData("slice");
					////Erase image on the server
						this.eraseFile(this.getSessionDirectory()+"/"+this.getSeedFileName(sliceId));
						selectBox.getSelection()[0].getUserData("seedsArray")[sliceId]=0;
						this.__clearDrawingCanvas();
						seedsList.remove(selectedChild);
						this.__saveSeedsXML();
					}
				}
			}, this);

			this.__imageContainer.add(seedsList);
			seedsList.setVisibility("excluded");

			// create corrections list
			var correctionsList=new qx.ui.form.List();
			correctionsList.setWidth(30);
			correctionsList.setScrollbarY("off");

			correctionsList.addListener("keypress", function(event)
			{
				if(event.getKeyIdentifier()=="Delete")
				{
					var selectedChild = correctionsList.getSelection()[0];
					if (selectedChild!==null)
					{
						var sliceId = selectedChild.getUserData("slice");
					////Erase image on the server
						this.eraseFile(this.getSessionDirectory()+"/"+this.getSeedFileName(sliceId));
						selectBox.getSelection()[0].getUserData("seedsArray")[sliceId]=0;
						this.__clearDrawingCanvas();
						correctionsList.remove(selectedChild);
						this.__saveSeedsXML();
					}
				}
			}, this);
			this.__imageContainer.add(correctionsList);
			correctionsList.setVisibility("excluded");

			var seedsItem = new qx.ui.form.ListItem("seeds");
			seedsItem.setUserData("filePrefix", "seed");
			seedsItem.setUserData("seedsList", seedsList);
			seedsItem.setUserData("oppositeList", correctionsList);
			selectBox.add(seedsItem);

			var correctionsItem = new qx.ui.form.ListItem("corrections");
			correctionsItem.setUserData("filePrefix", "correction");
			correctionsItem.setUserData("seedsList", correctionsList);
			correctionsItem.setUserData("oppositeList", seedsList);
			selectBox.add(correctionsItem);
			selectBox.addListener("changeSelection",function (e) {
				var SelectedItem=selectBox.getSelection()[0];

				var selectedOppositeList=SelectedItem.getUserData("oppositeList");
				selectedOppositeList.setVisibility("excluded");
				selectedOppositeList.resetSelection();

				var selectedSeedsList=SelectedItem.getUserData("seedsList");
				selectedSeedsList.setVisibility("visible");
				this.__updateAll();
				},this);
			return selectBox;
		},

		__getSessionsWidget : function()
		{
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
			var fileBrowser=this.__fileBrowser;
			var file=this.__file;
			var volView=this;

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
					if (sessionItemToSelect!==null)
					{
						volView.__saveDisplay();
						sessionsList.setSelection([sessionItemToSelect]);
						volView.__tabView.setVisibility("visible");
						volView.setSessionDirectory(fileBrowser.getSessionDirectory(
							volView.__file,sessionType,sessionIdToSelect));
						volView.__saveSeedsXML();
					}
					else
						sessionsList.setSelection([dummyItem]);					
					updateInProgress=false;
				};

				fileBrowser.getFileSessions(file, sessionType, buildSessionsItems);
			}


			sessionsList.addListener("changeSelection", function(e){
				if (!updateInProgress)
				{
					volView.__saveDisplay();
					var listItem=sessionsList.getSelection()[0];
					if (listItem.getUserData("dummy")!==true)
					{
						volView.__tabView.setVisibility("visible");
						volView.setSessionDirectory(fileBrowser.getSessionDirectory(
							volView.__file,sessionType,listItem.getLabel()));
						volView.__loadSession();
					}
					sessionsList.close();
				}});

			button.addListener("execute", function (e){
				volView.__resetSeedsList();
				volView.__updateAll();
				fileBrowser.createNewSession(volView.__file,sessionType, updateList);
				});

			updateList();
			return sessionsListContainer;
		},

       ////Create and add the jpeg/png format select box
       __getFormatSelectBox : function()
		{
			var selectBox= new qx.ui.form.SelectBox();
			selectBox.set({width: 52});
			var JPGFormat = new qx.ui.form.ListItem("jpg");
			JPGFormat.setUserData("path",this.__pathJPG);
			selectBox.add(JPGFormat);
			var PNGFormat = new qx.ui.form.ListItem("png");
			selectBox.add(PNGFormat);
			
			selectBox.addListener('changeSelection', function (e){
			//console.log("change...");
				var path=selectBox.getSelection()[0].getUserData("path");
				switch(path)
				{
				case null :
					//~ //we need to compute png slices : launch action
					var parameterMap={
						"action" : "slice_volume",
						"input_volume" : this.__file,
						"output_directory" : "cache\/",
						"format" : "0"};
					//~ segColor test
					if(this.__isSegWindow)
					{
						parameterMap.action = "slice_volume_color";
						parameterMap.format = "0";
					}
					//~ orion test (change orientation param in volume_slice action : actions.xml)
					if(false)
					{
						//~ parameterMap.slice_orientaion = "1"; //~ ZY X
						parameterMap.slice_orientaion = "2"; //~ XZ Y
					}
					var slicingLabel=new qx.ui.basic.Label("computing...");
					this.__topLeftContainer.addAfter(slicingLabel,selectBox);
					function getAnswer(e)
					{
						var req = e.getTarget();
						var slicesDirectory=req.getResponseText().split("\n")[0];
						PNGFormat.setUserData("path",
							this.__fileBrowser.getFileURL(slicesDirectory));
						this.__topLeftContainer.remove(slicingLabel);
						selectBox.setSelection([PNGFormat]);
					}

					PNGFormat.setUserData("path","computing");
					// switch back to before computing is done png
					selectBox.setSelection([JPGFormat]);
					selectBox.close();
					this.__topLeftContainer.addAfter(slicingLabel,selectBox);
					this.__fileBrowser.getActions().launchAction(parameterMap, getAnswer, this);
					break;
				case "computing":
					// slices are being computed. re-switch to jpg
					selectBox.setSelection([JPGFormat]);
					selectBox.close();
					break;
				default :
					// slices are ready (PNG or JPG)
					this.__updateImage();
				}}, this);
			return (selectBox);
		},

		__getDragAndDropLabel : function ()
		{
			var dragLabel=new qx.ui.basic.Label("Link").set({
        decorator: "main"});
			// drag and drop support
			dragLabel.setDraggable(true);
			dragLabel.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("volumeSlice");
				});

			dragLabel.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					switch (type)
					{
					case "volumeSlice":
						e.addData(type, this);
						break;
					default :
						alert ("type "+type+"not supported for drag and drop");
					}
				}, this);

		// enable linking between volume viewers by drag and drop
			this.__mainLeftContainer.setDroppable(true);
			this.__mainLeftContainer.addListener("drop", function(e) {
				if (e.supportsType("volumeSlice"))
				{
					this.linkToVolumeViewer(e.getData("volumeSlice"));
				}
				else
				{
					alert("drop type not allowed for this widget!");
				}
			},this);

			// add listener on close window event to remove bindings
			this.__window.addListener("beforeClose", function (e){
				this.__saveDisplay();
				var bindings=this.__spinner.getBindings();
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
						if(this.__spinner==targetBinding[3])
						{
							targetObject.removeBinding(targetBinding[0]);
							break;
						}
					}
				}
				this.__spinner.removeAllBindings();
			},this);
				
			return dragLabel;
		},
		
		getDimensions : function ()
		{
			return (this.__dimensions);
		},

		getSlicePixels : function()
		{
			return this.__pixels;
		},

		getSliceImageData : function()
		{
			return this.__imageData;
		},

		getSeedFileName : function(sliceId, seedsTypeSelectBoxItem)
		{
			if (seedsTypeSelectBoxItem==null)
				seedsTypeSelectBoxItem=this.__seedsTypeSelectBox.getSelection()[0];
			var filePrefix=seedsTypeSelectBoxItem.getUserData("filePrefix");
			return filePrefix +"XY"+(this.__slicesNameOffset + sliceId) +".png";
			//~ orion test (change orientation param in volume_slice action : actions.xml)
			if(false)
			{
				//~ return filePrefix +"ZY"+(this.__slicesNameOffset + sliceId) +".png"; //~ ZY X
				return filePrefix +"XZ"+(this.__slicesNameOffset + sliceId) +".png"; //~ XZ Y
			}
		},

		getCornersCoordinates : function () {
			var z=this.__origin[2]+(this.__spinner.getValue()+this.__extent[4])*this.__spacing[2];
			var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
			var xmax=this.__origin[0]+this.__extent[1]*this.__spacing[0];
			var ymin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
			var ymax=this.__origin[1]+this.__extent[3]*this.__spacing[1];
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
		}
		
	}
	
});

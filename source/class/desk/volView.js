qx.Class.define("desk.volView", 
{
  extend : qx.ui.window.Window,

	construct : function(file, fileBrowser)
	{		
		this.base(arguments);
		
        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        };

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

// Données pour la position de la zone image dans l'interface
// Les champs width et height sont remplis à partir du fichier xml
// Ils sont utilisés pour réaliser différents calculs pour le dessin
// et l'affichage
		this.__imgMap = {
			left : 40,
			top : 4,
			width : 0,
			height : 0
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
			myLineJoin : "bevel",
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


		var volView = this;
		
        volView.set({
                showMinimize: false,
                showMaximize: false,
                showClose: true,
                resizable: false,
                movable : true
        });

        volView.setLayout(new qx.ui.layout.Canvas());
		
		if (fileBrowser!=null)
		{
			this.__fileBrowser=fileBrowser;
			this.__file=file;
			this.setCaption(file);
			var parameterMap={
				"action" : "Slice_Volume",
				"input_file" : file,
				"output_directory" : "cache\/"};

			function getAnswer(e)
			{
				var req = e.getTarget();
				var slicesDirectory=req.getResponseText().split("\n")[0];
				volView.openFile("\/visu\/desk\/php\/"+slicesDirectory+"\/"+"volume.xml");
			}

			fileBrowser.getActions().launchAction(parameterMap, getAnswer, this);

			var label = new qx.ui.basic.Label("Computing slices, wait...").set({
				font : new qx.bom.Font(28, ["Verdana", "sans-serif"])
				});
			this.add(label, {flex : 1});
		}
		else
		{
			alert ("error : no filebrowser provided for volView");
		}

		volView.open();
		
		return (volView);
	},

	statics :
	{
		// LINKEDWINDOW : null
	},

	properties : {
		slice : { check : "Number", init : 0 ,  event : "changeSlice"}
	},

	members :
	{
		// the file browser which launched the viewer
		__fileBrowser : null,

		__seedsCacheTags : null,

		// the initial volume file (.mhd)
		__file : null,

		// the segmentation session (a node directory)
		__sessionDirectory : null,

		// the main window
		__window : null,

		__mainLeftContainer : null,
		__topLeftContainer : null,
		__imageContainer : null,
		__imageCanvas : null,

		__mainRightContainer : null,
		__topRightContainer : null,

		__slider : null,
		__spinner : null,
		__formatSelectBox : null,

		// the widget containing the defined colors for painting
		__colorsList : null,

		// the comboBox containing segmentation sessions
		__sessionsList : null,

		// the list displaying slices having seeds
		__seedsList : null,

		// array defining whether a slice contains seeds
		__seedsArray : null,

		__currentSeedsModified : false,


		__mouseActionMode : 0,
		__mouseActionActive : false,

// Données pour la position de l'objet window qui contient l'interface
//(position par rapport au document <-> fenêtre de l'explorateur)
// La largeur et la hauteur sont des valeurs par défaut. Si les widgets
//dans la fenêtre ont besoin de plus d'espace, la fenêtre s'élargit
// d'elle-même...normalement...
		__winMap : null,

// Données pour la position de la zone image dans l'interface
// Les champs width et height sont remplis à partir du fichier xml
// Ils sont utilisés pour réaliser différents calculs pour le dessin
// et l'affichage
		__imgMap : null,

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

         __MaxZoom : 4,     //Limite du zoom : x4
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

		__eraserCursor : null,
		__brghtnssCntrstButton : null,

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

		// the function which draws the canvas
		__drawZoomedCanvas : null,

		__updateImage : function () {
			var volView=this;
			var slice=volView.__spinner.getValue();
			
			this.__loadImage.onload = function()
			{
				if(volView.__drawingCanvasParams.drawingContext!=null)
					volView.__drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
			};

			var selection=this.__formatSelectBox.getSelection()[0];
			this.__loadImage.src=selection.getUserData("path") + "slice" + 
				(this.__slicesNameOffset+slice) + 
				"." + selection.getLabel() + "?nocache=" + this.__timestamp;
		},

		__updateSeeds : function () {
			var volView=this;
			var sliceId=volView.__spinner.getValue();
			var oldSeedSlice=volView.__currentSeedsSlice;
			function seedsLoaded()
			{
				if(volView.__drawingCanvasParams.drawingContext!=null)
				{
					volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
					volView.__htmlContextLabels.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
					volView.__htmlContextLabels.drawImage(volView.__loadSeeds, 0, 0);
					volView.__drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
					volView.__currentSeedsSlice=sliceId;
				}

			};

			this.__loadSeeds.onload = seedsLoaded;

			var selection=this.__formatSelectBox.getSelection()[0];

			var seedsURL=volView.__fileBrowser.getFileURL(this.__sessionDirectory+"/"+this.getSeedFileName(sliceId))+
				"?nocache=" + volView.__seedsCacheTags[sliceId];

			// test wether the seed is already loaded.
			if (oldSeedSlice==sliceId)
				seedsLoaded();
			else
				this.__loadSeeds.src=seedsURL;
		},

		setMouseActionMode : function (mode) {
			if (mode!=1)
				this.__brghtnssCntrstButton.setValue(false);

			if (mode!=3)
			{
	//			this.__colorsList.resetSelection();
			}

			if (mode!=4)
				this.__eraserCursor.exclude();
			this.__mouseActionMode = mode;
		},

		__updateCursorType : function()
		{
			switch (this.__mouseActionType)
			{
			}
			
		},

		openFile : function (file,volView) {
			this.removeAll();

			var spacing=5;
			this.__window=this;//new qx.ui.window.Window();
			var windowLayout=new qx.ui.layout.HBox();
			windowLayout.setSpacing(spacing);
			this.__window.setLayout(windowLayout);
		
			var mLCL=new qx.ui.layout.VBox();
			mLCL.setSpacing(spacing);
			this.__mainLeftContainer = new qx.ui.container.Composite(mLCL);
			this.__window.add(this.__mainLeftContainer);
		
			var tLCL=new qx.ui.layout.HBox();
			tLCL.setSpacing(spacing);
			this.__topLeftContainer = new qx.ui.container.Composite(tLCL);
			this.__mainLeftContainer.add(this.__topLeftContainer);

			var iCL=new qx.ui.layout.HBox();
			iCL.setSpacing(spacing);
			this.__imageContainer = new qx.ui.container.Composite(iCL);
			this.__mainLeftContainer.add(this.__imageContainer, {flex : 1});

			var mRCL=new qx.ui.layout.VBox();
			mRCL.setSpacing(spacing);
			this.__mainRightContainer = new qx.ui.container.Composite(mRCL);
			this.__window.add(this.__mainRightContainer);
			this.__mainRightContainer.setVisibility("excluded");

			var tRCL=new qx.ui.layout.HBox();
			tRCL.setSpacing(spacing);
			this.__topRightContainer = new qx.ui.container.Composite(tRCL);
			this.__mainRightContainer.add(this.__topRightContainer);

			var bRCL=new qx.ui.layout.HBox();
			bRCL.setSpacing(spacing);
			this.__bottomRightContainer= new qx.ui.container.Composite(bRCL);


			var volView=this;


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
						var volume=response.getElementsByTagName("volume")[0];

						volView.__imgMap.width = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("x"));
						volView.__imgMap.height = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("y"));
						volView.__numberOfSlices = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("z"));
						volView.__slicesNameOffset = parseInt(response.getElementsByTagName("slicesprefix")[0].getAttribute("offset"));
						volView.__slicesNamePrefix = response.getElementsByTagName("slicesprefix")[0].firstChild.nodeValue;
						volView.__timestamp = response.getElementsByTagName("slicesprefix")[0].getAttribute("volView.__timestamp");

						if (volView.__timestamp==null)
							volView.__timestamp = (new Date()).getTime();

						var XMLextent=volume.getElementsByTagName("extent")[0];
						volView.__extent=new Array(parseInt(XMLextent.getAttribute("x1")),
										parseInt(XMLextent.getAttribute("x2")),
										parseInt(XMLextent.getAttribute("y1")),
										parseInt(XMLextent.getAttribute("y2")),
										parseInt(XMLextent.getAttribute("z1")),
										parseInt(XMLextent.getAttribute("z2")));

						var XMLdimensions=volume.getElementsByTagName("dimensions")[0];
						volView.__maxZ=parseInt(XMLdimensions.getAttribute("z"))-1;
						volView.__dimensions=new Array(parseInt(XMLdimensions.getAttribute("x")),
										parseInt(XMLdimensions.getAttribute("y")),
										parseInt(XMLdimensions.getAttribute("z")));

						var XMLspacing=volume.getElementsByTagName("spacing")[0];
						volView.__spacing=new Array(parseFloat(XMLspacing.getAttribute("x")),
										parseFloat(XMLspacing.getAttribute("y")),
										parseFloat(XMLspacing.getAttribute("z")));

						var XMLorigin=volume.getElementsByTagName("origin")[0];
						volView.__origin=new Array(parseFloat(XMLorigin.getAttribute("x")),
										parseFloat(XMLorigin.getAttribute("y")),
										parseFloat(XMLorigin.getAttribute("z")));

						var XMLscalars=volume.getElementsByTagName("scalars")[0];
						volView.__scalarType=parseInt(XMLscalars.getAttribute("type"));
						volView.__scalarSize=parseInt(XMLscalars.getAttribute("size"));
						volView.__scalarMin=parseFloat(XMLscalars.getAttribute("min"));
						volView.__scalarMax=parseFloat(XMLscalars.getAttribute("max"));

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
			globalParamRequest.open("GET",file+"?nocache=" + Math.random(),false);
			globalParamRequest.send(null);
			
			var xmlDoc = globalParamRequest.responseXML;
			var volume = xmlDoc.getElementsByTagName("volume")[0];
			if (volume==null)
				return;

			
			
		////Create pen tool
            var penSize = new qx.ui.form.Spinner().set({
                minimum: 1,
                maximum: 100,
                value: volView.__drawingCanvasParams.myLineWidth
            });
			
            penSize.addListener("changeValue", function(event)
			{
                volView.__htmlContextLabels.lineWidth = event.getData();
                volView.__eraserCursor.set({width: Math.ceil(volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth*volView.__drawingCanvasParams.curCtxtZoom),
                                    height: Math.ceil(volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth*volView.__drawingCanvasParams.curCtxtZoom)});
            });
			
			var penLabel = new qx.ui.basic.Label("Brush : ");
			
			this.__topRightContainer.add(penLabel);
			this.__topRightContainer.add(penSize);
			

		////Create eraser
            var eraserBorder = new qx.ui.decoration.Single(1, "solid", "black");
			
            volView.__eraserCursor = new qx.ui.core.Widget().set({
										backgroundColor: "white",
										decorator: eraserBorder,
										width: volView.__eraserCoeff*volView.__drawingCanvasParams.myLineWidth*volView.__drawingCanvasParams.curCtxtZoom,
										height : volView.__eraserCoeff*volView.__drawingCanvasParams.myLineWidth*volView.__drawingCanvasParams.curCtxtZoom,
										zIndex : volView.__eraserCursorZ
								});
			
            volView.__eraserCursor.addListener("mousedown", function(event)
			{
            ////Erase
				if(event.isLeftPressed())
                {
					getPosition(event,true);
					save2undoStack(event);
					eraseFnct();
                    volView.__mouseData.mouseLeftDownFlag = true;	// Activate erasing while moving
                }
			////Activate moving
                if(event.isMiddlePressed())
                {
					volView.__eraserCursor.set({cursor: "move"});
                    volView.__mouseData.mouseMiddleDownFlag = true;
					volView.__mouseData.recentX = volView.__mouseData.xPos;
					volView.__mouseData.recentY = volView.__mouseData.yPos;
                }
			////"Undo" (draw previous canvas)
				undoFnct(event);
            });
			
            volView.__eraserCursor.addListener("mousemove", function(event)
			{
				getPosition(event,false);	// No scaling so coordinates are compatible with placeEraser function
                var tempMargin = 4/volView.__drawingCanvasParams.curCtxtZoom;
			////Hide eraser if out of drawing zone
                if(!((tempMargin<=volView.__mouseData.xPos)&&(volView.__mouseData.xPos<=volView.__imgMap.width/volView.__drawingCanvasParams.curCtxtZoom-tempMargin)&&(tempMargin<=volView.__mouseData.yPos)&&(volView.__mouseData.yPos<=volView.__imgMap.height/volView.__drawingCanvasParams.curCtxtZoom-tempMargin)))
                {
                    if(volView.__eraserCursor.getVisibility()=="visible")
					{
                        volView.__eraserCursor.exclude();
					}
                }
			////Move eraser to mouse position
                volView.__eraserCursor.set({marginLeft: Math.round((volView.__mouseData.xPos-volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth/2)*volView.__drawingCanvasParams.curCtxtZoom),
                                    marginTop: Math.round((volView.__mouseData.yPos-volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth/2)*volView.__drawingCanvasParams.curCtxtZoom)});
				volView.__mouseData.xPos = volView.__mouseData.decaleZoomX/volView.__drawingCanvasParams.curCtxtZoom + volView.__mouseData.xPos;
                volView.__mouseData.yPos = volView.__mouseData.decaleZoomY/volView.__drawingCanvasParams.curCtxtZoom + volView.__mouseData.yPos;
				if(volView.__mouseData.mouseLeftDownFlag)
						eraseFnct(true);
                if(volView.__mouseData.mouseMiddleDownFlag)
                {
					moveCanvas();
                }
            },this);
			
            volView.__eraserCursor.addListener("mouseup", function(event)
			{
                volView.__mouseData.mouseMiddleDownFlag = false;
                volView.__mouseData.mouseLeftDownFlag = false;
				volView.__eraserCursor.set({cursor: "default"});
            },this);
			
            volView.__eraserCursor.exclude();

			
			
			
		////Create eraser on/off button
            var eraserButton = new qx.ui.form.ToggleButton("Eraser");
			
            eraserButton.set({opacity: 0.5, enabled : false});
			
			eraserButton.addListener("changeValue", function(event)
			{
				if (event.getData()==true)
					volView.setMouseActionMode(4);

            });

            eraserButton.addListener("mouseup", function(event)
			{
                volView.__htmlContextLabels.beginPath();
                volView.__mouseData.mouseLeftDownFlag = false;
            },this);
			
			this.__topRightContainer.add(eraserButton)

			
			
		////Create labels zone
			var colorsPage = new qx.ui.tabview.Page("REGIONS");
			volView.__colorsList=colorsPage;
            colorsPage.setLayout(new qx.ui.layout.Grid(1,1));

			var colorsTabView = new qx.ui.tabview.TabView();
            colorsTabView.add(colorsPage);

            colorsTabView.addListener("mouseup", function(event)
			{
                volView.__htmlContextLabels.beginPath();
                volView.__mouseData.mouseLeftDownFlag = false;
            },this);

			this.__mainRightContainer.add(colorsTabView)
			colorsPage.setVisibility("excluded");

		////Function creates one label box
			var unfocusedBorder = new qx.ui.decoration.Single(2, "solid", "black");
            var focusedBorder = new qx.ui.decoration.Single(3, "solid", "red");
			var boxWidth = 37;
			var columnLimit = 5;
			var colorCount = 5;
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
                    var children = colorsPage.getChildren();
                    while(children[i]!=this)
                    {
                        i++;
                    };
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
                    }
                    volView.__drawingCanvasParams.currentColor = colorBox.getBackgroundColor();
                    colorsPage.set({opacity: 1});
                });
				var boxLabel = new qx.ui.basic.Label("\\" + inLabel.id + " : " + inLabel.name).set({alignX:"left"});
				labelBox.add(boxLabel);
				labelBox.add(colorBox);
				if(inLabel.id<=colorCount)
				{
					colorsPage.add(labelBox, {column: inLabel.id-(nbLines-1)*columnLimit, row: (nbLines-1)});
				}
				else
				{
					nbLines++;
					colorsPage.add(labelBox, {column: inLabel.id-(nbLines-1)*columnLimit, row: (nbLines-1)});
					colorCount += columnLimit;
				};
				var tempColors = colorsPage._getChildren();
				if((boxWidth<boxLabel.getSizeHint().width+8)&&(0<tempColors.length))
				{
					boxWidth = boxLabel.getSizeHint().width + 16;	//// value returned by getSizeHint() is not enough
					for(var i=0; i<tempColors.length; i++)
					{
						tempColors[i].set({width:boxWidth});
						tempColors[i]._getChildren()[1].set({maxWidth:boxWidth-12});
					}
				};
				
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
						nbLabels = response.getElementsByTagName("color").length;
						volView.__labelColors=new Array(nbLabels);
						for(var i=0; i<nbLabels; i++)
						{
							var color=response.getElementsByTagName("color")[i];
							var label=parseInt(color.getAttribute("label"))
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
						};
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
			
			
			
			
			
		////Create brightness/contrast fixing on/off button
			volView.__brghtnssCntrstButton = new qx.ui.form.ToggleButton(null, "desk/Contrast_Logo_petit.PNG");

			volView.__brghtnssCntrstButton.set({toolTipText : "LUMINOSITE/CONTRASTE"});

			volView.__brghtnssCntrstButton.addListener("click", function(event)
			{
				if (volView.__brghtnssCntrstButton.getValue()==true)
					volView.setMouseActionMode(1);
				else
					volView.setMouseActionMode(0);
			});
			
			
			
		////Create reset brightness/contrast button
			var resetBrCrButton = new qx.ui.form.Button("Reset");
            
			resetBrCrButton.set({opacity: 0.5, enabled : false});
			
			resetBrCrButton.addListener("execute", function(event)
			{
                volView.__imgCanvasParams.brightness = 0;
                volView.__imgCanvasParams.contrast = 0;
				drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
            });
	

			
		////Create slider
            var slider = new qx.ui.form.Slider();
            slider.setWidth(30);
            slider.setMaximum(volView.__numberOfSlices-1);
            slider.setMinimum(0);
            slider.setOrientation("vertical");
            this.__slider=slider;
			
		////Create spinner and sync it with the slider
            var spinner = new qx.ui.form.Spinner();
            this.__spinner=spinner;
            spinner.setMaximum(volView.__numberOfSlices-1);
            spinner.setMinimum(0);
            spinner.setValue(0);
            slider.addListener("changeValue",function(e){
            	spinner.setValue(volView.__numberOfSlices-1-e.getData());});

			volView.__topLeftContainer.add(spinner);
			volView.__topLeftContainer.add(volView.__brghtnssCntrstButton);
			volView.__topLeftContainer.add(resetBrCrButton);

			var slashIndex = file.lastIndexOf("/");
			this.__pathJPG = "";
			if (slashIndex>0)
				this.__pathJPG = file.substring(0,slashIndex)+"\/";

			volView.__topLeftContainer.add(new qx.ui.core.Spacer(),{flex : 1});
			volView.__formatSelectBox=volView.__getFormatSelectBox()
			volView.__topLeftContainer.add(volView.__formatSelectBox);
			volView.__topLeftContainer.add(new qx.ui.core.Spacer(),{flex : 1});			
			volView.__topLeftContainer.add(volView.__getDragAndDropLabel());	
			volView.__topLeftContainer.add(volView.__getPaintPanelVisibilitySwitch());

			var sessionsListLayout=new qx.ui.layout.HBox();
			sessionsListLayout.setSpacing(spacing);
			var sessionsListContainer=new qx.ui.container.Composite(sessionsListLayout);
			var sessionsListLabel=new qx.ui.basic.Label("Sessions : ");
			sessionsListContainer.add(new qx.ui.core.Spacer(), {flex: 5});
			sessionsListContainer.add(sessionsListLabel);
			volView.__sessionsList=volView.__getSessionsList();
			sessionsListContainer.add(volView.__sessionsList);
			volView.__mainRightContainer.add(sessionsListContainer);

//			this.__mainRightContainer.add(new qx.ui.core.Spacer(30, 40), {flex: 5});


			
		////Create start algorithm button
			var startButton = new qx.ui.form.ToggleButton("Start segmentation");

            startButton.set({opacity: 0.5, enabled : false});
			this.__mainRightContainer.add(this.__bottomRightContainer);
			this.__bottomRightContainer.add(startButton);
			
			
			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("Opacity :");
			this.__topRightContainer.add(whileDrawingDrwngOpacityLabel);
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
			whileDrawingDrwngOpacitySlider.setValue(100);
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
					drawingCanvas.set({opacity: event.getData()/100});
			},this);
            this.__topRightContainer.add(whileDrawingDrwngOpacitySlider, {flex : 1});			
			
			
			
			var updateContext = function(event)
			{
				var data = event.getData();

				volView.__drawingCanvasParams.drawingContext.setTransform(volView.__drawingCanvasParams.curCtxtZoom,0,0,volView.__drawingCanvasParams.curCtxtZoom,0,0);
				volView.__drawingCanvasParams.drawingContext.mozImageSmoothingEnabled = false;
				volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
				volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
				volView.__htmlContextLabels.lineWidth = volView.__drawingCanvasParams.myLineWidth*volView.__drawingCanvasParams.curCtxtZoom;
				volView.__htmlContextLabels.lineCap = volView.__drawingCanvasParams.myLineCap;
				volView.__htmlContextLabels.lineJoin = volView.__drawingCanvasParams.myLineJoin;
				volView.__htmlContextLabels.miterLimit = volView.__drawingCanvasParams.myMiterLimit;
				volView.__htmlContextLabels.setTransform(volView.__drawingCanvasParams.curCtxtZoom,0,0,volView.__drawingCanvasParams.curCtxtZoom,0,0);
				volView.__htmlContextLabels.mozImageSmoothingEnabled = false;
			};
			
			var mouseDownHandler = function(event)
            {
				////Update image
				if(!((volView.__mouseData.brCrFixingFlag)&&(volView.__mouseData.mouseLeftDownFlag)))
				{
					volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
					drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
				}
				getPosition(event,true);
			////Draw at cursor position, activate drawing, activate brightness/contrast fixing
				if(event.isLeftPressed())
                {
       				volView.__mouseActionActive=true;
					if((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.eraseFlag))
					{
		            	volView.__currentSeedsModified=true;
						save2undoStack(event);
					}
					if (volView.__mouseActionMode==3)
                    {
						drawBrush(event,volView.__drawingCanvasParams.curCtxtZoom);
                        volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
                        volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
                        volView.__htmlContextLabels.beginPath();
                        volView.__htmlContextLabels.arc(volView.__mouseData.xPos,
												volView.__mouseData.yPos,
														volView.__htmlContextLabels.lineWidth/2,
                                                        0, Math.PI*2, false);
                        volView.__htmlContextLabels.closePath();
                        volView.__htmlContextLabels.fill();
                        if(!eraserButton.isEnabled())
                            eraserButton.set({opacity: 1, enabled : true});
                    }

					if (volView.__mouseActionMode==1);
                    {
                        drawingCanvas.set({cursor: "crosshair"});
                        volView.__mouseData.recentX = volView.__mouseData.xPos;
                        volView.__mouseData.recentY = volView.__mouseData.yPos;
                    };
					volView.__mouseData.mouseLeftDownFlag = true;
                    volView.__htmlContextLabels.beginPath();
                }
			////Activate moving
                if((event.isMiddlePressed())&&(1<volView.__drawingCanvasParams.curCtxtZoom))
				{
					drawingCanvas.set({cursor: "move"});
					volView.__mouseData.mouseMiddleDownFlag = true;
				}
				volView.__mouseData.recentX = volView.__mouseData.xPos;
                volView.__mouseData.recentY = volView.__mouseData.yPos;
			////"Undo" (draw previous canvas)
				undoFnct(event);
            };
			
			var wheelScale = 0;
            var mouseWheelHandler = function(event)
            {
				if((event.isLeftPressed()==false)&&(event.isMiddlePressed()==false)&&(event.isRightPressed()==false))
				{
					var tempScale = wheelScale;
					tempScale += -event.getWheelDelta()/8;
					volView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
					volView.__imgCanvasParams.imgContext.setTransform(1,0,0,1,0,0);
					var curentZoom = volView.__drawingCanvasParams.curCtxtZoom;
					var zoomFactor = Math.pow(2,tempScale);
				////Apply zoom
					if((1<=zoomFactor)&&(zoomFactor<=volView.__MaxZoom))	////Only zoom no shrinking and not more than Max zoom
					{
						volView.debug(" zoom = x" + zoomFactor);
						var location=volView.__imageCanvas.getContentLocation();
						volView.__mouseData.xPos = event.getDocumentLeft()-location.left;
						volView.__mouseData.yPos = event.getDocumentTop()-location.top;
						var onImageX = volView.__mouseData.decaleZoomX + volView.__mouseData.xPos;
						var onImageY = volView.__mouseData.decaleZoomY + volView.__mouseData.yPos;
						volView.__imgCanvasParams.imgContext.clearRect(-16,-16,volView.__imgMap.width+32, volView.__imgMap.height+32);
						volView.__drawingCanvasParams.drawingContext.clearRect(-16,-16,volView.__imgMap.width+32, volView.__imgMap.height+32);
					////Zoom in
						if(zoomFactor!=1)
						{
							volView.__drawingCanvasParams.drawingContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
							volView.__imgCanvasParams.imgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
							var tempDecaleX = (onImageX*zoomFactor/curentZoom-volView.__mouseData.xPos)/zoomFactor;
							var tempDecaleY = (onImageY*zoomFactor/curentZoom-volView.__mouseData.yPos)/zoomFactor;
							if(tempDecaleX<0)
							{
								volView.__mouseData.decaleZoomX = 0;
							}
							if(volView.__imgMap.width-volView.__imgMap.width/zoomFactor<tempDecaleX)
							{
								volView.__mouseData.decaleZoomX = volView.__imgMap.width-volView.__imgMap.width/zoomFactor;
							}
							if((0<=tempDecaleX)&&(tempDecaleX<=volView.__imgMap.width-volView.__imgMap.width/zoomFactor))
							{
								volView.__mouseData.decaleZoomX = tempDecaleX;
							}
							if(tempDecaleY<0)
							{
								volView.__mouseData.decaleZoomY = 0;
							}
							if(volView.__imgMap.height-volView.__imgMap.height/zoomFactor<tempDecaleY)
							{
								volView.__mouseData.decaleZoomY = volView.__imgMap.height-volView.__imgMap.height/zoomFactor;
							}
							if((0<=tempDecaleY)&&(tempDecaleY<=volView.__imgMap.height-volView.__imgMap.height/zoomFactor))
							{
								volView.__mouseData.decaleZoomY = tempDecaleY;
							}
							volView.__mouseData.decaleZoomX = volView.__mouseData.decaleZoomX*zoomFactor;
							volView.__mouseData.decaleZoomY = volView.__mouseData.decaleZoomY*zoomFactor;
							var newCoor = changeInto05Coordinates(volView.__mouseData.decaleZoomX,volView.__mouseData.decaleZoomY);
							volView.__mouseData.decaleZoomX = newCoor.newX;
							volView.__mouseData.decaleZoomY = newCoor.newY;
							drawZoomedCanvas(zoomFactor,true);
						}
					////Reset image and drawing canvas
						else
						{
							resetZoom();
						}
					////Draw cursor
						if(volView.__mouseActionMode==3)
						{
							drawBrush(event,zoomFactor);
						}
						volView.__eraserCursor.set({width: Math.ceil(volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth*zoomFactor)+1,
											height: Math.ceil(volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth*zoomFactor)+1});
					////Place the center of the eraser at mouse position
						if(volView.__drawingCanvasParams.eraseFlag)
						{
							volView.__eraserCursor.set({marginLeft: Math.round((volView.__mouseData.xPos/zoomFactor-volView.__eraserCursor.getBounds().width/(2*zoomFactor))*zoomFactor+volView.__imgMap.left),
												marginTop: Math.round((volView.__mouseData.yPos/zoomFactor-volView.__eraserCursor.getBounds().height/(2*zoomFactor))*zoomFactor+volView.__imgMap.top)});
						}
						wheelScale = tempScale;
						volView.__drawingCanvasParams.curCtxtZoom = zoomFactor;
					}
				}
            };
			
			var mouseMoveHandler = function(event)
            {

				getPosition(event,true);
                if(volView.__mouseData.mouseMiddleDownFlag)
					moveCanvas();
				else
					drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);

				switch (volView.__mouseActionMode)
				{
				case 3 :
					drawBrush(event,volView.__drawingCanvasParams.curCtxtZoom);
					break;
				case 4 :
					////Set eraser cursor position
					var canvasLocation=volView.__imageCanvas.getContentLocation();
					var tempX = (event.getDocumentLeft()-canvasLocation.left)/volView.__drawingCanvasParams.curCtxtZoom;
					var tempY = (event.getDocumentTop()-canvasLocation.top)/volView.__drawingCanvasParams.curCtxtZoom;
					volView.__eraserCursor.set({marginLeft: Math.round((tempX-volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth/2)*volView.__drawingCanvasParams.curCtxtZoom),
						marginTop: Math.round((tempY-volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth/2)*volView.__drawingCanvasParams.curCtxtZoom)});
					if(volView.__eraserCursor.getVisibility()=="excluded")
						volView.__eraserCursor.show();
					break;
				default:
				}

				if (volView.__mouseActionActive)
				{
					switch (volView.__mouseActionMode)
					{
					case 1 :
						////Use mouse mouvement to set brightness/contrast
						var tempBrightness = volView.__imgCanvasParams.brightness + (volView.__mouseData.yPos-volView.__mouseData.recentY)*150/volView.__imgMap.height;
						var tempContrast = volView.__imgCanvasParams.contrast + (volView.__mouseData.xPos-volView.__mouseData.recentX)*5/volView.__imgMap.width;
						if((0<tempBrightness+150)&&(tempBrightness<150))
							volView.__imgCanvasParams.brightness = tempBrightness;
						if((0<tempContrast+1)&&(tempContrast<20))
							volView.__imgCanvasParams.contrast = tempContrast;
						drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
						resetBrCrButton.set({opacity: 1, enabled : true});
						volView.__mouseData.recentX = volView.__mouseData.xPos;
						volView.__mouseData.recentY = volView.__mouseData.yPos;
						drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
						break;
					case 3 : 
						////Draw to mouse position
						volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
						volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
						volView.__htmlContextLabels.lineTo(volView.__mouseData.xPos,volView.__mouseData.yPos);
						volView.__htmlContextLabels.stroke();
						break;
					case 4 :
						////Erase at mouse position
						eraseFnct(true);
						break;
						default:
							//do nothing
					}
 				}

            };
			
			var mouseUpHandler = function(event)
            {
                    volView.__mouseData.mouseLeftDownFlag = false;
					volView.__mouseData.mouseMiddleDownFlag = false;
					volView.__updateCursorType();
                    drawingCanvas.set({cursor: "default"});
					volView.__mouseActionActive=false;
            };
			
			
			
		////Create results array for each slice image
            for(var i=0; i<volView.__numberOfSlices; i++)
            {
                volView.__horizSlices.sliceResults[i] = [];
				volView.__horizSlices.usedSliceSeeds[i] = [];
            };


			
			this.__imageCanvas = new qx.ui.container.Composite(new qx.ui.layout.Canvas);
			var imgCanvas = new qx.ui.embed.Canvas().set({syncDimension: true,
														zIndex: volView.__imageZ,
														width : volView.__imgMap.width,
														height : volView.__imgMap.height });

			this.__imageCanvas.add(imgCanvas);
			volView.__imageContainer.add(this.__imageCanvas);
			volView.__imageContainer.add(slider, {flex : 1});

			var modifSlicesList = new qx.ui.form.List();
			modifSlicesList.setWidth(30);
			volView.__seedsList=modifSlicesList;
			modifSlicesList.addListener("keypress", function(event)
			{
				if(event.getKeyIdentifier()=="Delete")
				{
					var selectedChild = modifSlicesList.getSelection()[0];
					if (selectedChild!=null)
					{
						var sliceId = selectedChild.getUserData("slice");
					////Erase image on the server
						eraseFile(volView.__sessionDirectory+"/"+volView.getSeedFileName(sliceId));
						volView.__seedsArray[sliceId]=0;
						console.log("deleted slice "+sliceId)
						volView.__clearDrawingCanvas();
						modifSlicesList.remove(selectedChild);

						updateSeedsXML();
					}
				}
			}, this);

			this.__imageContainer.add(modifSlicesList, {flex : 1});
			modifSlicesList.setVisibility("excluded");
			
			imgCanvas.addListener("redraw", function(event)
			{
                    var data = event.getData();
                    volView.__imgCanvasParams.imgContext = data.context;
					volView.__htmlCanvasImage = volView.__embedObjectImage.getContentElement().getDomElement().firstChild;
                    volView.__htmlContextImage = volView.__htmlCanvasImage.getContext("2d");
					volView.__htmlContextImage.drawImage(canvasImage, 0, 0, canvasImage.width, canvasImage.height);	// here for unbuild version
					volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage, 0, 0, canvasImage.width, canvasImage.height);	// here for unbuild version
            }, this);
			
			
			this.__imageCanvas.addListener("mouseout", function(event)
			{
				this.__mouseActionActive=false;
	//			if(((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.brCrFixingFlag))&&(!volView.__drawingCanvasParams.eraseFlag))
				{
					volView.__htmlContextLabels.beginPath();
					volView.__mouseData.mouseLeftDownFlag = false;
					volView.__mouseData.mouseMiddleDownFlag = false;
					volView.__eraserCursor.set({cursor: "default"});
					drawingCanvas.set({cursor: "default"});
				//	volView.__eraserCursor.exclude(); this should be here, but when enabled, the eraser cursor blinks
				}
			},this);

			this.__imageCanvas.addListener("click", function(event)
			{
				volView.__winMap.left = volView.getBounds().left;
				volView.__winMap.top = volView.getBounds().top;
			},this);			
			
			var canvasImage = new Image();

			volView.__loadImage=canvasImage;

			var seedImage = new Image();
			volView.__loadSeeds=seedImage;
			
            var drawingCanvas = new qx.ui.embed.Canvas().set({syncDimension: true,
            											 zIndex: volView.__drawingCanvasZ,
            											 width : volView.__imgMap.width,
														height : volView.__imgMap.height });

			this.__imageCanvas.add(drawingCanvas);		
			
            // HTML embed for background image
            var embedHtmlCodeImage = '<canvas id="htmlTagCanvasImage" width="' + volView.__imgMap.width + '" height="' + volView.__imgMap.height + '" ></canvas>';
            var embedObjectImage = new qx.ui.embed.Html(embedHtmlCodeImage);
            embedObjectImage.setDecorator("main");
            embedObjectImage.setWidth(volView.__imgMap.width);
            embedObjectImage.setHeight(volView.__imgMap.height);
			
            var containerLayoutImage = new qx.ui.layout.VBox();
            var containerHtmlImage = new qx.ui.container.Composite(containerLayoutImage);
            containerHtmlImage.add(embedObjectImage);
			this.__embedObjectImage=embedObjectImage;
			this.__imageCanvas.add(containerHtmlImage);
			
			
            // HTML embed for drawn labels
            var embedHtmlCodeLabels = '<canvas id="htmlTagCanvasLabels" width="' + volView.__imgMap.width + '" height="' + volView.__imgMap.height + '" ></canvas>';
            var embedObjectLabels = new qx.ui.embed.Html(embedHtmlCodeLabels);
            embedObjectLabels.setDecorator("main");
            embedObjectLabels.setWidth(volView.__imgMap.width);
            embedObjectLabels.setHeight(volView.__imgMap.height);
			
            var containerLayoutLabels = new qx.ui.layout.VBox();
            var containerHtmlLabels = new qx.ui.container.Composite(containerLayoutLabels);
            containerHtmlLabels.add(embedObjectLabels);
			this.__embedObjectLabels=embedObjectLabels;
			this.__imageCanvas.add(containerHtmlLabels);
			
			
            // HTML embed for segmented image
            var embedHtmlCodeSegImg = '<canvas id="htmlTagCanvasSegImg" width="' + volView.__imgMap.width + '" height="' + volView.__imgMap.height + '" ></canvas>';
            var embedObjectSegImg = new qx.ui.embed.Html(embedHtmlCodeSegImg);
            embedObjectSegImg.setDecorator("main");
            embedObjectSegImg.setWidth(volView.__imgMap.width);
            embedObjectSegImg.setHeight(volView.__imgMap.height);
			
            var containerLayoutSegImg = new qx.ui.layout.VBox();
            var containerHtmlSegImg = new qx.ui.container.Composite(containerLayoutSegImg);
            containerHtmlSegImg.add(embedObjectSegImg);
			this.__embedObjectSegImg=embedObjectSegImg;
			
			this.__imageCanvas.add(containerHtmlSegImg);
			
            // HTML embed for seeds used for segmentation
            var embedHtmlCodeUsedSeeds = '<canvas id="htmlTagCanvasUsedSeeds" width="' + volView.__imgMap.width + '" height="' + volView.__imgMap.height + '" ></canvas>';
            var embedObjectUsedSeeds = new qx.ui.embed.Html(embedHtmlCodeUsedSeeds);
            embedObjectUsedSeeds.setDecorator("main");
            embedObjectUsedSeeds.setWidth(volView.__imgMap.width);
            embedObjectUsedSeeds.setHeight(volView.__imgMap.height);
			
            var containerLayoutUsedSeeds = new qx.ui.layout.VBox();
            var containerHtmlUsedSeeds = new qx.ui.container.Composite(containerLayoutUsedSeeds);
            containerHtmlUsedSeeds.add(embedObjectUsedSeeds);
			this.__embedObjectUsedSeeds=embedObjectUsedSeeds;
			this.__imageCanvas.add(containerHtmlUsedSeeds);

			volView.__resetSeedsList();
	
			spinner.addListener("changeValue", function(event)
			{
				var newSliceIndex=event.getData();
				if (newSliceIndex!=Math.round(newSliceIndex))
				{
					spinner.setValue(Math.round(newSliceIndex));
					return;
				}
				slider.setValue(volView.__numberOfSlices-1-newSliceIndex);

				volView.__htmlContextLabels.beginPath(); // seb : why???
				volView.__mouseData.mouseLeftDownFlag = false;
				var oldSliceIndex= volView.__drawingCanvasParams.sliceNumber;

				var sliceHasSeeds=false;
				if (volView.__seedsArray[oldSliceIndex]!=0)
					sliceHasSeeds=true;
				
				sliceHasSeeds=	!pngCanvasFctn(sliceHasSeeds);	//  pngCanvasFctn() returns true if image is all black

			////Update lists
				if(sliceHasSeeds)	////CURRENT slice has seeds
				{
					if(volView.__seedsArray[oldSliceIndex]==0)
					{
						volView.__addNewSeedItemToList(oldSliceIndex);
						updateSeedsXML();
					}
				////Since there is at least one saved seeds image, activate start button
                    if(!startButton.isEnabled())
                            startButton.set({opacity: 1, enabled : true});
				}

				volView.__drawingCanvasParams.sliceNumber = newSliceIndex;
				volView.__updateAll();
			}, this);

		//	spinner.setValue(0);//Math.round(0.5*volView.__numberOfSlices));


            volView.__imageCanvas.add(volView.__eraserCursor);

		function waitForinit()
		{
			// wait for the canvas to really appear in the window otherwise things get bad
			if ((volView.__embedObjectImage.getContentElement().getDomElement()==null)||
				(volView.__embedObjectLabels.getContentElement().getDomElement()==null)||
				(drawingCanvas.getContext2d()==null))
				{
				console.log("not yet ready");
				setTimeout(waitForinit, 100);
				}
			else
			{
				console.log("ready");
				volView.__htmlCanvasLabels = volView.__embedObjectLabels.getContentElement().getDomElement().firstChild;
				volView.__htmlContextLabels = volView.__htmlCanvasLabels.getContext("2d");
				volView.__drawingCanvasParams.drawingContext = drawingCanvas.getContext2d();


				drawingCanvas.addListener("redraw", updateContext, volView);
				drawingCanvas.addListener("mousedown", mouseDownHandler, volView);
				drawingCanvas.addListener("mousewheel", mouseWheelHandler, volView);
				volView.__eraserCursor.addListener("mousewheel", mouseWheelHandler, volView);
				drawingCanvas.addListener("mousemove", mouseMoveHandler, volView);
				drawingCanvas.addListener("mouseup", mouseUpHandler, volView);

				spinner.setValue(Math.round(volView.__dimensions[2]/2));
			}
		}
		waitForinit();

		this.__window.open();

		/* ************************************************************************************************************************************* */
		//
		//	F U N C T I O N S
		//
		/* ************************************************************************************************************************************* */
			
			
			
			
			
        ////Computes on image mouse position
		////If(scaling) applies zoom factor for relative coordinates (on zoomed window)
			var getPosition = function(mouseEvent,scaling)
            {
				var canvasLocation=volView.__imageCanvas.getContentLocation();
				volView.__mouseData.xPos = (mouseEvent.getDocumentLeft()-canvasLocation.left)/volView.__drawingCanvasParams.curCtxtZoom;
				volView.__mouseData.yPos = (mouseEvent.getDocumentTop()-canvasLocation.top)/volView.__drawingCanvasParams.curCtxtZoom;

				if(scaling)
				{
					volView.__mouseData.xPos = volView.__mouseData.decaleZoomX/volView.__drawingCanvasParams.curCtxtZoom + volView.__mouseData.xPos;
					volView.__mouseData.yPos = volView.__mouseData.decaleZoomY/volView.__drawingCanvasParams.curCtxtZoom + volView.__mouseData.yPos;
				}
				var newCoor = changeInto05Coordinates(volView.__mouseData.xPos,volView.__mouseData.yPos);
				volView.__mouseData.xPos = newCoor.newX;
				volView.__mouseData.yPos = newCoor.newY;
			};
			
			
			
			
			
		////Changes int coordinates into nearest  xxx,5  value to prevent some effects of antialiasing
			var changeInto05Coordinates = function(X,Y)
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
			};
			
			
			
			
			
		////Function applies zoom to image and drawing cavas
			var drawZoomedCanvas = function(zoomFactor,zooming)
            {
                var sx = volView.__mouseData.decaleZoomX/zoomFactor;
                var sy = volView.__mouseData.decaleZoomY/zoomFactor;
                var sdw = volView.__imgMap.width/zoomFactor;
                var sdh = volView.__imgMap.height/zoomFactor;
			////Make sure values are integers and complemantary
				if(sx<0)
				{
					sx = 0;
				}
				if(volView.__imgMap.width<sx+sdw)
				{
					sx = Math.abs(volView.__imgMap.width-sdw);
				}
				if(sy<0)
				{
					sy = 0;
				}
				if(volView.__imgMap.height<sy+sdh)
				{
					sy = Math.abs(volView.__imgMap.height-sdh);
				}
				volView.__drawingCanvasParams.drawingContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
				volView.__imgCanvasParams.imgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
			////Refresh image while drawing
				if(zooming)
				{
					if(canvasImage.complete)
					{
						volView.__htmlContextImage.drawImage(canvasImage, 0, 0, canvasImage.width, canvasImage.height);
						var outImg = processBrCr(volView.__imgCanvasParams.brightness, volView.__imgCanvasParams.contrast, true);
						volView.__htmlContextImage.putImageData(outImg, 0, 0);
						volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage,
																sx,
																sy,
																sdw,
																sdh,
																0,
																0,
																sdw,
																sdh);
					}
					else
					{
							volView.__htmlContextImage.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
							volView.__htmlContextImage.font = 'bold 21px sans-serif';
							volView.__htmlContextImage.textBaseLine = 'bottom';
							volView.__htmlContextImage.fillText('Image not yet loaded', (volView.__imgMap.width-volView.__imgMap.height)/2, volView.__imgMap.height/2);
							volView.__imgCanvasParams.imgContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
					}
				}
			////Refresh drawing canvas while only moving cursor
				if(!((volView.__mouseData.brCrFixingFlag)&&(volView.__mouseData.mouseLeftDownFlag)&&(volView.__drawingCanvasParams.eraseFlag)))
				{
						volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
						volView.__drawingCanvasParams.drawingContext.drawImage(volView.__htmlCanvasLabels,
                                                                    sx,
                                                                    sy,
                                                                    sdw,
                                                                    sdh,
                                                                    0,
                                                                    0,
                                                                    sdw,
                                                                    sdh);
				}
			};
			
			this.__drawZoomedCanvas=drawZoomedCanvas;
			
			
			
		////Draw circle at mouse position
		////The labels image is not modified
			var drawBrush = function(mouseEvent,scale)
            {
				var canvasLocation=volView.__imageCanvas.getContentLocation();
                var tempX = (mouseEvent.getDocumentLeft()-canvasLocation.left)/scale;
                var tempY = (mouseEvent.getDocumentTop()-canvasLocation.top)/scale;
                var tempMargin = 4/scale;
                if((tempMargin<tempX)&&(tempX<volView.__imgMap.width/scale-tempMargin)&&(tempMargin<tempY)&&(tempY<volView.__imgMap.height/scale-tempMargin))
                {
                    volView.__drawingCanvasParams.drawingContext.strokeStyle = volView.__drawingCanvasParams.currentColor;
                    volView.__drawingCanvasParams.drawingContext.fillStyle = volView.__drawingCanvasParams.currentColor;
                    volView.__drawingCanvasParams.drawingContext.beginPath();
                    volView.__drawingCanvasParams.drawingContext.arc(tempX,
                                                            tempY,
																	Math.ceil(volView.__htmlContextLabels.lineWidth/2),
                                                                    0, Math.PI * 2, false);
                    volView.__drawingCanvasParams.drawingContext.closePath();
                    volView.__drawingCanvasParams.drawingContext.fill();
                }
			};


		////Save current labels image (used before any modification on the canvas)
			var save2undoStack = function(mouseEvent)
            {
				if(!mouseEvent.isRightPressed())
				{
					var tempData = [];
					if(volView.__ctrlZData.length==0)
					{
						tempData[0] = volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
					}
					else
					{
						if(volView.__ctrlZData.length<volView.__undoLimit)
						{
							for(var i=0; i<volView.__ctrlZData.length; i++)
							{
									tempData[volView.__ctrlZData.length-i] = volView.__ctrlZData[volView.__ctrlZData.length-i-1];
							}
							tempData[0] = volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
						}
						else
						{
							if(volView.__ctrlZData.length==volView.__undoLimit)
							{
								for(var i=1; i<volView.__ctrlZData.length; i++)
								{
									tempData[volView.__ctrlZData.length-i] = volView.__ctrlZData[volView.__ctrlZData.length-i-1];
								}
								tempData[0] = volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
							}
						}
					}
					volView.__ctrlZData = tempData;
				}
			};
			
			
			
			
			
		////Pops out the last state in the "undo" stack and draw image on the canvas
            var undoFnct = function(mouseEvent)
            {
            	volView.__currentSeedsModified=true;
				if(mouseEvent.isRightPressed())
				{
					if(0<volView.__ctrlZData.length)
					{
						volView.__htmlContextLabels.putImageData(volView.__ctrlZData[0], 0, 0);
						drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
					}
					var tempData = [];
					for(var i=1; i<volView.__ctrlZData.length; i++)
					{
						tempData[i-1] = volView.__ctrlZData[i];
					}
					volView.__ctrlZData = tempData;
				}
			};
			
			
			
			
			
		////Redraw image and drawing canvas when translation
            var moveCanvas = function()
            {
				var tempDecaleX = volView.__mouseData.decaleZoomX/volView.__drawingCanvasParams.curCtxtZoom + volView.__mouseData.recentX-volView.__mouseData.xPos;
				var tempDecaleY = volView.__mouseData.decaleZoomY/volView.__drawingCanvasParams.curCtxtZoom + volView.__mouseData.recentY-volView.__mouseData.yPos;
				if(tempDecaleX<0)
				{
					volView.__mouseData.decaleZoomX = 0;
				}
				if(volView.__imgMap.width-volView.__imgMap.width/volView.__drawingCanvasParams.curCtxtZoom<tempDecaleX)
				{
					volView.__mouseData.decaleZoomX = volView.__imgMap.width-volView.__imgMap.width/volView.__drawingCanvasParams.curCtxtZoom;
				}
				if((0<=tempDecaleX)&&(tempDecaleX<=volView.__imgMap.width-volView.__imgMap.width/volView.__drawingCanvasParams.curCtxtZoom))
				{
					volView.__mouseData.decaleZoomX = tempDecaleX;
				}
				if(tempDecaleY<0)
				{
					volView.__mouseData.decaleZoomY = 0;
				}
				if(volView.__imgMap.height-volView.__imgMap.height/volView.__drawingCanvasParams.curCtxtZoom<tempDecaleY)
				{
					volView.__mouseData.decaleZoomY = volView.__imgMap.height-volView.__imgMap.height/volView.__drawingCanvasParams.curCtxtZoom;
				}
				if((0<=tempDecaleY)&&(tempDecaleY<=volView.__imgMap.height-volView.__imgMap.height/volView.__drawingCanvasParams.curCtxtZoom))
				{
					volView.__mouseData.decaleZoomY = tempDecaleY;
				}
				volView.__mouseData.decaleZoomX = volView.__mouseData.decaleZoomX*volView.__drawingCanvasParams.curCtxtZoom;
				volView.__mouseData.decaleZoomY = volView.__mouseData.decaleZoomY*volView.__drawingCanvasParams.curCtxtZoom;
				drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
			};
			
			
			
			
			
		////Clear labels canvas at mouse position
            var eraseFnct = function(autoComplete)
            {
            	volView.__currentSeedsModified=true;
				var tempX, tempY;
				if(autoComplete)
				{
					tempX = (volView.__mouseData.recentX+volView.__mouseData.xPos)/2-volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth/2;
					tempY = (volView.__mouseData.recentY+volView.__mouseData.yPos)/2-volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth/2;
					var newCoor = changeInto05Coordinates(tempX,tempY);
					tempX = newCoor.newX;
					tempY = newCoor.newY;
                    volView.__htmlContextLabels.clearRect(tempX,
                                                tempY,
                                                    volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth,
                                                    volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth);
				}
				tempX = volView.__mouseData.xPos-volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth/2;
				tempY = volView.__mouseData.yPos-volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth/2;
				var newCoor = changeInto05Coordinates(tempX,tempY);
				tempX = newCoor.newX;
				tempY = newCoor.newY;
                volView.__htmlContextLabels.clearRect(tempX,
											tempY,
												volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth,
												volView.__eraserCoeff*volView.__htmlContextLabels.lineWidth);
                drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
                volView.__mouseData.recentX = volView.__mouseData.xPos;
                volView.__mouseData.recentY = volView.__mouseData.yPos;
			};
			
			
			
			
			
		////Redraw image canvas at original scale
            var resetZoom = function(autoComplete)
            {
				volView.__imgCanvasParams.imgContext.setTransform(1,0,0,1,0,0);
				volView.__htmlContextImage.drawImage(canvasImage, 0, 0, canvasImage.width, canvasImage.height);
				var outImg = processBrCr(volView.__imgCanvasParams.brightness, volView.__imgCanvasParams.contrast, true);
				volView.__htmlContextImage.putImageData(outImg, 0, 0);
				volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage, 0, 0, canvasImage.width, canvasImage.height);
				volView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
				volView.__drawingCanvasParams.drawingContext.drawImage(volView.__htmlCanvasLabels,0,0);
				volView.__mouseData.decaleZoomX = 0;
				volView.__mouseData.decaleZoomY = 0;
				wheelScale = 0;
				volView.__drawingCanvasParams.curCtxtZoom = 1;
			};
			
			
			
			
			
		////Function reads drawing canvas to save it in png format in the server  or
		//// to return true value if image is all black (if canvas is empty)
            var pngCanvasFctn = function(previousValue)
            {
            	if (volView.__currentSeedsModified==false)
            		return (!previousValue);

                var sliceData = volView.__htmlContextImage.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
                var pixels = sliceData.data;
                var seeds=volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height).data;
                var isAllBlack = true;
                var labelColors=volView.__labelColors;
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
					////Send png image to server
					sliceData.data = pixels;
					volView.__htmlContextLabels.putImageData(sliceData, 0, 0);
					var pngImg = volView.__htmlCanvasLabels.toDataURL("image/png");
					var commaIndex=pngImg.lastIndexOf(",");
				    var base64Img = pngImg.substring(commaIndex+1,pngImg.length);
					var parameterMap={
						"action" : "save_binary_file",
						"file_name" : volView.getSeedFileName(volView.__drawingCanvasParams.sliceNumber),
						"base64Data" : base64Img,
						"output_directory" : volView.__sessionDirectory};

					volView.__fileBrowser.getActions().launchAction(parameterMap);
					volView.__seedsCacheTags[volView.__drawingCanvasParams.sliceNumber]=Math.random();
					updateSeedsXML();
                }
                return isAllBlack;
            };

		////Function applies brightness and contrast values
            var processBrCr = function(inBrightness, inContrast, inLegacy)
            {
                var brightness = inBrightness; //parsing ???
                var contrast = inContrast; //parsing ???
                var legacy = !!(inLegacy && inLegacy != "false");
                if (legacy) {
                    brightness = Math.min(150,Math.max(-150,brightness));
                } else {
                    var brightMul = 1 + Math.min(150,Math.max(-150,brightness)) / 150;
                }
                contrast = Math.max(0,contrast+1);
                if (typeof volView.__htmlContextImage.getImageData == "function")
                {
                    var dataDesc = volView.__htmlContextImage.getImageData(0, 0, canvasImage.width, canvasImage.height);
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
                    dataDesc.data = data;
                    volView.__pixels=data;
					volView.setSlice(Math.random());
                }
                return dataDesc;
            };


		////Use a php file to remove the spceciefd file in the server
			var eraseFile = function(file)
            {
				var parameterMap={
					"action" : "delete_file",
					"file_name" : file};

				volView.__fileBrowser.getActions().launchAction(parameterMap);
			};



		////Rewrite xml list of the drawn seeds
			var updateSeedsXML = function()
            {
				var xmlContent = '\n';
				var colors='\n';
				for(var i=0; i<volView.__labelColors.length; i++)
				{
					colors+=element('color',null, volView.__labelColors[i]);
				}
				xmlContent+=element('colors', colors);
				var seedsList=modifSlicesList.getChildren();
				for(var i=0; i<seedsList.length; i++)
				{
					var sliceId=seedsList[i].getUserData("slice");
					var sliceAttributes = {slice: sliceId + ""};
					xmlContent += element('seed', volView.getSeedFileName(sliceId), sliceAttributes) + '\n';
				}

				var parameterMap={
					"action" : "save_XML_file",
					"file_name" : "seeds.xml",
					"xmlData" : element('seeds', xmlContent),
					"output_directory" : volView.__sessionDirectory};

				volView.__fileBrowser.getActions().launchAction(parameterMap);
			};
			

			
			
			// XML writer with attributes and smart attribute quote escaping 
			var APOS = "'";
			var QUOTE = '"'
			var ESCAPED_QUOTE = {  }
			ESCAPED_QUOTE[QUOTE] = '&quot;'
			ESCAPED_QUOTE[APOS] = '&apos;'
			/*
			   Format a dictionary of attributes into a string suitable
			   for inserting into the start tag of an element.  Be smart
			   about escaping embedded quotes in the attribute values.
			*/
			function formatAttributes(attributes)
			{
				var att_value
				var apos_pos, quot_pos
				var use_quote, escape, quote_to_escape
				var att_str
				var re
				var result = ''
				for (var att in attributes) {
					att_value = attributes[att]
					// Find first quote marks if any
					apos_pos = att_value.indexOf(APOS)
					quot_pos = att_value.indexOf(QUOTE)
					// Determine which quote type to use around 
					// the attribute value
					if (apos_pos == -1 && quot_pos == -1) {
						att_str = ' ' + att + "='" + att_value +  "'"	//	use single quotes for attributes
						att_str = ' ' + att + '="' + att_value +  '"'	//	use double quotes for attributes
						result += att_str
						continue
					}
					// Prefer the single quote unless forced to use double
					if (quot_pos != -1 && quot_pos < apos_pos) {
						use_quote = APOS
					}
					else {
						use_quote = QUOTE
					}
					// Figure out which kind of quote to escape
					// Use nice dictionary instead of yucky if-else nests
					escape = ESCAPED_QUOTE[use_quote]
					// Escape only the right kind of quote
					re = new RegExp(use_quote,'g')
					att_str = ' ' + att + '=' + use_quote + 
						att_value.replace(re, escape) + use_quote
					result += att_str
				}
				return result
			}
			function element(name,content,attributes)
			{
				var att_str = ''
				if (attributes) { // tests false if this arg is missing!
					att_str = formatAttributes(attributes)
				}
				var xml
				if (!content){
					xml='<' + name + att_str + '/>'
				}
				else {
					xml='<' + name + att_str + '>' + content + '</'+name+'>'
				}
				return xml
			}
		},

		__clearDrawingCanvas : function()
		{
			this.__drawingCanvasParams.drawingContext.clearRect(-16, -16, this.__imgMap.width+32, this.__imgMap.height+32);
			this.__htmlContextLabels.clearRect(-16, -16, this.__imgMap.width+32, this.__imgMap.height+32);
			this.__htmlContextLabels.beginPath();
			this.__eraserCursor.exclude();
		},

		__updateAll : function()
		{
			var currentSlice=this.__drawingCanvasParams.sliceNumber;
			if(this.__seedsArray[currentSlice]!=0)
			{
				// the slice contains seeds
				this.__updateSeeds();
				this.__seedsList.setSelection([this.__seedsArray[currentSlice]]);
			}
			else
			{
				// current slice has no seeds
				this.__seedsList.resetSelection();
				this.__clearDrawingCanvas();
				this.__htmlContextLabels.clearRect(-16, -16, this.__imgMap.width+32, this.__imgMap.height+32);
			};
			////Update image canvas
			this.__updateImage();

			////Clear "undo" stack
			this.__ctrlZData = [];
			this.__currentSeedsModified=false;
		},

		__loadSession : function()
		{
			this.__resetSeedsList();
			console.log("loading slices:");
			var colorsParamRequest = new XMLHttpRequest();
			var volView=this;
			colorsParamRequest.onreadystatechange = function()
			{
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(this.responseXML!=null)
					{
						var response = this.responseXML;
						var seeds = response.getElementsByTagName("seed");
						for(var i=0; i<seeds.length; i++)
						{
							var sliceId=parseInt(seeds[i].getAttribute("slice"));
							console.log("adding slice :"+sliceId);
							volView.__addNewSeedItemToList(sliceId);
						};
						volView.__updateAll();
					}
					else
						alert("no seeds found");
				}
				else if (this.readyState == 4 && this.status != 200)
				{
						// fetched the wrong page or network error...
						alert("network error when loading seeds list");
				}
			};
			colorsParamRequest.open("GET", this.__fileBrowser.getFileURL(this.__sessionDirectory+"/seeds.xml"), true);
			colorsParamRequest.send(null);
		},

		__resetSeedsList : function()
		{
			this.__seedsList.removeAll();
			var numberOfSlices=this.__dimensions[2];
			this.__seedsArray=new Array(numberOfSlices);
			this.__seedsCacheTags=new Array (numberOfSlices);
			for (var i=0;i!=numberOfSlices;i++)
			{
				this.__seedsCacheTags[i]=Math.random();
				this.__seedsArray[i]=0;
			}
			this.__currentSeedsSlice=null;
		},

		__addNewSeedItemToList : function (sliceId)
		{
			var sliceItem = new qx.ui.form.ListItem(""+ sliceId);
			sliceItem.setUserData("slice",sliceId);
			var tempPos = 0;
			var seedsList=this.__seedsList.getChildren();
			for(var i=0; i<seedsList.length; i++)
			{
				if(seedsList[i].getUserData("slice")>sliceId)
					tempPos++;
			}
			this.__seedsList.addAt(sliceItem, tempPos);
			this.__seedsArray[sliceId] = sliceItem;
			sliceItem.addListener("click", function(event)
				{this.__spinner.setValue(event.getTarget().getUserData("slice"));}, this);
		},

		__getSessionsList : function()
		{
			var sessionType="gcSegmentation";
			var sessionsList = new qx.ui.form.SelectBox();
			var fileBrowser=this.__fileBrowser;
			var file=this.__file;
			var volView=this;

			var createNewSession = function()
			{
				var newSession=fileBrowser.createNewSession(volView.__file,sessionType, updateList);
				volView.__sessionDirectory=fileBrowser.getSessionDirectory(volView.__file,sessionType,newSession);
				volView.__resetSeedsList();
				volView.__updateAll();
			};

			var updateList = function(sessionIdToSelect) {
			
				function buildSessionsItems (sessions)
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
						sessionItem.addListener("click", function(e){
							volView.__colorsList.setVisibility("visible");
							volView.__sessionDirectory=fileBrowser.getSessionDirectory(
								volView.__file,sessionType,e.getTarget().getLabel());
							volView.__loadSession();
							});
					}
					// add "create new session" item
					var createNewSessionItem = new qx.ui.form.ListItem("create new session");
					createNewSessionItem.addListener("click", function(e){
						createNewSession();});
						sessionsList.add(createNewSessionItem);
					if (sessionItemToSelect!=null)
					{
						sessionsList.setSelection([sessionItemToSelect]);
						volView.__colorsList.setVisibility("visible");
						volView.__sessionDirectory=fileBrowser.getSessionDirectory(
							volView.__file,sessionType,sessionIdToSelect);
					}
					else
					{
						sessionsList.setSelection([createNewSessionItem]);
					}
				}

				fileBrowser.getFileSessions(file, sessionType, buildSessionsItems);
			};
			updateList();
			return sessionsList;
		},

		__getPaintPanelVisibilitySwitch : function () {
			var volView=this;
			var fileBrowser=this.__fileBrowser;
			var paintPaneVisibilitySwitch=new qx.ui.form.ToggleButton("Paint")
			paintPaneVisibilitySwitch.addListener("changeValue", function (e) {
				if (e.getData())
				{
					this.__mainRightContainer.setVisibility("visible");
					this.__seedsList.setVisibility("visible");
				}
				else
				{
					this.__mainRightContainer.setVisibility("excluded");
					this.__seedsList.setVisibility("excluded");
				}
				}, this);
			return paintPaneVisibilitySwitch;
		},

       ////Create and add the jpeg/png format select box
       __getFormatSelectBox : function()
		{
			var volView=this;
			var selectBox= new qx.ui.form.SelectBox();
			selectBox.set({width: 52});
			var JPGFormat = new qx.ui.form.ListItem("jpg");
			JPGFormat.setUserData("path",volView.__pathJPG);
			selectBox.add(JPGFormat);
			var PNGFormat = new qx.ui.form.ListItem("png");
			selectBox.add(PNGFormat);

			selectBox.addListener('changeSelection', function (e){
				var path=selectBox.getSelection()[0].getUserData("path");
				switch(path)
				{
				case null :
					//we need to compute png slices : launch action
					var parameterMap={
						"action" : "Slice_Volume",
						"input_file" : volView.__file,
						"output_directory" : "cache\/",
						"format" : "0"};
					var slicingLabel=new qx.ui.basic.Label("computing...");
					volView.__topRightContainer.addAfter(slicingLabel,selectBox);
					function getAnswer(e)
					{
						var req = e.getTarget();
						var slicesDirectory=req.getResponseText().split("\n")[0];
						PNGFormat.setUserData("path","\/visu\/desk\/php\/"+slicesDirectory+"\/");
						volView.__topLeftContainer.remove(slicingLabel);
						selectBox.setSelection([PNGFormat])
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
					this.__updateImage();
				}}, volView);
			return (selectBox);
		},

		__getDragAndDropLabel : function ()
		{
			var dragLabel=new qx.ui.basic.Label("Link").set({
        decorator: "main"});
			// drag and drop support
			dragLabel.setDraggable(true);
			dragLabel.addListener("dragstart", function(e) {
				e.addAction("copy");
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
			this.setDroppable(true);
			this.addListener("drop", function(e) {
				if (e.supportsType("volumeSlice"))
				{
					var volView2=e.getData("volumeSlice");
					if (volView2!=this)
					{
						volView2.__spinner.bind("value", this.__spinner, "value");
						this.__spinner.bind("value", volView2.__spinner, "value");
					}
				}
				else
				{
					alert("drop type not allowed for this widget!");
				}
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

		getSeedFileName : function(sliceId)
		{
			return 'seed', this.__slicesNamePrefix + (this.__slicesNameOffset + sliceId) +".png";
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

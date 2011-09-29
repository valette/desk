qx.Class.define("desk.gcSegmentation", 
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
		inProgData : [],
		sliceImages : [],
		sliceLabels : [],
		usedSliceSeeds : [],
		sliceResults : []
		};

		this.__ctrlZData=[];
		this.__labelColors=[];

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


		var spacing=5;
		this.__window=new qx.ui.window.Window();
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

		var tRCL=new qx.ui.layout.HBox();
		tRCL.setSpacing(spacing);
		this.__topRightContainer = new qx.ui.container.Composite(tRCL);
		this.__mainRightContainer.add(this.__topRightContainer);

		var bRCL=new qx.ui.layout.HBox();
		bRCL.setSpacing(spacing);
		this.__bottomRightContainer= new qx.ui.container.Composite(bRCL);



		var volView = this;
		
        volView.set({
                width: volView.__winMap.width,
                height: volView.__winMap.height,
                showMinimize: false,
                showMaximize: false,
                showClose: true,
                resizable: true,
                movable : true
        });

        volView.setLayout(new qx.ui.layout.Canvas());
		
		if (fileBrowser!=null)
		{
			//file is a tree node...
			var node=file;
			this.setCaption(node.label);
			var parameterMap={
				"action" : "Slice_Volume",
				"input_file" : fileBrowser.getNodePath(node),
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
			this.setCaption(file);
			this.openFile(file);
		}

		volView.open();
		
		return (volView);
	},

	statics :
	{
		// LINKEDWINDOW : null
	},

	members :
	{

		__window : null,
		__mainLeftContainer : null,
		__topLeftContainer : null,
		__imageContainer : null,
		__imageCanvas : null,

		__mainRightContainer : null,
		__topRightContainer : null,

		__currentSeedsModified : false,


		__mouseActionMode : 0,
		__mouseActionActive : false,

		__winXP : true,

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

// Tableaux de taille "nombre de slides" contenant pour chaque slide respectivement
// des données globales, l'image chargée, les seeds, les seeds utilisés pour la segmentation la plus récente
// et l'image segmentée chargée
/*         __horizSlices : {
             inProgData : [],
             sliceImages : [],
             sliceLabels : [],
             usedSliceSeeds : [],
             sliceResults : []
         },*/

         __horizSlices : null,

// Tableau contenant la pile de canvas permettant de faire "annuler" avec click droit
         __ctrlZData : null,

// Taille de la pile "annuler"
         __undoLimit : 10,

// Données globales associées à la souris (position et evenements)
         __mouseData : {
             xPos : 0,    //Position en x récupérée lors d'un évenement souris
             yPos : 0,    //Position en y récupérée lors d'un évenement souris
             recentX : 0,     //Position en x enregistrée à la fin d'un évenement souris
             recentY : 0,     //Position en y enregistrée à la fin d'un évenement souris
             decaleZoomX : 0,     //Décalage en x de la fenêtre zoomée par rapport à l'image taille x1
             decaleZoomY : 0,     //Décalage en y de la fenêtre zoomée par rapport à l'image taille x1
             mouseLeftDownFlag : 0,     //Indique si on appuyé sur le bouton gauche de la souris (dessin, gomme, luminosité/contraste)
             mouseMiddleDownFlag : 0,     //Indique si on appuyé sur le bouton du milieu de la souris (déplace dans l'image zoomée)
             mouseRightDownFlag : 0     //Indique si on appuyé sur le bouton droit de la souris (fonction "annuler")
         },

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
         __slicesNamePrefix : null,     //Contient la chaîne de charactéres du prefix récuperée à partir du fichier xml
         __segImgSKeyOpacity : 0.5,     //Opacité à appliquer au canvas d'affichage de la segmentation dans la zone image lors d'un appui sur la touche "s"
         __drawingSKeyOpacity : 0,     //Opacité à appliquer au canvas de dessin dans la zone image lors d'un appui sur la touche "s"

//Variable pour le canvas HTMLCanvasElement des seeds utilisés pour la segmentation la plus récente
         __htmlContextUsedSeeds : null,

//Variable pour le contexte du canvas précédent
         __htmlContextSegImg : null,

//Variable pour le canvas HTMLCanvasElement des image resultat de la segmentation
         __htmlCanvasUsedSeeds : null,

//Variable pour le contexte du canvas précédent
         __htmlCanvasSegImg : null,

		__path : null,

		__embedObjectImage : null,
		__embedObjectLabels : null,
		__embedObjectSegImg : null,
		__embedObjectUsedSeeds : null,


		__eraserCursor : null,
		__brghtnssCntrstButton : null,

		setMouseActionMode : function (mode) {
			if (mode!=1)
				this.__brghtnssCntrstButton.setValue(false);


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

		var volView=this;

//        volView.addListener("mouseout", function(event)
		
		
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
						volView.__imgMap.width = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("x"));
						volView.__imgMap.height = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("y"));
						volView.__numberOfSlices = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("z"));
						volView.__slicesNameOffset = parseInt(response.getElementsByTagName("slicesprefix")[0].getAttribute("offset"));
						volView.__slicesNamePrefix = response.getElementsByTagName("slicesprefix")[0].firstChild.nodeValue;
						volView.__timestamp = response.getElementsByTagName("slicesprefix")[0].getAttribute("volView.__timestamp");
						if (volView.__timestamp==null)
							volView.__timestamp = (new Date()).getTime();
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



			volView.__eraserCursor.addListener("keydown", function(event)
			{
				if(event.getKeyIdentifier()=="S")
				{
					////Load reults canvas
					drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
					////Change opacity of results canvas and drawing canvas
					drawingCanvas.set({opacity: volView.__drawingSKeyOpacity});
					segmentedImgCanvas.set({opacity: volView.__segImgSKeyOpacity, zIndex: volView.__drawingCanvasZ+1});
				}
			},this);
			
			volView.__eraserCursor.addListener("keyup", function(event)
			{
				if(event.getKeyIdentifier()=="S")
				{
					////Change opacity of results canvas and drawing canvas
					segmentedImgCanvas.set({opacity: 0, zIndex: volView.__drawingCanvasZ-1});
					drawingCanvas.set({opacity: whileDrawingDrwngOpacitySlider.getValue()});
				}
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
			
//            if(this.__winXP)
//               this.add(eraserButton, {left: volView.__imgMap.width + 56, top: 40});
//            else
//                this.add(eraserButton, {left: volView.__imgMap.width + 56, top: 36});
			this.__topRightContainer.add(eraserButton)
			
			
			
		////Create clear drawing zone button
			var clearButton = new qx.ui.form.Button("Clear drawing");

            clearButton.set({opacity: 0.5, enabled : false});
			
			clearButton.addListener("execute", function(event)
			{
                volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
                volView.__htmlContextLabels.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
				volView.__htmlContextLabels.beginPath();
                volView.__mouseData.mouseLeftDownFlag = false;
                clearButton.set({opacity: 0.5, enabled : false});
                eraserButton.set({opacity: 0.5, enabled : false});
                eraserButton.setValue(false);
                volView.__drawingCanvasParams.eraseFlag = false;
                volView.__eraserCursor.exclude();
            });

            clearButton.addListener("mouseup", function(event)
			{
                volView.__htmlContextLabels.beginPath();
                volView.__mouseData.mouseLeftDownFlag = false;
            },this);
			
			this.__topRightContainer.add(clearButton)
			
			
			
		////Create labels zone
			var colorsPage = new qx.ui.tabview.Page("REGIONS");
            colorsPage.setLayout(new qx.ui.layout.Grid(1,1));
			
			var colorsTabView = new qx.ui.tabview.TabView();
            colorsTabView.add(colorsPage);

            colorsTabView.addListener("mouseup", function(event)
			{
                volView.__htmlContextLabels.beginPath();
                volView.__mouseData.mouseLeftDownFlag = false;
            },this);

			this.__mainRightContainer.add(colorsTabView)

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
						for(var i=0; i<nbLabels; i++)
						{
							volView.__labelColors[i] = {
								red : response.getElementsByTagName("color")[i].getAttribute("red"),
								green : response.getElementsByTagName("color")[i].getAttribute("green"),
								blue : response.getElementsByTagName("color")[i].getAttribute("blue")
							};
							var newLabel = {
								id : parseInt(response.getElementsByTagName("color")[i].getAttribute("label")),
								name : response.getElementsByTagName("color")[i].getAttribute("name"),
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

            volView.__brghtnssCntrstButton.addListener("changeValue", function(event)
			{
				if (event.getData()==true)
					volView.setMouseActionMode(1);
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
            volView.__imageContainer.add(slider);
			
			
			
		////Create spinner and sync it with the slider
            var spinner = new qx.ui.form.Spinner();
            spinner.setMaximum(volView.__numberOfSlices-1);
            spinner.setMinimum(0);
            spinner.bind("value", slider, "value");
            slider.bind("value", spinner, "value");
            spinner.bind("maximum", slider, "maximum");
            slider.bind("maximum", spinner, "maximum");
            spinner.bind("minimum", slider, "minimum");
            slider.bind("minimum", spinner, "minimum");

			volView.__topLeftContainer.add(spinner);
			volView.__topLeftContainer.add(volView.__brghtnssCntrstButton);
			volView.__topLeftContainer.add(resetBrCrButton);
			
			
			
        ////Create and add the jpeg/png format select box
            var selectBox = new qx.ui.form.SelectBox();
			selectBox.set({width: 52});
            var SelectPNG = new qx.ui.form.ListItem("png");
            selectBox.add(SelectPNG);
            var SelectJPG = new qx.ui.form.ListItem("jpg");
            selectBox.add(SelectJPG);
			
			

			var modifSlicesList = new qx.ui.form.List(true);
			modifSlicesList.setHeight(64);
			modifSlicesList.addListener("keypress", function(event)
			{
				if(event.getKeyIdentifier()=="Delete")
				{
					var selectedChild = modifSlicesList.getSelection()[0];
					if (selectedChild!=null)
					{
						var sliceId = selectedChild.getUserData("slice");
					////Erase image on the server
						eraseFile(volView.__slicesNamePrefix + (volView.__slicesNameOffset + sliceId) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + volView.__timestamp);
					////Update members list
						clearButton.execute();
					////Erase from widget list
						modifSlicesList.remove(selectedChild);

						updateSeedsXML();
					}
				}
			}, this);

			this.__mainRightContainer.add(modifSlicesList, {flex : 1});
			this.__mainRightContainer.add(new qx.ui.core.Spacer(30, 40), {flex: 5});


			
		////Create start algorithm button
			var startButton = new qx.ui.form.ToggleButton("Start segmentation");

            startButton.set({opacity: 0.5, enabled : false});
			
			var segSemahpore = true;
			startButton.addListener("changeValue", function(event)
			{
				if(event.getData())
				{
					segmentationDone = false;
                    var children = colorsPage.getChildren();
                    for(var i=0; i<nbLabels; i++)
                    {
                        children[i].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
                    }
                    volView.__drawingCanvasParams.paintFlag = false;
                    eraserButton.setValue(false);
                    volView.__drawingCanvasParams.eraseFlag = false;
					volView.__drawingCanvasParams.brCrFixingFlag = false;
					this.set({opacity: 0.5, enabled : false});
					var tempMax = volView.__horizSlices.usedSliceSeeds[0].length;
					
					var seedsList=modifSlicesList.getChildren();
					for(var i=0; i<seedsList.length; i++)
					{
						var sliceId=seedsList[i].getuserData("slice");
						volView.__horizSlices.usedSliceSeeds[sliceId][tempMax] = volView.__horizSlices.sliceLabels[sliceId];
					}
					volView.__htmlContextUsedSeeds.putImageData(volView.__horizSlices.usedSliceSeeds[volView.__drawingCanvasParams.sliceNumber][tempMax], 0, 0);
					segSemahpore = true;
					while(this.getEnabled())
							segSemahpore = true;
					segSemahpore = false;
				}
			},this);
			
			var segmentationDone = false;
			this.addListener("changeEnabled", function(event)
			{
				if(!segSemahpore)
				{
					var startRequest = new XMLHttpRequest();
					startRequest.onreadystatechange = function()
					{
						if(this.readyState == 4 && this.status == 200)
						{
							var response = startRequest.responseText;
							volView.debug("\n" + response);
							// if(response=="success")
									// volView.debug("Success!");
							// else
									// volView.debug("...got error...");
						////Add image into current results array
							var base = "/visu/data/results/png/slice";
							var tempMax = volView.__horizSlices.sliceResults[0].length;
							for(var i=0; i<volView.__numberOfSlices; i++)
							{
								volView.__horizSlices.sliceResults[i][tempMax] = new Image();
								volView.__horizSlices.sliceResults[i][tempMax].src = base + (volView.__slicesNameOffset + i) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + (new Date()).getTime();
							};
							var tempSrc = base + (volView.__slicesNameOffset + volView.__drawingCanvasParams.sliceNumber) + "." + selectBox.getSelection()[0].getLabel();
							volView.__horizSlices.sliceResults[volView.__drawingCanvasParams.sliceNumber][tempMax].src = tempSrc + "?nocache=" + (new Date()).getTime();
							volView.__horizSlices.sliceResults[volView.__drawingCanvasParams.sliceNumber][tempMax].onload = function()
							{
								volView.__htmlContextSegImg.drawImage(this, 0, 0, this.width, this.height);
							};
	//seb						whileShowingDrwngOpacityLabel.set({opacity: 1, enabled : true});
	//seb						whileShowingDrwngOpacitySlider.set({opacity: 1, enabled : true});
	//seb						segImgOpacityLabel.set({opacity: 1, enabled : true});
	//seb						whileDrawingSegImgOpacityLabel.set({opacity: 1, enabled : true});
	//seb						whileDrawingSegImgOpacitySlider.set({opacity: 1, enabled : true});
	//seb						whileShowingSegImgOpacityLabel.set({opacity: 1, enabled : true});
	//seb						whileShowingSegImgOpacitySlider.set({opacity: 1, enabled : true});
	//seb						extWinCheckBox.set({opacity: 1, enabled : true});
							segmentationDone = true;
						}
						else if (this.readyState == 4 && this.status != 200)
						{
								// fetched the wrong page or network error...
								volView.debug('"Fetched the wrong page" OR "Network error"');
						}
					};
					startRequest.open("POST", "/visu/cvtGcMultiseg.php", false);
					startRequest.send("/home/visu/data/gc/image/" + "slice" + (volView.__slicesNameOffset + volView.__drawingCanvasParams.sliceNumber) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + volView.__timestamp);
					startButton.setValue(false);
					segSemahpore = true;
				}
			},this);

            startButton.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    volView.__mouseData.mouseLeftDownFlag = false;
            },this);
			
    //        this.__.add(startButton, {left: volView.__imgMap.width - 4, top: volView.__imgMap.height + 7});
			this.__mainRightContainer.add(this.__bottomRightContainer);
			this.__bottomRightContainer.add(startButton);
			// this.add(selectBox, {left: volView.__imgMap.width - selectBox.getSizeHint().width+8 - startButton.getSizeHint().width+8 + 26, top: volView.__imgMap.height + 7});
			
			
			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("Opacity :");
			this.__topRightContainer.add(whileDrawingDrwngOpacityLabel);
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
			whileDrawingDrwngOpacitySlider.setValue(100);
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
					drawingCanvas.set({opacity: event.getData()/100});
			},this);
            this.__topRightContainer.add(whileDrawingDrwngOpacitySlider, {flex : 1});
			
	/*		
	
			/// Seb : deleted widgets... to put back again...
			var whileShowingDrwngOpacityLabel = new qx.ui.basic.Label('While pressing "s" key');
			whileShowingDrwngOpacityLabel.set({opacity: 0.5, enabled : false});
			this.add(whileShowingDrwngOpacityLabel, {left: 0, top: whileDrawingDrwngOpacityLabel.getLayoutProperties().top + whileDrawingDrwngOpacityLabel.getSizeHint().height+4 + 2});
			
            var whileShowingDrwngOpacitySlider = new qx.ui.form.Slider();
            whileShowingDrwngOpacitySlider.setHeight(whileShowingDrwngOpacityLabel.getSizeHint().height+4 - 4);
			whileShowingDrwngOpacitySlider.set({width:128, maximum:100, minimum:0, value:0});
			whileShowingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
					volView.__drawingSKeyOpacity = event.getData()/100;
			},this);


			whileShowingDrwngOpacitySlider.set({opacity: 0.5, enabled : false});
            this.add(whileShowingDrwngOpacitySlider, {left: 137, top: whileShowingDrwngOpacityLabel.getLayoutProperties().top});
			
			var segImgOpacityLabel = new qx.ui.basic.Label("Segmented image opacity : ");
			segImgOpacityLabel.set({opacity: 0.5, enabled : false});
			this.add(segImgOpacityLabel, {left: 0, top: whileShowingDrwngOpacityLabel.getLayoutProperties().top + whileShowingDrwngOpacityLabel.getSizeHint().height+4 + 10});
			
			
			var whileDrawingSegImgOpacityLabel = new qx.ui.basic.Label("While drawing");
			whileDrawingSegImgOpacityLabel.set({opacity: 0.5, enabled : false});
			this.add(whileDrawingSegImgOpacityLabel, {left: 0, top: segImgOpacityLabel.getLayoutProperties().top + segImgOpacityLabel.getSizeHint().height+4 + 2});
			
            var whileDrawingSegImgOpacitySlider = new qx.ui.form.Slider();
            whileDrawingSegImgOpacitySlider.setHeight(whileDrawingSegImgOpacityLabel.getSizeHint().height+4 - 4);
			whileDrawingSegImgOpacitySlider.set({width:128, maximum:50, minimum:0, value:0});
			whileDrawingSegImgOpacitySlider.addListener("changeValue", function(event)
			{
					segmentedImgCanvas.set({opacity: event.getData()/100});
			},this);
			whileDrawingSegImgOpacitySlider.set({opacity: 0.5, enabled : false});
            this.add(whileDrawingSegImgOpacitySlider, {left: 137, top: whileDrawingSegImgOpacityLabel.getLayoutProperties().top});
			
			
			var whileShowingSegImgOpacityLabel = new qx.ui.basic.Label('While pressing "s" key');
			whileShowingSegImgOpacityLabel.set({opacity: 0.5, enabled : false});
			this.add(whileShowingSegImgOpacityLabel, {left: 0, top: whileDrawingSegImgOpacityLabel.getLayoutProperties().top + whileDrawingSegImgOpacityLabel.getSizeHint().height+4 + 2});
			
			
            var whileShowingSegImgOpacitySlider = new qx.ui.form.Slider();
            whileShowingSegImgOpacitySlider.setHeight(whileShowingSegImgOpacityLabel.getSizeHint().height+4 - 4);
			whileShowingSegImgOpacitySlider.set({width:128, maximum:100, minimum:0, value:50});
			whileShowingSegImgOpacitySlider.addListener("changeValue", function(event)
			{
					segmentedImgCanvas.set({opacity: event.getData()/100});
					volView.__segImgSKeyOpacity = event.getData()/100;
					segmentedImgCanvas.set({opacity: 0});
			},this);
			whileShowingSegImgOpacitySlider.set({opacity: 0.5, enabled : false});
            this.add(whileShowingSegImgOpacitySlider, {left: 137, top: whileShowingSegImgOpacityLabel.getLayoutProperties().top});
			
			
			
			
			
			var externalWindow = new qx.ui.window.Window("Segmented image").set({
                    width: volView.__imgMap.width + 10 + 10,
                    height: volView.__imgMap.height + 35 + 10,
                    showMinimize: false,
                    showMaximize: false,
                    showClose: true,
					alwaysOnTop : true,
                    resizable: false,
                    movable : true
            });
			
			
			
			var extWinCheckBox = new qx.ui.form.CheckBox("Show segmented image in external window");
			extWinCheckBox.addListener("changeValue", function(event)
			{
				////Open/close external window
					if(event.getData())
					{
							externalWindow.open();
							extWinSettingsLabel.show();
							usedSeedsOpacityLabel.show();
							usedSeedsOpacitySlider.show();
					}
					else
					{
							externalWindow.close();
							extWinSettingsLabel.exclude();
							usedSeedsOpacityLabel.exclude();
							usedSeedsOpacitySlider.exclude();
					}
			},this);
			extWinCheckBox.set({opacity: 0.5, enabled : false});
			this.add(extWinCheckBox);
			externalWindow.addListener("close", function(event)
			{
					extWinCheckBox.setValue(false);
			},this);
			
			
			
			var extWinSettingsLabel = new qx.ui.basic.Label("External window settings : ");
			this.add(extWinSettingsLabel, {left: extWinCheckBox.getLayoutProperties().left, top: extWinCheckBox.getLayoutProperties().top + extWinCheckBox.getSizeHint().height+4 + 10});
			extWinSettingsLabel.exclude();
			
			var usedSeedsOpacityLabel = new qx.ui.basic.Label("Used seeds visibility");
			this.add(usedSeedsOpacityLabel, {left: extWinCheckBox.getLayoutProperties().left, top: extWinSettingsLabel.getLayoutProperties().top + extWinSettingsLabel.getSizeHint().height+4 + 2});
			usedSeedsOpacityLabel.exclude();
            var usedSeedsOpacitySlider = new qx.ui.form.Slider();
            usedSeedsOpacitySlider.setHeight(usedSeedsOpacityLabel.getSizeHint().height+4 - 4);
			usedSeedsOpacitySlider.set({width:128, maximum:100, minimum:0, value:100});
			usedSeedsOpacitySlider.addListener("changeValue", function(event)
			{
					extWinSeedsCanvas.set({opacity: (100-event.getData())/100});
					extWinSegImgCanvas.set({opacity: 0.5 + event.getData()/200});
			},this);
            this.add(usedSeedsOpacitySlider, {left: extWinCheckBox.getLayoutProperties().left + 137, top: usedSeedsOpacityLabel.getLayoutProperties().top});
            usedSeedsOpacitySlider.exclude();
			
			
			
			var extWinSegImgCanvas = new qx.ui.embed.Canvas().set({syncDimension: true, zIndex: 7});
            extWinSegImgCanvas.setUserBounds(0, 0, volView.__imgMap.width, volView.__imgMap.height);
			extWinSegImgCanvas.addListener("redraw", function(event)
			{
                    var data = event.getData();
                    extWinSegImgCanvas.extWinSegImgContext = data.context;
					extWinSegImgCanvas.extWinSegImgContext.strokeStyle = "white";
                    extWinSegImgCanvas.extWinSegImgContext.fillStyle = "black";
                    extWinSegImgCanvas.extWinSegImgContext.lineWidth = 5;
                    extWinSegImgCanvas.extWinSegImgContext.lineCap = "square";
                    extWinSegImgCanvas.extWinSegImgContext.lineJoin = "miter";
                    extWinSegImgCanvas.extWinSegImgContext.miterLimit = 1;
            }, this);
            externalWindow.add(extWinSegImgCanvas, {left: 0, top: 0});

			var extWinSeedsCanvas = new qx.ui.embed.Canvas().set({syncDimension: true, zIndex: 3, opacity: 0});
            extWinSeedsCanvas.setUserBounds(0, 0, volView.__imgMap.width, volView.__imgMap.height);
			extWinSeedsCanvas.addListener("redraw", function(event)
			{
                    var data = event.getData();
                    extWinSeedsCanvas.extWinSeedsContext = data.context;
					volView.__htmlCanvasUsedSeeds = volView.__embedObjectUsedSeeds.getContentElement().getDomElement().firstChild;
//					volView.__htmlCanvasUsedSeeds = document.getElementById("htmlTagCanvasUsedSeeds");
                    volView.__htmlContextUsedSeeds = volView.__htmlCanvasUsedSeeds.getContext("2d");
            }, this);
            externalWindow.add(extWinSeedsCanvas, {left: 0, top: 0});
			
		////Open window so canvas are redrawn then close it to call redraw events
			externalWindow.open();
			externalWindow.close();
			
			
			
			*/
			
			
			
			
			
			var updateContext = function(event)
			{
				var data = event.getData();
				// volView.debug("data : " + event.getData());
				volView.__drawingCanvasParams.drawingContext = data.context;
				// volView.debug("volView.__drawingCanvasParams.drawingContext : " + volView.__drawingCanvasParams.drawingContext);
				volView.__drawingCanvasParams.drawingContext.setTransform(volView.__drawingCanvasParams.curCtxtZoom,0,0,volView.__drawingCanvasParams.curCtxtZoom,0,0);
				volView.__drawingCanvasParams.drawingContext.mozImageSmoothingEnabled = false;
				//					volView.__htmlCanvasLabels = document.getElementById("htmlTagCanvasLabels");
				volView.__htmlCanvasLabels = volView.__embedObjectLabels.getContentElement().getDomElement().firstChild;
				volView.__htmlContextLabels = volView.__htmlCanvasLabels.getContext("2d");
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
                    	console.log("draw...");
                        volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
                        volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
                        volView.__htmlContextLabels.beginPath();
                        volView.__htmlContextLabels.arc(volView.__mouseData.xPos,
												volView.__mouseData.yPos,
														volView.__htmlContextLabels.lineWidth/2,
                                                        0, Math.PI*2, false);
                        volView.__htmlContextLabels.closePath();
                        volView.__htmlContextLabels.fill();
                        clearButton.set({opacity: 1, enabled : true});
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
			////Draw cursor
				drawPointer(event,volView.__drawingCanvasParams.curCtxtZoom);
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
						////volView.debug(event.getType() + "(" + volView.__mouseData.xPos + "," + volView.__mouseData.yPos + ")");
						var onImageX = volView.__mouseData.decaleZoomX + volView.__mouseData.xPos;
						var onImageY = volView.__mouseData.decaleZoomY + volView.__mouseData.yPos;
						////volView.debug("on image : (" + onImageX + "," + onImageY + ")");
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
						if((volView.__drawingCanvasParams.paintFlag)&&(!volView.__drawingCanvasParams.eraseFlag)&&(!volView.__drawingCanvasParams.brCrFixingFlag))
						{
							drawBrush(event,zoomFactor);
						}
						drawPointer(event,zoomFactor);
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
					////Draw cursor
					drawPointer(event,volView.__drawingCanvasParams.curCtxtZoom);
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
						if((0<tempContrast+1)&&(tempContrast<5))
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
						clearButton.set({opacity: 1, enabled : true});
						break;
					case 4 :
						////Erase at mouse position
						eraseFnct(true);
						break;
						default:
							//do nothing
					}
/*					if((volView.__drawingCanvasParams.brCrFixingFlag)&&(volView.__mouseData.mouseLeftDownFlag))
					{
						drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
                    }*/
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
			
			var segmentedImgCanvas = new qx.ui.embed.Canvas().set({syncDimension: true, zIndex: volView.__drawingCanvasZ-1});
			segmentedImgCanvas.set({opacity: 0});
            this.add(segmentedImgCanvas, {left: volView.__imgMap.left, top: volView.__imgMap.top});
            segmentedImgCanvas.setUserBounds(volView.__imgMap.left, volView.__imgMap.top, volView.__imgMap.width, volView.__imgMap.height);
			segmentedImgCanvas.addListener("redraw", function(event)
			{
                var data = event.getData();
                segmentedImgCanvas.segImgContext = data.context;
				volView.__htmlCanvasSegImg = volView.__embedObjectSegImg.getContentElement().getDomElement().firstChild;
                volView.__htmlContextSegImg = volView.__htmlCanvasSegImg.getContext("2d");
            }, this);
			segmentedImgCanvas.addListener("mousemove", function(event)
			{
				////Change opacity of results canvas and drawing canvas
	//seb				segmentedImgCanvas.set({opacity: whileDrawingSegImgOpacitySlider.getValue(), zIndex: volView.__drawingCanvasZ-1});
					drawingCanvas.set({opacity: whileDrawingDrwngOpacitySlider.getValue()});
			}, this);
			
			var keyDownHandler = function(event)
			{
					if(event.getKeyIdentifier()=="S")
					{
						////Load reults canvas
							drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
						////Change opacity of results canvas and drawing canvas
							drawingCanvas.set({opacity: volView.__drawingSKeyOpacity});
							segmentedImgCanvas.set({opacity: volView.__segImgSKeyOpacity, zIndex: volView.__drawingCanvasZ+1});
					}
			};
			
			var keyUpHandler = function(event)
			{
				if(event.getKeyIdentifier()=="S")
				{
					////Change opacity of results canvas and drawing canvas
//seb					segmentedImgCanvas.set({opacity: whileDrawingSegImgOpacitySlider.getValue(), zIndex: volView.__drawingCanvasZ-1});
					drawingCanvas.set({opacity: whileDrawingDrwngOpacitySlider.getValue()});
				}
			};
			
			
			
			
			this.__imageCanvas = new qx.ui.container.Composite(new qx.ui.layout.Canvas);
			var imgCanvas = new qx.ui.embed.Canvas().set({syncDimension: true,
														zIndex: volView.__imageZ,
														width : volView.__imgMap.width,
														height : volView.__imgMap.height });

			this.__imageCanvas.add(imgCanvas);
            volView.__imageContainer.add(this.__imageCanvas);

			
      //      imgCanvas.setUserBounds(volView.__imgMap.left, volView.__imgMap.top, volView.__imgMap.width, volView.__imgMap.height);
			
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
				if(((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.brCrFixingFlag))&&(!volView.__drawingCanvasParams.eraseFlag))
				{
					volView.__htmlContextLabels.beginPath();
					volView.__mouseData.mouseLeftDownFlag = false;
					volView.__mouseData.mouseMiddleDownFlag = false;
					volView.__eraserCursor.set({cursor: "default"});
					drawingCanvas.set({cursor: "default"});
				}
			},this);

  /*      this.__imageCanvas.addListener("mouseover", function(event)
		{
            if(((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.brCrFixingFlag))||(volView.__drawingCanvasParams.eraseFlag))
            {
				getPosition(event,false);
				var tempMargin = 4;
				if(!((tempMargin<=volView.__mouseData.xPos)&&(volView.__mouseData.xPos<=volView.__imgMap.width-tempMargin)&&(tempMargin<=volView.__mouseData.yPos)&&(volView.__mouseData.yPos<=volView.__imgMap.height-tempMargin)))
				{
					volView.__htmlContextLabels.beginPath();
					volView.__mouseData.mouseLeftDownFlag = false;
					volView.__mouseData.mouseMiddleDownFlag = false;
					eraserCursor.set({cursor: "default"});
					drawingCanvas.set({cursor: "default"});
				}
            }
        },this);*/
			this.__imageCanvas.addListener("click", function(event)
			{
				volView.__winMap.left = volView.getBounds().left;
				volView.__winMap.top = volView.getBounds().top;
			},this);			
			
			var canvasImage = new Image();
			
			var slashIndex = file.lastIndexOf("/");
			this.__path = "";
			if (slashIndex>0)
				this.__path = file.substring(0,slashIndex)+"\/";
			volView.debug("this.__path : " + this.__path);
            var sliceImg = function()
			{
                var imgObj = {
                        url : null,
                        srcImage : new Image()
                };
                return imgObj;
            };
		////Set url for each source image
            for(var i=0; i<volView.__numberOfSlices; i++)
            {
                volView.__horizSlices.sliceImages[i] = new sliceImg();
                volView.__horizSlices.sliceImages[i].url = this.__path + "slice" + (volView.__slicesNameOffset+i) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + volView.__timestamp;
				volView.__horizSlices.sliceImages[i].srcImage.onload = function()
				{
					//volView.debug(" <!>   Image  No." + volView.__drawingCanvasParams.sliceNumber + "  loaded");
					if(volView.__drawingCanvasParams.drawingContext!=null)
					{
						canvasImage = volView.__horizSlices.sliceImages[volView.__drawingCanvasParams.sliceNumber].srcImage;
						volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
						drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
					}
				};
            };
			
			canvasImage.src = volView.__horizSlices.sliceImages[0].url;
			volView.__horizSlices.sliceImages[0].srcImage = canvasImage;
			
			canvasImage.onload = function()	// here for build version
			{
				if((volView.__drawingCanvasParams.sliceNumber==0)&&(typeof volView.__htmlContextImage!="undefined")&&(typeof volView.__imgCanvasParams.imgContext!="undefined"))
				{
					volView.__htmlContextImage.drawImage(canvasImage, 0, 0, canvasImage.width, canvasImage.height);
					volView.__imgCanvasParams.imgContext.drawImage(volView.__htmlCanvasImage, 0, 0, canvasImage.width, canvasImage.height);
				}
			};
			
			
			
			
			
            var drawingCanvas = new qx.ui.embed.Canvas().set({syncDimension: true,
            											 zIndex: volView.__drawingCanvasZ,
            											 width : volView.__imgMap.width,
														height : volView.__imgMap.height });

			
            drawingCanvas.addListener("redraw", updateContext, this);
            drawingCanvas.addListener("mousedown", mouseDownHandler, this);
            drawingCanvas.addListener("mousewheel", mouseWheelHandler, this);
            volView.__eraserCursor.addListener("mousewheel", mouseWheelHandler, this);
			drawingCanvas.addListener("mousemove", mouseMoveHandler, this);
            drawingCanvas.addListener("mouseup", mouseUpHandler, this);
			drawingCanvas.addListener("keydown", keyDownHandler, this);
			drawingCanvas.addListener("keyup", keyUpHandler, this);

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
			this.__imageCanvas.add(containerHtmlImage);		/// seb why 2 images?	
			
			
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

			for(var i=0; i<volView.__numberOfSlices; i++)
			{
				volView.__horizSlices.inProgData[i] = {
						curTagged : false,
						segmented : false
				};
			};
	
			slider.addListener("changeValue", function(event)
			{
				volView.__htmlContextLabels.beginPath(); // seb : why???
				volView.__mouseData.mouseLeftDownFlag = false;
			////Save current image
				var oldSliceIndex= volView.__drawingCanvasParams.sliceNumber;
				volView.__horizSlices.sliceLabels[oldSliceIndex] = volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);

				volView.__horizSlices.inProgData[oldSliceIndex].curTagged = 
					!pngCanvasFctn(volView.__horizSlices.inProgData[oldSliceIndex].curTagged);	//  pngCanvasFctn() returns true if image is all black
				var newSliceIndex=event.getData();
				volView.__drawingCanvasParams.sliceNumber = newSliceIndex;
				if(segmentationDone)
				{
					var index = 0;
					var segmentationResult=volView.__horizSlices.sliceResults[newSliceIndex][index];
					volView.__htmlContextSegImg.drawImage(segmentationResult,
												0,0,segmentationResult.width,
												segmentationResult.height);
					if(typeof volView.__horizSlices.usedSliceSeeds[newSliceIndex][index] != "undefined")
						volView.__htmlContextUsedSeeds.putImageData(volView.__horizSlices.usedSliceSeeds[newSliceIndex][index], 0, 0);
					else
						volView.__htmlContextUsedSeeds.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
				}
			////Update lists
				if(volView.__horizSlices.inProgData[oldSliceIndex].curTagged)	////CURRENT slice has seeds
				{
					if(!volView.__horizSlices.inProgData[oldSliceIndex].inList)
					{
					// Add slice to list
						var sliceItem = new qx.ui.form.ListItem("Slice No." + oldSliceIndex);
						sliceItem.setUserData("slice",oldSliceIndex);
						var tempPos = 0;
						var seedsList=modifSlicesList.getChildren();
						for(var i=0; i<seedsList.length; i++)
						{
								if(seedsList[i].getUserData("slice")<oldSliceIndex)
										tempPos++;
						}
						modifSlicesList.addAt(sliceItem, tempPos);
						volView.__horizSlices.inProgData[oldSliceIndex].inList = true;
						sliceItem.addListener("click", function(event)
						{
								slider.setValue(this.getUserData("slice"));
						}, sliceItem);
					////Update XML file
						updateSeedsXML();
					}
				////Since there is at least one saved seeds image, activate start button
                    if(!startButton.isEnabled())
                            startButton.set({opacity: 1, enabled : true});
				}

			////Set canvas, buttons, list
				if(volView.__horizSlices.inProgData[newSliceIndex].curTagged)	////NEXT slice HAS seeds
				{
						volView.__htmlContextLabels.putImageData(volView.__horizSlices.sliceLabels[newSliceIndex], 0, 0);
						clearButton.set({opacity: 1, enabled : true});
						eraserButton.set({opacity: 1, enabled : true});
                        startButton.set({opacity: 1, enabled : true});
					////Update XML file
		// commented by seb				updateSeedsXML();

				}
				else	////NEXT slice has NO seeds
				{
						modifSlicesList.resetSelection();
						clearButton.execute();
						volView.__htmlContextLabels.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
						startButton.set({opacity: 0.5, enabled : false});
				};	////End if(typeof volView.__horizSlices.sliceLabels[newSliceIndex] != "undefined")
			////Update image canvas
				if(volView.__horizSlices.sliceImages[newSliceIndex].srcImage.src=="")
				{
					////First access to slice. Load image by passing source url
						volView.__horizSlices.sliceImages[newSliceIndex].srcImage.src = volView.__horizSlices.sliceImages[newSliceIndex].url;
				}
				else
				{
					////Slice has previously been accessed. Load image by copying image into "canvasImage" global variable
						canvasImage = volView.__horizSlices.sliceImages[newSliceIndex].srcImage;
						volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
						drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
				};
			////Clear "undo" stack
				volView.__ctrlZData = [];
            	volView.__currentSeedsModified=false;

			}, this);

            slider.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    volView.__mouseData.mouseLeftDownFlag = false;
            },this);
			
            slider.setHeight(volView.__imgMap.height);    //	set to match image height
			slider.setValue(0);//Math.round(0.5*volView.__numberOfSlices));
			
            spinner.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    volView.__mouseData.mouseLeftDownFlag = false;
            },this);

            volView.__imageCanvas.add(volView.__eraserCursor);
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
//					volView.__mouseData.xPos = volView.__mouseData.decaleZoomX/volView.__drawingCanvasParams.curCtxtZoom + volView.__mouseData.xPos;
//					volView.__mouseData.yPos = volView.__mouseData.decaleZoomY/volView.__drawingCanvasParams.curCtxtZoom + volView.__mouseData.yPos;
					////volView.debug(mouseEvent.getType() + "(" + volView.__mouseData.xPos + "," + volView.__mouseData.yPos + ")");
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
				segmentedImgCanvas.segImgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
//seb				extWinSeedsCanvas.extWinSeedsContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
//seb				extWinSegImgCanvas.extWinSegImgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
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
			////Refresh drawing canevas while only moving cursor
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
						segmentedImgCanvas.segImgContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
						segmentedImgCanvas.segImgContext.drawImage(volView.__htmlCanvasSegImg,
                                                                    sx,
                                                                    sy,
                                                                    sdw,
                                                                    sdh,
                                                                    0,
                                                                    0,
                                                                    sdw,
                                                                    sdh);
	/*seb					extWinSeedsCanvas.extWinSeedsContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
						extWinSeedsCanvas.extWinSeedsContext.drawImage(volView.__htmlCanvasUsedSeeds,
                                                                    sx,
                                                                    sy,
                                                                    sdw,
                                                                    sdh,
                                                                    0,
                                                                    0,
                                                                    sdw,
                                                                    sdh);
						extWinSegImgCanvas.extWinSegImgContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
						extWinSegImgCanvas.extWinSegImgContext.drawImage(volView.__htmlCanvasSegImg,
                                                                    sx,
                                                                    sy,
                                                                    sdw,
                                                                    sdh,
                                                                    0,
                                                                    0,
                                                                    sdw,
                                                                    sdh);*/
				}
			};
			
			
			
			
			
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
			
			
			
			
			
		////Draw cross in the results window at copied mouse position
			var drawPointer = function(mouseEvent,scale)
            {
                var tempX = (mouseEvent.getViewportLeft()-volView.__winMap.left-10-volView.__imgMap.left)/scale;
                var tempY = (mouseEvent.getViewportTop()-volView.__winMap.top-35-volView.__imgMap.top)/scale;
                var tempMargin = 4/scale;
                if((tempMargin<tempX)&&(tempX<volView.__imgMap.width/scale-tempMargin)&&(tempMargin<tempY)&&(tempY<volView.__imgMap.height/scale-tempMargin))
                {
				////Set line width
	/*	seb			extWinSegImgCanvas.extWinSegImgContext.lineWidth = 5/scale;
				////Draw up cursor line
					extWinSegImgCanvas.extWinSegImgContext.fillRect(tempX - 4/scale, tempY - 20/scale, 8/scale, 16/scale);
                    extWinSegImgCanvas.extWinSegImgContext.beginPath();
					extWinSegImgCanvas.extWinSegImgContext.moveTo(tempX, tempY - 16/scale);
					extWinSegImgCanvas.extWinSegImgContext.lineTo(tempX, tempY - 8/scale);
					extWinSegImgCanvas.extWinSegImgContext.stroke();
					extWinSegImgCanvas.extWinSegImgContext.closePath();
				////Draw left cursor line
					extWinSegImgCanvas.extWinSegImgContext.fillRect(tempX - 20/scale, tempY - 4/scale, 16/scale, 8/scale);
                    extWinSegImgCanvas.extWinSegImgContext.beginPath();
					extWinSegImgCanvas.extWinSegImgContext.moveTo(tempX - 16/scale, tempY);
					extWinSegImgCanvas.extWinSegImgContext.lineTo(tempX - 8/scale, tempY);
					extWinSegImgCanvas.extWinSegImgContext.stroke();
					extWinSegImgCanvas.extWinSegImgContext.closePath();
				////Draw down cursor line
					extWinSegImgCanvas.extWinSegImgContext.fillRect(tempX - 4/scale, tempY + 4/scale, 8/scale, 16/scale);
                    extWinSegImgCanvas.extWinSegImgContext.beginPath();
					extWinSegImgCanvas.extWinSegImgContext.moveTo(tempX, tempY + 8/scale);
					extWinSegImgCanvas.extWinSegImgContext.lineTo(tempX, tempY + 16/scale);
					extWinSegImgCanvas.extWinSegImgContext.stroke();
					extWinSegImgCanvas.extWinSegImgContext.closePath();
				////Draw right cursor line
					extWinSegImgCanvas.extWinSegImgContext.fillRect(tempX + 4/scale, tempY - 4/scale, 16/scale, 8/scale);
                    extWinSegImgCanvas.extWinSegImgContext.beginPath();
					extWinSegImgCanvas.extWinSegImgContext.moveTo(tempX + 8/scale, tempY);
					extWinSegImgCanvas.extWinSegImgContext.lineTo(tempX + 16/scale, tempY);
					extWinSegImgCanvas.extWinSegImgContext.stroke();
					extWinSegImgCanvas.extWinSegImgContext.closePath();*/
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
//				extWinSegImgCanvas.extWinSegImgContext.clearRect(-16,-16,volView.__imgMap.width+32, volView.__imgMap.height+32);
				volView.__drawingCanvasParams.drawingContext.drawImage(volView.__htmlCanvasLabels,0,0);
/*	seb			extWinSegImgCanvas.extWinSegImgContext.setTransform(1,0,0,1,0,0);
				extWinSegImgCanvas.extWinSegImgContext.drawImage(volView.__htmlCanvasSegImg,0,0);
				extWinSeedsCanvas.extWinSeedsContext.clearRect(-16,-16,volView.__imgMap.width+32, volView.__imgMap.height+32);
				extWinSeedsCanvas.extWinSeedsContext.setTransform(1,0,0,1,0,0);
				extWinSeedsCanvas.extWinSeedsContext.drawImage(volView.__htmlCanvasUsedSeeds,0,0);*/
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
                var seeds = volView.__horizSlices.sliceLabels[volView.__drawingCanvasParams.sliceNumber].data;
                var isAllBlack = true;
                for(var i=0; i<seeds.length; i+=4)
                {
					if(128<=seeds[i+3])  //  if( color is solid not totally transparent, ie. alpha=0) <-> if( not background )
                    {
						var red = 0;
						var green = 0;
						var blue = 0;
						var distance = 500;
						var rightColorIndex = 0;
						for(var j=0; j<volView.__labelColors.length; j++)
						{
							red = volView.__labelColors[j].red;
							green = volView.__labelColors[j].green;
							blue = volView.__labelColors[j].blue;
							var testD = Math.sqrt(Math.pow(red-seeds[i],2)+Math.pow(green-seeds[i+1],2)+Math.pow(blue-seeds[i+2],2));
							if(testD<distance)
							{
								distance = testD;
								rightColorIndex = j;
							}
						}
						pixels[i] = volView.__labelColors[rightColorIndex].red;
						pixels[i+1] = volView.__labelColors[rightColorIndex].green;
						pixels[i+2] = volView.__labelColors[rightColorIndex].blue;
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
					sliceData.data = pixels;
					volView.__htmlContextLabels.putImageData(sliceData, 0, 0);
					if(selectBox.getSelection()[0].getLabel()=="png")
							var pngImg = volView.__htmlCanvasLabels.toDataURL("image/png");
					if(selectBox.getSelection()[0].getLabel()=="jpg")
							var pngImg = volView.__htmlCanvasLabels.toDataURL("image/jpeg",1);
                    //volView.debug("pngImg : " + pngImg);
				////Send png image to server
					var pngRequest = new XMLHttpRequest();
					pngRequest.open("POST",'/visu/saveFile.php',true);
					pngRequest.setRequestHeader('Content-Type', 'application/upload');
					volView.debug("Writing  data/seeds_seb/" + volView.__slicesNamePrefix + (volView.__slicesNameOffset + volView.__drawingCanvasParams.sliceNumber) + "." + selectBox.getSelection()[0].getLabel());
					pngRequest.send("data/seeds_seb/" + volView.__slicesNamePrefix + (volView.__slicesNameOffset + volView.__drawingCanvasParams.sliceNumber) + "." + selectBox.getSelection()[0].getLabel() + "!" + pngImg);
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
                    var r, g, b;
                    while (p--) {
                        if ((r = data[pix-=4] * mul + add) > 255 )
                            data[pix] = 255;
                        else if (r < 0)
                            data[pix] = 0;
                        else
                            data[pix] = r;
                        if ((g = data[pix1=pix+1] * mul + add) > 255 )
                            data[pix1] = 255;
                        else if (g < 0)
                            data[pix1] = 0;
                        else
                            data[pix1] = g;
                        if ((b = data[pix2=pix+2] * mul + add) > 255 )
                            data[pix2] = 255;
                        else if (b < 0)
                            data[pix2] = 0;
                        else
                            data[pix2] = b;
                    }
                    dataDesc.data = data;
                }
                return dataDesc;
            };
			
			
			
			
			
		////Use a php file to remove the spceciefd file in the server
			var eraseFile = function(file)
            {
				var removeRequest = new XMLHttpRequest();
				removeRequest.open("POST",'/visu/eraseFile.php',true);
				removeRequest.setRequestHeader('Content-Type', 'application/upload');
				volView.debug("Erasing " + file);
				removeRequest.send(file);
			};




	
		////Rewrite xml list of the drawn seeds
			var updateSeedsXML = function()
            {
				var sliceID;
				var xmlContent = '\n';
				var seedsList=modifSlicesList.getChildren();
				for(var i=0; i<seedsList.length; i++)
				{
					var sliceId=seedsList[i].getUserData("slice");
					sliceID = {slice: sliceId + ""};
					xmlContent += '     ' + element('seed', volView.__slicesNamePrefix + (volView.__slicesNameOffset + sliceId) + "." + selectBox.getSelection()[0].getLabel(), sliceID) + '\n';
				}
				var xmlUpdateRequest = new XMLHttpRequest();
				xmlUpdateRequest.open("POST",'/visu/createXML_Seb.php',true);
				xmlUpdateRequest.setRequestHeader('Content-Type', 'application/upload');
				volView.debug("Writing  seeds.xml");
				xmlUpdateRequest.send(element('seeds', xmlContent));
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
		}
		// updateImage : function() {
			// this.__image.setSource(
				// this.__path+this.__prefix+(this.__offset+this.__maxZ-this.__slider.getValue())+"."+
					// this.__fileFormatBox.getSelection()[0].getLabel()+"?nocache="+this.__volView.__timestamp);
		// }
	}
});

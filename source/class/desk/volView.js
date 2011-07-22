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
		
		ctrlZData = [];
		undoLimit = 10;
		
        mouseData = {
                xPos : 0,
                yPos : 0,
                recentX : 0,
                recentY : 0,
                decaleZoomX : 0,
                decaleZoomY : 0,
                mouseLeftDownFlag : 0,
                mouseMiddleDownFlag : 0,
                mouseRightDownFlag : 0
        };
		
        labelColors = [];
		
        imageZ = 1;
		tempNum = 0;
		MaxZoom = 4;
		timestamp = 0;
		eraserCoeff = 2;
		numberOfSlices = 0;
		slicesNameOffset = 0;     
		eraserCursorZ = 65535;
        drawingCanvasZ = 1023;
		slicesNamePrefix = "";
		segImgSKeyOpacity = 0.5;
		drawingSKeyOpacity = 0;
		
		
		
		
		
		var volView = this;
		
        volView.set({
                width: volView.__winMap.width,
                height: volView.__winMap.height,
                showMinimize: false,
                showMaximize: false,
                showClose: false,
                resizable: true,
                movable : true
        });

        volView.setLayout(new qx.ui.layout.Canvas());
		
		
		
		
		
		if (fileBrowser!=null)
		{
			//file is a tree node...
			var node=file;
			volView.setCaption(node.label);
			var ajax = new XMLHttpRequest();
			ajax.onreadystatechange = function()
			{
				if(this.readyState == 4 && this.status == 200)
				{
					var sha1=ajax.responseText.split("\n")[0];
					volView.openFile("\/visu\/visu_cache\/"+sha1+"\/"+"volume.xml",volView);
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					// fetched the wrong page or network error...
					alert('"Fetched the wrong page" OR "Network error"');
				}
			};
			var label = new qx.ui.basic.Label("Computing slices, wait...").set({
				font : new qx.bom.Font(28, ["Verdana", "sans-serif"])
				});
			volView.add(label);
			ajax.open("POST", "/visu/volumeSlice.php", true);
			ajax.send(fileBrowser.getNodePath(node));
		}
		else
		{
			volView.setCaption(file);
			volView.openFile(file,volView);
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
		__winXP : true,

		__winMap : {
			left : 16,
			top : 8,
			width : 400,
			height : 444
		},

		__imgMap : {
			left : 40,
			top : 4,
			width : 0,
			height : 0
		},

		__htmlCanvasLabels : null,

		__htmlContextLabels : null,

		__drawingCanvasParams : {
		sliceNumber : 0,
		drawingContext : null,
		paintFlag : false,
		eraseFlag : false,
		brCrFixingFlag : false,
		currentColor : '#101010',
		curCtxtZoom : 1,
		myLineWidth : 4,
		myLineCap : "round",
		myLineJoin : "bevel",
		myMiterLimit : 1
		},

		__imgCanvasParams : {
			imgContext : null,
			brightness : 0,
			contrast : 0
		},

		__horizSlices : {
			inProgData : [],
			sliceImages : [],
			sliceLabels : [],
			usedSliceSeeds : [],
			sliceResults : []
		},

		__path : null,
		// __offset : null,
		// __prefix : null,
		// __image : null,
		// __maxZ : null,
		// __slider : null,
		// __timestamp : null,
		// __fileFormatBox : null,
		
		openFile : function (file,volView) {
			this.removeAll();

			// var xmlDoc;
			// {
				// var xmlhttp=new XMLHttpRequest();
				// xmlhttp.open("GET",file+"?nocache=" + Math.random(),false);
				// xmlhttp.send();
				// xmlDoc=xmlhttp.responseXML;
			// }

			// var volume=xmlDoc.getElementsByTagName("volume")[0];
			// if (volume==null)
				// return;

			// var dimensions=volume.getElementsByTagName("dimensions")[0];
			// this.__maxZ=parseInt(dimensions.getAttribute("z"))-1;

			// var slices=volume.getElementsByTagName("slicesprefix")[0];
			// this.__offset=parseInt(slices.getAttribute("offset"));
			// this.__timestamp=slices.getAttribute("timestamp");
			// if (this.__timestamp==null)
				// this.__timestamp=Math.random();
			// this.__prefix=slices.childNodes[0].nodeValue;

			// var slashIndex=file.lastIndexOf("/");
			// this.__path="";
			// if (slashIndex>0)
				// this.__path=file.substring(0,slashIndex)+"\/";

			// var leftContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox(5));

			// this.__slider=new qx.ui.form.Slider();
			// this.__slider.setMinimum(0);
			// this.__slider.setMaximum(this.__maxZ);
			// this.__slider.setWidth(30);
			// this.__slider.setOrientation("vertical");
			// this.__slider.addListener("changeValue", function(event){this.updateImage();},this);
			
		//	if there is only one slice, do not show the slider...
			// if (this.__maxZ>0)
				// leftContainer.add(this.__slider, {flex : 1});

			// this.__fileFormatBox = new qx.ui.form.SelectBox();
			// this.__fileFormatBox.setWidth(30);
			// var SelectJPG = new qx.ui.form.ListItem("jpg");
			// this.__fileFormatBox.add(SelectJPG);
			// var SelectPNG = new qx.ui.form.ListItem("png");
			// this.__fileFormatBox.add(SelectPNG);
			// leftContainer.add(this.__fileFormatBox);
			// this.__fileFormatBox.addListener("changeSelection", function(event){this.updateImage();},this);

			// this.add(leftContainer);

			// this.__image=new qx.ui.basic.Image();
			// this.add(this.__image);
			// this.updateImage();

			// this.addListener("keypress",
				// function(event) {if (event.getKeyIdentifier()=="S") 
					// desk.volView.LINKEDWINDOW=this;},this);
			// this.addListener("click",
				// function(event) {
					// if ((desk.volView.LINKEDWINDOW!=null)&&(desk.volView.LINKEDWINDOW!=this))
					// {
						// this.__slider.bind("value", desk.volView.LINKEDWINDOW.__slider, "value");
						// desk.volView.LINKEDWINDOW.__slider.bind("value", this.__slider, "value");
						// desk.volView.LINKEDWINDOW=null;
					// }},this);









        volView.addListener("mouseout", function(event)
		{
                if(((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.brCrFixingFlag))&&(!volView.__drawingCanvasParams.eraseFlag))
                {
						volView.__htmlContextLabels.beginPath();
						mouseData.mouseLeftDownFlag = false;
						mouseData.mouseMiddleDownFlag = false;
						eraserCursor.set({cursor: "default"});
						drawingCanvas.set({cursor: "default"});
                }
        },this);
        volView.addListener("mouseover", function(event)
		{
				volView.set({opacity: 1, enabled : true});
                if(((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.brCrFixingFlag))||(volView.__drawingCanvasParams.eraseFlag))
                {
						getPosition(event,false);
						var tempMargin = 4;
						if(!((tempMargin<=mouseData.xPos)&&(mouseData.xPos<=volView.__imgMap.width-tempMargin)&&(tempMargin<=mouseData.yPos)&&(mouseData.yPos<=volView.__imgMap.height-tempMargin)))
						{
								volView.__htmlContextLabels.beginPath();
								mouseData.mouseLeftDownFlag = false;
								mouseData.mouseMiddleDownFlag = false;
								eraserCursor.set({cursor: "default"});
								drawingCanvas.set({cursor: "default"});
						}
                }
        },this);
        volView.addListener("click", function(event)
		{
                volView.__winMap.left = volView.getBounds().left;
                volView.__winMap.top = volView.getBounds().top;
        },this);
		
		
		
		
		
		
		
		
		
		
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
									numberOfSlices = parseInt(response.getElementsByTagName("dimensions")[0].getAttribute("z"));
									slicesNameOffset = parseInt(response.getElementsByTagName("slicesprefix")[0].getAttribute("offset"));
									slicesNamePrefix = response.getElementsByTagName("slicesprefix")[0].firstChild.nodeValue;
									timestamp = response.getElementsByTagName("slicesprefix")[0].getAttribute("timestamp");
									if (timestamp==null)
										timestamp = (new Date()).getTime();
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
                    eraserCursor.set({width: Math.ceil(eraserCoeff*volView.__htmlContextLabels.lineWidth*volView.__drawingCanvasParams.curCtxtZoom),
                                        height: Math.ceil(eraserCoeff*volView.__htmlContextLabels.lineWidth*volView.__drawingCanvasParams.curCtxtZoom)});
            });
			
			var penLabel = new qx.ui.basic.Label("Brush : ");
			
			this.add(penLabel, {left: volView.__imgMap.width + 60, top: 8});
			
			this.add(penSize, {left: volView.__imgMap.width + penLabel.getSizeHint().width+4 + 60, top: 4});
			
			
			
			
			
		////Create eraser
            var eraserBorder = new qx.ui.decoration.Single(1, "solid", "black");
			
            var eraserCursor = new qx.ui.core.Widget().set({
										backgroundColor: "white",
										decorator: eraserBorder,
										width: eraserCoeff*volView.__drawingCanvasParams.myLineWidth*volView.__drawingCanvasParams.curCtxtZoom,
										height : eraserCoeff*volView.__drawingCanvasParams.myLineWidth*volView.__drawingCanvasParams.curCtxtZoom,
										zIndex : eraserCursorZ
								});
			
            eraserCursor.addListener("mousedown", function(event)
			{
                ////Erase
					if(event.isLeftPressed())
                    {
							getPosition(event,true);
							save2undoStack(event);
							eraseFnct();
                            mouseData.mouseLeftDownFlag = true;	// Activate erasing while moving
                    }
				////Activate moving
                    if(event.isMiddlePressed())
                    {
							eraserCursor.set({cursor: "move"});
                            mouseData.mouseMiddleDownFlag = true;
							mouseData.recentX = mouseData.xPos;
							mouseData.recentY = mouseData.yPos;
                    }
				////"Undo" (draw previous canvas)
					undoFnct(event);
            });
			
            eraserCursor.addListener("mousemove", function(event)
			{
					getPosition(event,false);	// No scaling so coordinates are compatible with placeEraser function
                    var tempMargin = 4/volView.__drawingCanvasParams.curCtxtZoom;
				////Hide eraser if out of drawing zone
                    if(!((tempMargin<=mouseData.xPos)&&(mouseData.xPos<=volView.__imgMap.width/volView.__drawingCanvasParams.curCtxtZoom-tempMargin)&&(tempMargin<=mouseData.yPos)&&(mouseData.yPos<=volView.__imgMap.height/volView.__drawingCanvasParams.curCtxtZoom-tempMargin)))
                    {
                            if(eraserCursor.getVisibility()=="visible")
							{
                                    eraserCursor.exclude();
							}
                    }
				////Move eraser to mouse position
                    eraserCursor.set({marginLeft: Math.round((mouseData.xPos-eraserCoeff*volView.__htmlContextLabels.lineWidth/2)*volView.__drawingCanvasParams.curCtxtZoom+volView.__imgMap.left),
                                        marginTop: Math.round((mouseData.yPos-eraserCoeff*volView.__htmlContextLabels.lineWidth/2)*volView.__drawingCanvasParams.curCtxtZoom+volView.__imgMap.top)});
					mouseData.xPos = mouseData.decaleZoomX/volView.__drawingCanvasParams.curCtxtZoom + mouseData.xPos;
                    mouseData.yPos = mouseData.decaleZoomY/volView.__drawingCanvasParams.curCtxtZoom + mouseData.yPos;
					if(mouseData.mouseLeftDownFlag)
							eraseFnct(true);
                    if(mouseData.mouseMiddleDownFlag)
                    {
							moveCanvas();
                    }
            },this);
			
            eraserCursor.addListener("mouseup", function(event)
			{
                    mouseData.mouseMiddleDownFlag = false;
                    mouseData.mouseLeftDownFlag = false;
					eraserCursor.set({cursor: "default"});
            },this);

            this.add(eraserCursor, {left:0, top: 0});

			eraserCursor.addListener("keydown", function(event)
			{
					if(event.getKeyIdentifier()=="S")
					{
						////Load reults canvas
						drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
						////Change opacity of results canvas and drawing canvas
						drawingCanvas.set({opacity: drawingSKeyOpacity});
						segmentedImgCanvas.set({opacity: segImgSKeyOpacity, zIndex: drawingCanvasZ+1});
					}
			},this);
			
			eraserCursor.addListener("keyup", function(event)
			{
					if(event.getKeyIdentifier()=="S")
					{
						////Change opacity of results canvas and drawing canvas
						segmentedImgCanvas.set({opacity: 0, zIndex: drawingCanvasZ-1});
						drawingCanvas.set({opacity: whileDrawingDrwngOpacitySlider.getValue()});
					}
			},this);
			
            eraserCursor.exclude();

			
			
			
		////Create eraser on/off button
            var eraserButton = new qx.ui.form.ToggleButton("Eraser");
			
            eraserButton.set({opacity: 0.5, enabled : false});
			
			eraserButton.addListener("changeValue", function(event)
			{
                    volView.__drawingCanvasParams.eraseFlag = event.getData();
				////Activate erasing
                    if(volView.__drawingCanvasParams.eraseFlag)
                    {
                            brghtnssCntrstButton.setValue(false);
                            volView.__drawingCanvasParams.brCrFixingFlag = false;
                    }
				////Hide eraser
                    else
                    {
                            eraserCursor.exclude();
                    }
            });

            eraserButton.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    mouseData.mouseLeftDownFlag = false;
            },this);
			
            if(this.__winXP)
                this.add(eraserButton, {left: volView.__imgMap.width + 56, top: 40});
            else
                this.add(eraserButton, {left: volView.__imgMap.width + 56, top: 36});
			
			
			
		////Create clear drawing zone button
			var clearButton = new qx.ui.form.Button("Clear drawing");

            clearButton.set({opacity: 0.5, enabled : false});
			
			clearButton.addListener("execute", function(event)
			{
                    volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
                    volView.__htmlContextLabels.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
					volView.__htmlContextLabels.beginPath();
                    mouseData.mouseLeftDownFlag = false;
                    clearButton.set({opacity: 0.5, enabled : false});
                    eraserButton.set({opacity: 0.5, enabled : false});
                    eraserButton.setValue(false);
                    volView.__drawingCanvasParams.eraseFlag = false;
                    eraserCursor.exclude();
            });

            clearButton.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    mouseData.mouseLeftDownFlag = false;
            },this);
			
			if(this.__winXP)
                this.add(clearButton, {left: volView.__imgMap.width + eraserButton.getSizeHint().width+8 + 67, top: 40});
            else
                this.add(clearButton, {left: volView.__imgMap.width + eraserButton.getSizeHint().width+8 + 74, top: 36});
			
			
			
			
			
		////Create labels zone
			var colorsPage = new qx.ui.tabview.Page("REGIONS");
            colorsPage.setLayout(new qx.ui.layout.Grid(1,1));
			
			var colorsTabView = new qx.ui.tabview.TabView();
            colorsTabView.add(colorsPage);

            colorsTabView.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    mouseData.mouseLeftDownFlag = false;
            },this);

            this.add(colorsTabView, {left: volView.__imgMap.width + 50, top: 73+4});
			
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
                            eraserButton.setValue(false);
                            volView.__drawingCanvasParams.eraseFlag = false;
                            brghtnssCntrstButton.setValue(false);
                            volView.__drawingCanvasParams.brCrFixingFlag = false;
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
											labelColors[i] = {
													red : response.getElementsByTagName("color")[i].getAttribute("red"),
													green : response.getElementsByTagName("color")[i].getAttribute("green"),
													blue : response.getElementsByTagName("color")[i].getAttribute("blue")
											};
											var newLabel = {
													id : parseInt(response.getElementsByTagName("color")[i].getAttribute("label")),
													name : response.getElementsByTagName("color")[i].getAttribute("name"),
													color : "rgb(" + labelColors[i].red + "," + labelColors[i].green + "," + labelColors[i].blue + ")"
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
			colorsParamRequest.open("GET", "/visu/colors3.xml", false);
			colorsParamRequest.send(null);
			
			
			
			
			
		////Create brightness/contrast fixing on/off button
			var brghtnssCntrstButton = new qx.ui.form.ToggleButton(null, "desk/Contrast_Logo_petit.PNG");
			
            brghtnssCntrstButton.set({toolTipText : "LUMINOSITE/CONTRASTE"});

            brghtnssCntrstButton.addListener("changeValue", function(event)
			{
                    volView.__drawingCanvasParams.brCrFixingFlag = event.getData();
                    if(volView.__drawingCanvasParams.brCrFixingFlag)
                    {
                            var children = colorsPage.getChildren();
                            for(var i=0; i<nbLabels; i++)
                            {
                                    children[i].set({decorator: unfocusedBorder, backgroundColor: "background-light"});
                            }
                            eraserButton.setValue(false);
                            volView.__drawingCanvasParams.eraseFlag = false;
                            volView.__drawingCanvasParams.paintFlag = false;
                    }
            });
			
			if(this.__winXP)
                this.add(brghtnssCntrstButton, {left: volView.__imgMap.width + colorsTabView.getSizeHint().width - 4, top: 40});
            else
                this.add(brghtnssCntrstButton, {left: volView.__imgMap.width + colorsTabView.getSizeHint().width - 4, top: 36});
			
			
			
		////Create reset brightness/contrast button
			var resetBrCrButton = new qx.ui.form.Button("Reset");
            
			resetBrCrButton.set({opacity: 0.5, enabled : false});
			
			resetBrCrButton.addListener("execute", function(event)
			{
                    volView.__imgCanvasParams.brightness = 0;
                    volView.__imgCanvasParams.contrast = 0;
					drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
                    resetBrCrButton.set({opacity: 0.5, enabled : false});
                    brghtnssCntrstButton.setValue(false);
            });
			
			this.add(resetBrCrButton);

            if(this.__winXP)
                resetBrCrButton.setUserBounds(volView.__imgMap.width + colorsTabView.getSizeHint().width + 39, 41, 50, 32);
            else
                resetBrCrButton.setUserBounds(volView.__imgMap.width + colorsTabView.getSizeHint().width + 39, 36, 50, 32);
			
			
			
			
			
		////Create slider
            var slider = new qx.ui.form.Slider();
            slider.setHeight(volView.__imgMap.height - 18);  ////  set below to match image height
            slider.setWidth(30);
            slider.setMaximum(numberOfSlices-1);
            slider.setMinimum(0);
            slider.setOrientation("vertical");
            this.add(slider, {left: 0, top: 4});
			
			
			
		////Create spinner and sync it with the slider
            var spinner = new qx.ui.form.Spinner();
            spinner.setMaximum(numberOfSlices-1);
            spinner.setMinimum(0);
            spinner.bind("value", slider, "value");
            slider.bind("value", spinner, "value");
            spinner.bind("maximum", slider, "maximum");
            slider.bind("maximum", spinner, "maximum");
            spinner.bind("minimum", slider, "minimum");
            slider.bind("minimum", spinner, "minimum");
            this.add(spinner, {left: 0, top: volView.__imgMap.height + 8});
			
			
			
        ////Create and add the jpeg/png format select box
            var selectBox = new qx.ui.form.SelectBox();
			selectBox.set({width: 52});
            var SelectPNG = new qx.ui.form.ListItem("png");
            selectBox.add(SelectPNG);
            var SelectJPG = new qx.ui.form.ListItem("jpg");
            selectBox.add(SelectJPG);
			
			
			
			
			
		////Create slices list zone
			var slicesPage = new qx.ui.tabview.Page("SLICES");
            slicesPage.setLayout(new qx.ui.layout.Grid(1,1));
			
			var slicesTabView = new qx.ui.tabview.TabView();
            slicesTabView.add(slicesPage);

            slicesTabView.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    mouseData.mouseLeftDownFlag = false;
            },this);

            this.add(slicesTabView, {left: volView.__imgMap.width + 50, top: colorsTabView.getLayoutProperties().top + colorsTabView.getSizeHint().height+8 + 61});
			
			var modifSlicesList = new qx.ui.form.List(true);
			modifSlicesList.set({ height: 64, width: colorsTabView.getSizeHint().width, selectionMode : "one" , spacing : 8});
			
			modifSlicesList.addListener("keypress", function(event)
			{
					if((event.getKeyIdentifier()=="Delete")&&(typeof listMembers[0] != "undefined"))
					{
							var selectedChild = modifSlicesList.getSelection();
							var tempChildren = modifSlicesList.getChildren();
							var tempPos = findInArray(tempChildren, selectedChild[0]);
						////Erase image on the server
							eraseFile(slicesNamePrefix + (slicesNameOffset + listMembers[tempPos]) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + timestamp);
						////Update members list
							updateList(tempPos);
						////Clear drawing canvas
							clearButton.execute();
						////Erase from widget list
							modifSlicesList.remove(modifSlicesList.getSelection()[0]);
							if(typeof modifSlicesList.getChildren()[tempPos-1] != "undefined")
									modifSlicesList.setSelection([modifSlicesList.getChildren()[tempPos-1]]);
							if(0<listMembers.length)
							{
								////Update XML file
									updateSeedsXML();
							}
							else
							{
								////Reset widget list to current slice
									var tempSlide = slider.getValue();
									if(tempSlide!=0)
									{
											slider.setValue(0);
											slider.setValue(tempSlide);
									}
									else
									{
											slider.setValue(1);
											slider.setValue(0);
									}
								////Erase XML file
									eraseFile("seeds.xml");
								////Reset image and drawing canvas if list is empty
									resetZoom();
									startButton.set({opacity: 0.5, enabled : false});
							}
					}
			}, this);
			
			modifSlicesList.addListener("changeSelection", function(event)
			{
					if(!slicesListSemaphore)
					{
							var selectedChild = event.getData();
							var tempChildren = modifSlicesList.getChildren();
							for(var i=0; i<tempChildren.length; i++)
							{
									if(tempChildren[i]==selectedChild[0])
									{
											while(listSemahpore);
											if(typeof listMembers != "undefined")	// Prevents error when the list has not yet been created
											{
													if(typeof listMembers[i] != "undefined")	// Prevents error when the member has not yet been added
															slider.setValue(listMembers[i]);
											}
											continue;
									}
							}
					}
			}, this);
			
			slicesPage.add(modifSlicesList, {column: 0, row: 0});
			
			
			
			
			
		////Create start algorythm button
			var startButton = new qx.ui.form.ToggleButton("Start");

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
							brghtnssCntrstButton.setValue(false);
							volView.__drawingCanvasParams.brCrFixingFlag = false;
							this.set({opacity: 0.5, enabled : false});
							var tempMax = volView.__horizSlices.usedSliceSeeds[0].length;
							for(var i=0; i<listMembers.length; i++)
							{
									volView.__horizSlices.usedSliceSeeds[listMembers[i]][tempMax] = volView.__horizSlices.sliceLabels[listMembers[i]];
							}
							htmlContextUsedSeeds.putImageData(volView.__horizSlices.usedSliceSeeds[volView.__drawingCanvasParams.sliceNumber][tempMax], 0, 0);
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
											for(var i=0; i<numberOfSlices; i++)
											{
													volView.__horizSlices.sliceResults[i][tempMax] = new Image();
													volView.__horizSlices.sliceResults[i][tempMax].src = base + (slicesNameOffset + i) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + (new Date()).getTime();
											};
											var tempSrc = base + (slicesNameOffset + volView.__drawingCanvasParams.sliceNumber) + "." + selectBox.getSelection()[0].getLabel();
											volView.__horizSlices.sliceResults[volView.__drawingCanvasParams.sliceNumber][tempMax].src = tempSrc + "?nocache=" + (new Date()).getTime();
											volView.__horizSlices.sliceResults[volView.__drawingCanvasParams.sliceNumber][tempMax].onload = function()
											{
													htmlContextSegImg.drawImage(this, 0, 0, this.width, this.height);
											};
											whileShowingDrwngOpacityLabel.set({opacity: 1, enabled : true});
											whileShowingDrwngOpacitySlider.set({opacity: 1, enabled : true});
											segImgOpacityLabel.set({opacity: 1, enabled : true});
											whileDrawingSegImgOpacityLabel.set({opacity: 1, enabled : true});
											whileDrawingSegImgOpacitySlider.set({opacity: 1, enabled : true});
											whileShowingSegImgOpacityLabel.set({opacity: 1, enabled : true});
											whileShowingSegImgOpacitySlider.set({opacity: 1, enabled : true});
											extWinCheckBox.set({opacity: 1, enabled : true});
											segmentationDone = true;
									}
									else if (this.readyState == 4 && this.status != 200)
									{
											// fetched the wrong page or network error...
											volView.debug('"Fetched the wrong page" OR "Network error"');
									}
							};
							startRequest.open("POST", "/visu/cvtGcMultiseg.php", false);
							startRequest.send("/home/visu/data/gc/image/" + "slice" + (slicesNameOffset + volView.__drawingCanvasParams.sliceNumber) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + timestamp);
							startButton.setValue(false);
							segSemahpore = true;
					}
			},this);

            startButton.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    mouseData.mouseLeftDownFlag = false;
            },this);
			
            this.add(startButton, {left: volView.__imgMap.width - 4, top: volView.__imgMap.height + 7});
			// this.add(selectBox, {left: volView.__imgMap.width - selectBox.getSizeHint().width+8 - startButton.getSizeHint().width+8 + 26, top: volView.__imgMap.height + 7});
			
			
			
			
			
			var drawingDrwngOpacityLabel = new qx.ui.basic.Label("Drawing layer opacity : ");
			this.add(drawingDrwngOpacityLabel, {left: 0, top: spinner.getLayoutProperties().top + spinner.getSizeHint().height+4 + 21});
			
			
			var whileDrawingDrwngOpacityLabel = new qx.ui.basic.Label("While drawing");
			this.add(whileDrawingDrwngOpacityLabel, {left: 0, top: drawingDrwngOpacityLabel.getLayoutProperties().top + drawingDrwngOpacityLabel.getSizeHint().height+4 + 2});
			
            var whileDrawingDrwngOpacitySlider = new qx.ui.form.Slider();
            whileDrawingDrwngOpacitySlider.setHeight(whileDrawingDrwngOpacityLabel.getSizeHint().height+4 - 4);
			whileDrawingDrwngOpacitySlider.set({width:128, maximum:100, minimum:21, value:100});
			whileDrawingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
					drawingCanvas.set({opacity: event.getData()/100});
			},this);
            this.add(whileDrawingDrwngOpacitySlider, {left: 137, top: whileDrawingDrwngOpacityLabel.getLayoutProperties().top});
			
			
			var whileShowingDrwngOpacityLabel = new qx.ui.basic.Label('While pressing "s" key');
			whileShowingDrwngOpacityLabel.set({opacity: 0.5, enabled : false});
			this.add(whileShowingDrwngOpacityLabel, {left: 0, top: whileDrawingDrwngOpacityLabel.getLayoutProperties().top + whileDrawingDrwngOpacityLabel.getSizeHint().height+4 + 2});
			
            var whileShowingDrwngOpacitySlider = new qx.ui.form.Slider();
            whileShowingDrwngOpacitySlider.setHeight(whileShowingDrwngOpacityLabel.getSizeHint().height+4 - 4);
			whileShowingDrwngOpacitySlider.set({width:128, maximum:100, minimum:0, value:0});
			whileShowingDrwngOpacitySlider.addListener("changeValue", function(event)
			{
					drawingSKeyOpacity = event.getData()/100;
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
					segImgSKeyOpacity = event.getData()/100;
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
			this.add(extWinCheckBox, {left: volView.__imgMap.width - extWinCheckBox.getSizeHint().width+4 + 73, top: drawingDrwngOpacityLabel.getLayoutProperties().top - 4});
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
					htmlCanvasUsedSeeds = document.getElementById("htmlTagCanvasUsedSeeds");
                    htmlContextUsedSeeds = htmlCanvasUsedSeeds.getContext("2d");
            }, this);
            externalWindow.add(extWinSeedsCanvas, {left: 0, top: 0});
			
		////Open window so canvas are redrawn then close it to call redraw events
			externalWindow.open();
			externalWindow.close();
			
			
			
			
			
			
			
			
			
			var updateContext = function(event)
            {
                    var data = event.getData();
                    // volView.debug("data : " + event.getData());
                    volView.__drawingCanvasParams.drawingContext = data.context;
					// volView.debug("volView.__drawingCanvasParams.drawingContext : " + volView.__drawingCanvasParams.drawingContext);
                    volView.__drawingCanvasParams.drawingContext.setTransform(volView.__drawingCanvasParams.curCtxtZoom,0,0,volView.__drawingCanvasParams.curCtxtZoom,0,0);
					volView.__drawingCanvasParams.drawingContext.mozImageSmoothingEnabled = false;
					volView.__htmlCanvasLabels = document.getElementById("htmlTagCanvasLabels");
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
                    if(!((mouseData.brCrFixingFlag)&&(mouseData.mouseLeftDownFlag)))
					{
							volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
							drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
                    }
					getPosition(event,true);
				////Draw at cursor position, activate drawing, activate brightness/contrast fixing
					if(event.isLeftPressed())
                    {
							if((volView.__drawingCanvasParams.paintFlag)||(volView.__drawingCanvasParams.eraseFlag))
							{
									save2undoStack(event);
							}
                            if((volView.__drawingCanvasParams.paintFlag)&&(!volView.__drawingCanvasParams.eraseFlag)&&(!volView.__drawingCanvasParams.brCrFixingFlag))
                            {
                                    volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
                                    volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
                                    volView.__htmlContextLabels.beginPath();
                                    volView.__htmlContextLabels.arc(mouseData.xPos,
															mouseData.yPos,
																	volView.__htmlContextLabels.lineWidth/2,
                                                                    0, Math.PI*2, false);
                                    volView.__htmlContextLabels.closePath();
                                    volView.__htmlContextLabels.fill();
                                    clearButton.set({opacity: 1, enabled : true});
                                    if(!eraserButton.isEnabled())
                                            eraserButton.set({opacity: 1, enabled : true});
                            }
                            if(volView.__drawingCanvasParams.brCrFixingFlag)
                            {
                                    drawingCanvas.set({cursor: "crosshair"});
                                    mouseData.recentX = mouseData.xPos;
                                    mouseData.recentY = mouseData.yPos;
                            };
							mouseData.mouseLeftDownFlag = true;
                            volView.__htmlContextLabels.beginPath();
                    }
				////Activate moving
                    if((event.isMiddlePressed())&&(1<volView.__drawingCanvasParams.curCtxtZoom))
                    {
							drawingCanvas.set({cursor: "move"});
                            mouseData.mouseMiddleDownFlag = true;
                    }
					mouseData.recentX = mouseData.xPos;
                    mouseData.recentY = mouseData.yPos;
				////"Undo" (draw previous canvas)
					undoFnct(event);
				////Draw cursor
                    if((volView.__drawingCanvasParams.paintFlag)&&(!volView.__drawingCanvasParams.eraseFlag)&&(!volView.__drawingCanvasParams.brCrFixingFlag))
                    {
							drawBrush(event,volView.__drawingCanvasParams.curCtxtZoom);
                    }
					drawPointer(event,volView.__drawingCanvasParams.curCtxtZoom);
            };
			
			var wheelScale = 0;
            var mouseWheelHandler = function(event)
            {
					if((event.isLeftPressed()==false)&&(event.isMiddlePressed()==false)&&(event.isRightPressed()==false))
					{
							var tempScale = wheelScale;
							tempScale += -event.getWheelDelta()/16;
							volView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
							volView.__imgCanvasParams.imgContext.setTransform(1,0,0,1,0,0);
							var curentZoom = volView.__drawingCanvasParams.curCtxtZoom;
							var zoomFactor = Math.pow(2,tempScale);
						////Apply zoom
							if((1<=zoomFactor)&&(zoomFactor<=MaxZoom))	////Only zoom no shrinking and not more than Max zoom
							{
									volView.debug(" zoom = x" + zoomFactor);
									mouseData.xPos = event.getDocumentLeft()-volView.__winMap.left-10-volView.__imgMap.left;
									mouseData.yPos = event.getDocumentTop()-volView.__winMap.top-35-volView.__imgMap.top;
									////volView.debug(event.getType() + "(" + mouseData.xPos + "," + mouseData.yPos + ")");
									var onImageX = mouseData.decaleZoomX + mouseData.xPos;
									var onImageY = mouseData.decaleZoomY + mouseData.yPos;
									////volView.debug("on image : (" + onImageX + "," + onImageY + ")");
									volView.__imgCanvasParams.imgContext.clearRect(-16,-16,volView.__imgMap.width+32, volView.__imgMap.height+32);
									volView.__drawingCanvasParams.drawingContext.clearRect(-16,-16,volView.__imgMap.width+32, volView.__imgMap.height+32);
								////Zoom in
									if(zoomFactor!=1)
									{
											volView.__drawingCanvasParams.drawingContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
											volView.__imgCanvasParams.imgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
											var tempDecaleX = (onImageX*zoomFactor/curentZoom-mouseData.xPos)/zoomFactor;
											var tempDecaleY = (onImageY*zoomFactor/curentZoom-mouseData.yPos)/zoomFactor;
											if(tempDecaleX<0)
											{
													mouseData.decaleZoomX = 0;
											}
											if(volView.__imgMap.width-volView.__imgMap.width/zoomFactor<tempDecaleX)
											{
													mouseData.decaleZoomX = volView.__imgMap.width-volView.__imgMap.width/zoomFactor;
											}
											if((0<=tempDecaleX)&&(tempDecaleX<=volView.__imgMap.width-volView.__imgMap.width/zoomFactor))
											{
													mouseData.decaleZoomX = tempDecaleX;
											}
											if(tempDecaleY<0)
											{
													mouseData.decaleZoomY = 0;
											}
											if(volView.__imgMap.height-volView.__imgMap.height/zoomFactor<tempDecaleY)
											{
													mouseData.decaleZoomY = volView.__imgMap.height-volView.__imgMap.height/zoomFactor;
											}
											if((0<=tempDecaleY)&&(tempDecaleY<=volView.__imgMap.height-volView.__imgMap.height/zoomFactor))
											{
													mouseData.decaleZoomY = tempDecaleY;
											}
											mouseData.decaleZoomX = mouseData.decaleZoomX*zoomFactor;
											mouseData.decaleZoomY = mouseData.decaleZoomY*zoomFactor;
											var newCoor = changeInto05Coordinates(mouseData.decaleZoomX,mouseData.decaleZoomY);
											mouseData.decaleZoomX = newCoor.newX;
											mouseData.decaleZoomY = newCoor.newY;
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
									eraserCursor.set({width: Math.ceil(eraserCoeff*volView.__htmlContextLabels.lineWidth*zoomFactor)+1,
														height: Math.ceil(eraserCoeff*volView.__htmlContextLabels.lineWidth*zoomFactor)+1});
								////Place the center of the eraser at mouse position
									if(volView.__drawingCanvasParams.eraseFlag)
									{
											eraserCursor.set({marginLeft: Math.round((mouseData.xPos/zoomFactor-eraserCursor.getBounds().width/(2*zoomFactor))*zoomFactor+volView.__imgMap.left),
																marginTop: Math.round((mouseData.yPos/zoomFactor-eraserCursor.getBounds().height/(2*zoomFactor))*zoomFactor+volView.__imgMap.top)});
									}
									wheelScale = tempScale;
									volView.__drawingCanvasParams.curCtxtZoom = zoomFactor;
							}
					}
            };
			
			var mouseMoveHandler = function(event)
            {
					if(!((volView.__drawingCanvasParams.brCrFixingFlag)&&(mouseData.mouseLeftDownFlag)))
					{
							drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
                    }
					getPosition(event,true);
				////Set eraser cursor position
					if(volView.__drawingCanvasParams.eraseFlag)
                    {
							var tempX = (event.getDocumentLeft()-volView.__winMap.left-10-volView.__imgMap.left)/volView.__drawingCanvasParams.curCtxtZoom;
							var tempY = (event.getDocumentTop()-volView.__winMap.top-35-volView.__imgMap.top)/volView.__drawingCanvasParams.curCtxtZoom;
							eraserCursor.set({marginLeft: Math.round((tempX-eraserCoeff*volView.__htmlContextLabels.lineWidth/2)*volView.__drawingCanvasParams.curCtxtZoom+volView.__imgMap.left),
												marginTop: Math.round((tempY-eraserCoeff*volView.__htmlContextLabels.lineWidth/2)*volView.__drawingCanvasParams.curCtxtZoom+volView.__imgMap.top)});
                            if(eraserCursor.getVisibility()=="excluded")
							{
                                    eraserCursor.show();
							}
                    }
                    if(mouseData.mouseLeftDownFlag)
                    {
						////Draw to mouse position
                            if((volView.__drawingCanvasParams.paintFlag)&&(!volView.__drawingCanvasParams.eraseFlag)&&(!volView.__drawingCanvasParams.brCrFixingFlag))
                            {
                                    volView.__htmlContextLabels.strokeStyle = volView.__drawingCanvasParams.currentColor;
                                    volView.__htmlContextLabels.fillStyle = volView.__drawingCanvasParams.currentColor;
                                    volView.__htmlContextLabels.lineTo(mouseData.xPos,mouseData.yPos);
                                    volView.__htmlContextLabels.stroke();
                                    clearButton.set({opacity: 1, enabled : true});
                                    if(!eraserButton.isEnabled())
                                            eraserButton.set({opacity: 1, enabled : true});
                            }
						////Erase at mouse position
                            if(volView.__drawingCanvasParams.eraseFlag)
									eraseFnct(true);
						////Use mouse mouvement to set brightness/contrast
                            if(volView.__drawingCanvasParams.brCrFixingFlag)
                            {
                                    var tempBrightness = volView.__imgCanvasParams.brightness + (mouseData.yPos-mouseData.recentY)*150/volView.__imgMap.height;
                                    var tempContrast = volView.__imgCanvasParams.contrast + (mouseData.xPos-mouseData.recentX)*5/volView.__imgMap.width;
                                    if((0<tempBrightness+150)&&(tempBrightness<150))
                                            volView.__imgCanvasParams.brightness = tempBrightness;
                                    if((0<tempContrast+1)&&(tempContrast<5))
                                            volView.__imgCanvasParams.contrast = tempContrast;
									drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
                                    resetBrCrButton.set({opacity: 1, enabled : true});
                                    mouseData.recentX = mouseData.xPos;
                                    mouseData.recentY = mouseData.yPos;
                            }
                    }
                    if(mouseData.mouseMiddleDownFlag)
                    {
							moveCanvas();
					}
				////Draw cursor
                    if((volView.__drawingCanvasParams.paintFlag)&&(!volView.__drawingCanvasParams.eraseFlag)&&(!volView.__drawingCanvasParams.brCrFixingFlag))
                    {
							drawBrush(event,volView.__drawingCanvasParams.curCtxtZoom);
                    }
					drawPointer(event,volView.__drawingCanvasParams.curCtxtZoom);
				////Update image
					if((volView.__drawingCanvasParams.brCrFixingFlag)&&(mouseData.mouseLeftDownFlag))
					{
							drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
                    }
            };
			
			var mouseUpHandler = function(event)
            {
                    mouseData.mouseLeftDownFlag = false;
					mouseData.mouseMiddleDownFlag = false;
                    drawingCanvas.set({cursor: "default"});
            };
			
			
			
		////Create results array for each slice image
            for(var i=0; i<numberOfSlices; i++)
            {
                volView.__horizSlices.sliceResults[i] = [];
				volView.__horizSlices.usedSliceSeeds[i] = [];
            };
			
			var segmentedImgCanvas = new qx.ui.embed.Canvas().set({syncDimension: true, zIndex: drawingCanvasZ-1});
			segmentedImgCanvas.set({opacity: 0});
            this.add(segmentedImgCanvas, {left: volView.__imgMap.left, top: volView.__imgMap.top});
            segmentedImgCanvas.setUserBounds(volView.__imgMap.left, volView.__imgMap.top, volView.__imgMap.width, volView.__imgMap.height);
			segmentedImgCanvas.addListener("redraw", function(event)
			{
                    var data = event.getData();
                    segmentedImgCanvas.segImgContext = data.context;
					htmlCanvasSegImg = document.getElementById("htmlTagCanvasSegImg");
                    htmlContextSegImg = htmlCanvasSegImg.getContext("2d");
            }, this);
			segmentedImgCanvas.addListener("mousemove", function(event)
			{
				////Change opacity of results canvas and drawing canvas
					segmentedImgCanvas.set({opacity: whileDrawingSegImgOpacitySlider.getValue(), zIndex: drawingCanvasZ-1});
					drawingCanvas.set({opacity: whileDrawingDrwngOpacitySlider.getValue()});
			}, this);
			
			var keyDownHandler = function(event)
			{
					if(event.getKeyIdentifier()=="S")
					{
						////Load reults canvas
							drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
						////Change opacity of results canvas and drawing canvas
							drawingCanvas.set({opacity: drawingSKeyOpacity});
							segmentedImgCanvas.set({opacity: segImgSKeyOpacity, zIndex: drawingCanvasZ+1});
					}
			};
			
			var keyUpHandler = function(event)
			{
					if(event.getKeyIdentifier()=="S")
					{
						////Change opacity of results canvas and drawing canvas
						segmentedImgCanvas.set({opacity: whileDrawingSegImgOpacitySlider.getValue(), zIndex: drawingCanvasZ-1});
						drawingCanvas.set({opacity: whileDrawingDrwngOpacitySlider.getValue()});
					}
			};
			
			
			
			
			
			var imgCanvas = new qx.ui.embed.Canvas().set({syncDimension: true, zIndex: imageZ});
			
            this.add(imgCanvas, {left: volView.__imgMap.left, top: volView.__imgMap.top});
			
            imgCanvas.setUserBounds(volView.__imgMap.left, volView.__imgMap.top, volView.__imgMap.width, volView.__imgMap.height);
			
			imgCanvas.addListener("redraw", function(event)
			{
                    var data = event.getData();
                    volView.__imgCanvasParams.imgContext = data.context;
					htmlCanvasImage = document.getElementById("htmlTagCanvasImage");
                    htmlContextImage = htmlCanvasImage.getContext("2d");
					htmlContextImage.drawImage(canvasImage, 0, 0, canvasImage.width, canvasImage.height);	// here for unbuild version
					volView.__imgCanvasParams.imgContext.drawImage(htmlCanvasImage, 0, 0, canvasImage.width, canvasImage.height);	// here for unbuild version
            }, this);
			
			
			
			
			
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
            for(var i=0; i<numberOfSlices; i++)
            {
                volView.__horizSlices.sliceImages[i] = new sliceImg();
                volView.__horizSlices.sliceImages[i].url = this.__path + "slice" + (slicesNameOffset+i) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + timestamp;
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
					if((volView.__drawingCanvasParams.sliceNumber==0)&&(typeof htmlContextImage!="undefined")&&(typeof volView.__imgCanvasParams.imgContext!="undefined"))
					{
							htmlContextImage.drawImage(canvasImage, 0, 0, canvasImage.width, canvasImage.height);
							volView.__imgCanvasParams.imgContext.drawImage(htmlCanvasImage, 0, 0, canvasImage.width, canvasImage.height);
					}
			};
			
			
			
			
			
            var drawingCanvas = new qx.ui.embed.Canvas().set({syncDimension: true, zIndex: drawingCanvasZ});
			
            drawingCanvas.addListener("redraw", updateContext, this);
            drawingCanvas.addListener("mousedown", mouseDownHandler, this);
            drawingCanvas.addListener("mousewheel", mouseWheelHandler, this);
            eraserCursor.addListener("mousewheel", mouseWheelHandler, this);
			drawingCanvas.addListener("mousemove", mouseMoveHandler, this);
            drawingCanvas.addListener("mouseup", mouseUpHandler, this);
			drawingCanvas.addListener("keydown", keyDownHandler, this);
			drawingCanvas.addListener("keyup", keyUpHandler, this);
			
            this.add(drawingCanvas, {left: volView.__imgMap.left, top: volView.__imgMap.top});

            drawingCanvas.setUserBounds(volView.__imgMap.left, volView.__imgMap.top, volView.__imgMap.width, volView.__imgMap.height);
			
			
			
            // HTML embed for background image
            var embedHtmlCodeImage = '<canvas id="htmlTagCanvasImage" width="' + volView.__imgMap.width + '" height="' + volView.__imgMap.height + '" ></canvas>';
            var embedObjectImage = new qx.ui.embed.Html(embedHtmlCodeImage);
            embedObjectImage.setDecorator("main");
            embedObjectImage.setWidth(volView.__imgMap.width);
            embedObjectImage.setHeight(volView.__imgMap.height);
			
            var containerLayoutImage = new qx.ui.layout.VBox();
            var containerHtmlImage = new qx.ui.container.Composite(containerLayoutImage);
            containerHtmlImage.add(embedObjectImage);
			
            this.add(containerHtmlImage, {left: volView.__imgMap.left/*  + 500 */, top: volView.__imgMap.top/*  + 260 */});
			
			
			
            // HTML embed for drawn labels
            var embedHtmlCodeLabels = '<canvas id="htmlTagCanvasLabels" width="' + volView.__imgMap.width + '" height="' + volView.__imgMap.height + '" ></canvas>';
            var embedObjectLabels = new qx.ui.embed.Html(embedHtmlCodeLabels);
            embedObjectLabels.setDecorator("main");
            embedObjectLabels.setWidth(volView.__imgMap.width);
            embedObjectLabels.setHeight(volView.__imgMap.height);
			
            var containerLayoutLabels = new qx.ui.layout.VBox();
            var containerHtmlLabels = new qx.ui.container.Composite(containerLayoutLabels);
            containerHtmlLabels.add(embedObjectLabels);
			
            this.add(containerHtmlLabels, {left: volView.__imgMap.left/*  + 500 */, top: volView.__imgMap.top/*  + 260 */});
			
			
			
            // HTML embed for segmented image
            var embedHtmlCodeSegImg = '<canvas id="htmlTagCanvasSegImg" width="' + volView.__imgMap.width + '" height="' + volView.__imgMap.height + '" ></canvas>';
            var embedObjectSegImg = new qx.ui.embed.Html(embedHtmlCodeSegImg);
            embedObjectSegImg.setDecorator("main");
            embedObjectSegImg.setWidth(volView.__imgMap.width);
            embedObjectSegImg.setHeight(volView.__imgMap.height);
			
            var containerLayoutSegImg = new qx.ui.layout.VBox();
            var containerHtmlSegImg = new qx.ui.container.Composite(containerLayoutSegImg);
            containerHtmlSegImg.add(embedObjectSegImg);
			
            this.add(containerHtmlSegImg, {left: volView.__imgMap.left/*  + 500 */, top: volView.__imgMap.top/*  + 260 */});
			
			
			
            // HTML embed for seeds used for segmentation
            var embedHtmlCodeUsedSeeds = '<canvas id="htmlTagCanvasUsedSeeds" width="' + volView.__imgMap.width + '" height="' + volView.__imgMap.height + '" ></canvas>';
            var embedObjectUsedSeeds = new qx.ui.embed.Html(embedHtmlCodeUsedSeeds);
            embedObjectUsedSeeds.setDecorator("main");
            embedObjectUsedSeeds.setWidth(volView.__imgMap.width);
            embedObjectUsedSeeds.setHeight(volView.__imgMap.height);
			
            var containerLayoutUsedSeeds = new qx.ui.layout.VBox();
            var containerHtmlUsedSeeds = new qx.ui.container.Composite(containerLayoutUsedSeeds);
            containerHtmlUsedSeeds.add(embedObjectUsedSeeds);
			
            this.add(containerHtmlUsedSeeds, {left: volView.__imgMap.left/*  + 500 */, top: volView.__imgMap.top/*  + 260 */});
			
			
			
			
			
			
			
			
			
			
			var sliceFlags = function() {
					var flagObj = {
							curTagged : false,
							inList : false,
							segmented : false
					};
					return flagObj;
			};
			var listMembers = [];
			var listSemahpore = false;
			var slicesListSemaphore = false;
			for(var i=0; i<numberOfSlices; i++)
			{
					volView.__horizSlices.inProgData[i] = new sliceFlags();
			};
		
		////Initialize list
			modifSlicesList.addAt(new qx.ui.form.ListItem("Slice No." + 0), 0);
			listMembers[0] = 0;
			for(var i=0; i<numberOfSlices; i++)
			{
					if(i!=0)
							volView.__horizSlices.inProgData[i].inList = volView.__horizSlices.inProgData[i].inList;
					else
							volView.__horizSlices.inProgData[i].inList = true;
			};
			
			
			
			slider.addListener("changeValue", function(event)
			{
					volView.__htmlContextLabels.beginPath();
					mouseData.mouseLeftDownFlag = false;
				////Save current image
					volView.__horizSlices.sliceLabels[volView.__drawingCanvasParams.sliceNumber] = volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
					tempNum = volView.__drawingCanvasParams.sliceNumber;
					volView.__horizSlices.inProgData[tempNum].curTagged = !pngCanvasFctn();	//  pngCanvasFctn() returns true if image is all black
					volView.__drawingCanvasParams.sliceNumber = event.getData();
					if(segmentationDone)
					{
							var index = 0;
							htmlContextSegImg.drawImage(volView.__horizSlices.sliceResults[volView.__drawingCanvasParams.sliceNumber][index],
														0,
														0,
														volView.__horizSlices.sliceResults[volView.__drawingCanvasParams.sliceNumber][index].width,
														volView.__horizSlices.sliceResults[volView.__drawingCanvasParams.sliceNumber][index].height);
							if(typeof volView.__horizSlices.usedSliceSeeds[volView.__drawingCanvasParams.sliceNumber][index] != "undefined")
									htmlContextUsedSeeds.putImageData(volView.__horizSlices.usedSliceSeeds[volView.__drawingCanvasParams.sliceNumber][index], 0, 0);
							else
									htmlContextUsedSeeds.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
					}
				////Update lists
					if(volView.__horizSlices.inProgData[tempNum].curTagged)	////CURRENT slice has seeds
					{
							if(!volView.__horizSlices.inProgData[tempNum].inList)
							{
								// Add slice to list
									var sliceItem = new qx.ui.form.ListItem("Slice No." + tempNum);
									var tempPos = 0;
									for(var i=0; i<=tempNum; i++)
									{
											if(listMembers[i]<tempNum)
													tempPos++;
									}
									slicesListSemaphore = false;
									modifSlicesList.addAt(sliceItem, tempPos);
								// Update members list
									var tempMembers = [];
									var j = 0;
									listSemahpore = true;
									for(var i=0; i<=listMembers.length; i++)
									{
											if((j!=tempPos)&&(i<listMembers.length))
											{
													tempMembers[j] = listMembers[i];
											}
											if(j==tempPos)
											{
													tempMembers[j] = tempNum;
													i--;	// do "i--;" so when doing "i++;" i index doesn't actually change
											}
											j++;
									}
									listMembers = tempMembers;
									listSemahpore = false;
									for(var i=0; i<numberOfSlices; i++)
									{
											if(i!=tempNum)
													volView.__horizSlices.inProgData[i].inList = volView.__horizSlices.inProgData[i].inList;
											else
													volView.__horizSlices.inProgData[i].inList = true;
									}
								////Update XML file
									updateSeedsXML();
							}
						////Since there is at least one saved seeds image, activate start button
                            if(!startButton.isEnabled())
                                    startButton.set({opacity: 1, enabled : true});
					}
					else	////CURRENT slice has NO seeds
					{
							if(volView.__horizSlices.inProgData[tempNum].inList)
							{
								////Erase image on the server
									eraseFile(slicesNamePrefix + (slicesNameOffset + tempNum) + "." + selectBox.getSelection()[0].getLabel() + "?nocache=" + timestamp);
								////Update members list
									var tempPos = findInArray(listMembers, tempNum);
									updateList(tempPos);
									slicesListSemaphore = true;
									modifSlicesList.remove(modifSlicesList.getChildren()[tempPos]);
									if(typeof modifSlicesList.getChildren()[tempPos-1] != "undefined")
											modifSlicesList.setSelection([modifSlicesList.getChildren()[tempPos-1]]);
									slicesListSemaphore = false;
									if(0<listMembers.length)
									{
										////Update XML file
											updateSeedsXML();
									}
									else
									{
										////Erase XML file
											eraseFile("seeds.xml");
										////Reset image and drawing canvas if list is empty
											resetZoom();
											startButton.set({opacity: 0.5, enabled : false});
									}
							}
					}	////End if(volView.__horizSlices.inProgData[tempNum].curTagged)
				////Set canvas, buttons, list
					if(volView.__horizSlices.inProgData[volView.__drawingCanvasParams.sliceNumber].curTagged)	////NEXT slice HAS seeds
					{
							volView.__htmlContextLabels.putImageData(volView.__horizSlices.sliceLabels[volView.__drawingCanvasParams.sliceNumber], 0, 0);
							clearButton.set({opacity: 1, enabled : true});
							eraserButton.set({opacity: 1, enabled : true});
                            startButton.set({opacity: 1, enabled : true});
						////Update XML file
							updateSeedsXML();
							if(volView.__horizSlices.inProgData[volView.__drawingCanvasParams.sliceNumber].inList)
							{
									var tempPos = findInArray(listMembers, volView.__drawingCanvasParams.sliceNumber);
									slicesListSemaphore = true;
									modifSlicesList.setSelection([modifSlicesList.getChildren()[tempPos]]);
									slicesListSemaphore = false;
							}
							else
							{
								////Update XML file
									updateSeedsXML();
								////Add slice to list
									var sliceItem = new qx.ui.form.ListItem("Slice No." + volView.__drawingCanvasParams.sliceNumber);
									var tempPos = 0;
									for(var i=0; i<=volView.__drawingCanvasParams.sliceNumber; i++)
									{
											if(listMembers[i]<volView.__drawingCanvasParams.sliceNumber)
													tempPos++;
									}
									// slicesListSemaphore = true;
									slicesListSemaphore = false;
									modifSlicesList.addAt(sliceItem, tempPos);
									// slicesListSemaphore = false;
								////Update members list
									var tempMembers = [];
									var j = 0;
									listSemahpore = true;
									for(var i=0; i<=listMembers.length; i++)
									{
											if((j!=tempPos)&&(i<listMembers.length))
											{
													tempMembers[j] = listMembers[i];
											}
											if(j==tempPos)
											{
													tempMembers[j] = volView.__drawingCanvasParams.sliceNumber;
													i--;	// do "i--;" so when doing "i++;" i index doesn't actually change
											}
											j++;
									}
									listMembers = tempMembers;
									listSemahpore = false;
									for(var i=0; i<numberOfSlices; i++)
									{
											if(i!=volView.__drawingCanvasParams.sliceNumber)
													volView.__horizSlices.inProgData[i].inList = volView.__horizSlices.inProgData[i].inList;
											else
													volView.__horizSlices.inProgData[i].inList = true;
									}
									slicesListSemaphore = true;
									modifSlicesList.setSelection([modifSlicesList.getChildren()[tempPos]]);
									slicesListSemaphore = false;
							}
					}
					else	////NEXT slice has NO seeds
					{
							clearButton.execute();
							volView.__htmlContextLabels.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
							startButton.set({opacity: 0.5, enabled : false});
							if(listMembers.length<1)
							{
									eraseFile("seeds.xml");
							}
							if(!volView.__horizSlices.inProgData[volView.__drawingCanvasParams.sliceNumber].inList)
							{
								////Add slice to list
									var sliceItem = new qx.ui.form.ListItem("Slice No." + volView.__drawingCanvasParams.sliceNumber);
									var tempPos = 0;
									for(var i=0; i<=volView.__drawingCanvasParams.sliceNumber; i++)
									{
											if(listMembers[i]<volView.__drawingCanvasParams.sliceNumber)
													tempPos++;
									}
									// slicesListSemaphore = true;
									slicesListSemaphore = false;
									modifSlicesList.addAt(sliceItem, tempPos);
									// slicesListSemaphore = false;
									for(var i=0; i<numberOfSlices; i++)
									{
											if(i!=volView.__drawingCanvasParams.sliceNumber)
													volView.__horizSlices.inProgData[i].inList = volView.__horizSlices.inProgData[i].inList;
											else
													volView.__horizSlices.inProgData[i].inList = true;
									}
								////Update XML file
									updateSeedsXML();
									slicesListSemaphore = true;
									modifSlicesList.setSelection([modifSlicesList.getChildren()[tempPos]]);
									slicesListSemaphore = false;
								////Update members list
									var tempMembers = [];
									var i = 0;
									listSemahpore = true;
									for(var j=0; j<=listMembers.length; j++)
									{
											if(j!=tempPos)
											{
													tempMembers[j] = listMembers[i];
													i++;
											}
											if(j==tempPos)
											{
													tempMembers[j] = volView.__drawingCanvasParams.sliceNumber;
											}
									}
									listMembers = tempMembers;
									listSemahpore = false;
							}
					};	////End if(typeof volView.__horizSlices.sliceLabels[volView.__drawingCanvasParams.sliceNumber] != "undefined")
				////Update image canvas
					if(volView.__horizSlices.sliceImages[volView.__drawingCanvasParams.sliceNumber].srcImage.src=="")
					{
						////First access to slice. Load image by passing source url
							volView.__horizSlices.sliceImages[volView.__drawingCanvasParams.sliceNumber].srcImage.src = volView.__horizSlices.sliceImages[volView.__drawingCanvasParams.sliceNumber].url;
					}
					else
					{
						////Slice has previously been accessed. Load image by copying image into "canvasImage" global variable
							canvasImage = volView.__horizSlices.sliceImages[volView.__drawingCanvasParams.sliceNumber].srcImage;
							volView.__drawingCanvasParams.drawingContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
							drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
					};
				////Clear "undo" stack
					ctrlZData = [];
			}, this);

            slider.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    mouseData.mouseLeftDownFlag = false;
            },this);
			
            slider.setHeight(volView.__imgMap.height);    //	set to match image height
			slider.setValue(0);
			
            spinner.addListener("mouseup", function(event)
			{
                    volView.__htmlContextLabels.beginPath();
                    mouseData.mouseLeftDownFlag = false;
            },this);
			
			
			
			
			
			
			
			
			
			
			
			
			
			
			
		/* ************************************************************************************************************************************* */
		//
		//	F U N C T I O N S
		//
		/* ************************************************************************************************************************************* */
			
			
			
			
			
        ////Computes on image mouse position
		////If(scaling) applies zoom factor for relative coordinates (on zoomed window)
			var getPosition = function(mouseEvent,scaling)
            {
					mouseData.xPos = (mouseEvent.getDocumentLeft()-volView.__winMap.left-10-volView.__imgMap.left)/volView.__drawingCanvasParams.curCtxtZoom;
					mouseData.yPos = (mouseEvent.getDocumentTop()-volView.__winMap.top-35-volView.__imgMap.top)/volView.__drawingCanvasParams.curCtxtZoom;
					////volView.debug(mouseEvent.getType() + "(" + mouseData.xPos + "," + mouseData.yPos + ")");
					if(scaling)
					{
							mouseData.xPos = mouseData.decaleZoomX/volView.__drawingCanvasParams.curCtxtZoom + mouseData.xPos;
							mouseData.yPos = mouseData.decaleZoomY/volView.__drawingCanvasParams.curCtxtZoom + mouseData.yPos;
							////volView.debug(mouseEvent.getType() + "(" + mouseData.xPos + "," + mouseData.yPos + ")");
					}
					var newCoor = changeInto05Coordinates(mouseData.xPos,mouseData.yPos);
					mouseData.xPos = newCoor.newX;
					mouseData.yPos = newCoor.newY;
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
                    var sx = mouseData.decaleZoomX/zoomFactor;
                    var sy = mouseData.decaleZoomY/zoomFactor;
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
					extWinSeedsCanvas.extWinSeedsContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
					extWinSegImgCanvas.extWinSegImgContext.setTransform(zoomFactor,0,0,zoomFactor,0,0);
				////Refresh image while drawing
					if(zooming)
					{
						if(canvasImage.complete)
						{
							htmlContextImage.drawImage(canvasImage, 0, 0, canvasImage.width, canvasImage.height);
							var outImg = processBrCr(volView.__imgCanvasParams.brightness, volView.__imgCanvasParams.contrast, true);
							htmlContextImage.putImageData(outImg, 0, 0);
							volView.__imgCanvasParams.imgContext.drawImage(htmlCanvasImage,
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
								htmlContextImage.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
								htmlContextImage.font = 'bold 21px sans-serif';
								htmlContextImage.textBaseLine = 'bottom';
								htmlContextImage.fillText('Image not yet loaded', (volView.__imgMap.width-volView.__imgMap.height)/2, volView.__imgMap.height/2);
								volView.__imgCanvasParams.imgContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
						}
					}
				////Refresh drawing canevas while only moving cursor
					if(!((mouseData.brCrFixingFlag)&&(mouseData.mouseLeftDownFlag)&&(volView.__drawingCanvasParams.eraseFlag)))
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
							segmentedImgCanvas.segImgContext.drawImage(htmlCanvasSegImg,
                                                                        sx,
                                                                        sy,
                                                                        sdw,
                                                                        sdh,
                                                                        0,
                                                                        0,
                                                                        sdw,
                                                                        sdh);
							extWinSeedsCanvas.extWinSeedsContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
							extWinSeedsCanvas.extWinSeedsContext.drawImage(htmlCanvasUsedSeeds,
                                                                        sx,
                                                                        sy,
                                                                        sdw,
                                                                        sdh,
                                                                        0,
                                                                        0,
                                                                        sdw,
                                                                        sdh);
							extWinSegImgCanvas.extWinSegImgContext.clearRect(-16, -16, volView.__imgMap.width+32, volView.__imgMap.height+32);
							extWinSegImgCanvas.extWinSegImgContext.drawImage(htmlCanvasSegImg,
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
			
			
			
			
			
		////Draw circle at mouse position
		////The labels image is not modified
			var drawBrush = function(mouseEvent,scale)
            {
                    var tempX = (mouseEvent.getDocumentLeft()-volView.__winMap.left-10-volView.__imgMap.left)/scale;
                    var tempY = (mouseEvent.getDocumentTop()-volView.__winMap.top-35-volView.__imgMap.top)/scale;
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
                    var tempX = (mouseEvent.getDocumentLeft()-volView.__winMap.left-10-volView.__imgMap.left)/scale;
                    var tempY = (mouseEvent.getDocumentTop()-volView.__winMap.top-35-volView.__imgMap.top)/scale;
                    var tempMargin = 4/scale;
                    if((tempMargin<tempX)&&(tempX<volView.__imgMap.width/scale-tempMargin)&&(tempMargin<tempY)&&(tempY<volView.__imgMap.height/scale-tempMargin))
                    {
						////Set line width
							extWinSegImgCanvas.extWinSegImgContext.lineWidth = 5/scale;
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
							extWinSegImgCanvas.extWinSegImgContext.closePath();
                    }
			};
			
			
			
			
			
		////Save current labels image (used before any modification on the canvas)
			var save2undoStack = function(mouseEvent)
            {
					if(!mouseEvent.isRightPressed())
					{
							var tempData = [];
							if(ctrlZData.length==0)
							{
									tempData[0] = volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
							}
							else
							{
									if(ctrlZData.length<undoLimit)
									{
											for(var i=0; i<ctrlZData.length; i++)
											{
													tempData[ctrlZData.length-i] = ctrlZData[ctrlZData.length-i-1];
											}
											tempData[0] = volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
									}
									else
									{
											if(ctrlZData.length==undoLimit)
											{
													for(var i=1; i<ctrlZData.length; i++)
													{
															tempData[ctrlZData.length-i] = ctrlZData[ctrlZData.length-i-1];
													}
													tempData[0] = volView.__htmlContextLabels.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
											}
									}
							}
							ctrlZData = tempData;
					}
			};
			
			
			
			
			
		////Pops out the last state in the "undo" stack and draw image on the canvas
            var undoFnct = function(mouseEvent)
            {
					if(mouseEvent.isRightPressed())
					{
							if(0<ctrlZData.length)
							{
									volView.__htmlContextLabels.putImageData(ctrlZData[0], 0, 0);
									drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
							}
							var tempData = [];
							for(var i=1; i<ctrlZData.length; i++)
							{
									tempData[i-1] = ctrlZData[i];
							}
							ctrlZData = tempData;
					}
			};
			
			
			
			
			
		////Redraw image and drawing canvas when translation
            var moveCanvas = function()
            {
					var tempDecaleX = mouseData.decaleZoomX/volView.__drawingCanvasParams.curCtxtZoom + mouseData.recentX-mouseData.xPos;
					var tempDecaleY = mouseData.decaleZoomY/volView.__drawingCanvasParams.curCtxtZoom + mouseData.recentY-mouseData.yPos;
					if(tempDecaleX<0)
					{
							mouseData.decaleZoomX = 0;
					}
					if(volView.__imgMap.width-volView.__imgMap.width/volView.__drawingCanvasParams.curCtxtZoom<tempDecaleX)
					{
							mouseData.decaleZoomX = volView.__imgMap.width-volView.__imgMap.width/volView.__drawingCanvasParams.curCtxtZoom;
					}
					if((0<=tempDecaleX)&&(tempDecaleX<=volView.__imgMap.width-volView.__imgMap.width/volView.__drawingCanvasParams.curCtxtZoom))
					{
							mouseData.decaleZoomX = tempDecaleX;
					}
					if(tempDecaleY<0)
					{
							mouseData.decaleZoomY = 0;
					}
					if(volView.__imgMap.height-volView.__imgMap.height/volView.__drawingCanvasParams.curCtxtZoom<tempDecaleY)
					{
							mouseData.decaleZoomY = volView.__imgMap.height-volView.__imgMap.height/volView.__drawingCanvasParams.curCtxtZoom;
					}
					if((0<=tempDecaleY)&&(tempDecaleY<=volView.__imgMap.height-volView.__imgMap.height/volView.__drawingCanvasParams.curCtxtZoom))
					{
							mouseData.decaleZoomY = tempDecaleY;
					}
					mouseData.decaleZoomX = mouseData.decaleZoomX*volView.__drawingCanvasParams.curCtxtZoom;
					mouseData.decaleZoomY = mouseData.decaleZoomY*volView.__drawingCanvasParams.curCtxtZoom;
					drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,true);
			};
			
			
			
			
			
		////Clear labels canvas at mouse position
            var eraseFnct = function(autoComplete)
            {
					var tempX, tempY;
					if(autoComplete)
					{
							tempX = (mouseData.recentX+mouseData.xPos)/2-eraserCoeff*volView.__htmlContextLabels.lineWidth/2;
							tempY = (mouseData.recentY+mouseData.yPos)/2-eraserCoeff*volView.__htmlContextLabels.lineWidth/2;
							var newCoor = changeInto05Coordinates(tempX,tempY);
							tempX = newCoor.newX;
							tempY = newCoor.newY;
                            volView.__htmlContextLabels.clearRect(tempX,
                                                        tempY,
                                                            eraserCoeff*volView.__htmlContextLabels.lineWidth,
                                                            eraserCoeff*volView.__htmlContextLabels.lineWidth);
					}
					tempX = mouseData.xPos-eraserCoeff*volView.__htmlContextLabels.lineWidth/2;
					tempY = mouseData.yPos-eraserCoeff*volView.__htmlContextLabels.lineWidth/2;
					var newCoor = changeInto05Coordinates(tempX,tempY);
					tempX = newCoor.newX;
					tempY = newCoor.newY;
                    volView.__htmlContextLabels.clearRect(tempX,
												tempY,
													eraserCoeff*volView.__htmlContextLabels.lineWidth,
													eraserCoeff*volView.__htmlContextLabels.lineWidth);
                    drawZoomedCanvas(volView.__drawingCanvasParams.curCtxtZoom,false);
                    mouseData.recentX = mouseData.xPos;
                    mouseData.recentY = mouseData.yPos;
			};
			
			
			
			
			
		////Redraw image canvas at original scale
            var resetZoom = function(autoComplete)
            {
					volView.__imgCanvasParams.imgContext.setTransform(1,0,0,1,0,0);
					htmlContextImage.drawImage(canvasImage, 0, 0, canvasImage.width, canvasImage.height);
					var outImg = processBrCr(volView.__imgCanvasParams.brightness, volView.__imgCanvasParams.contrast, true);
					htmlContextImage.putImageData(outImg, 0, 0);
					volView.__imgCanvasParams.imgContext.drawImage(htmlCanvasImage, 0, 0, canvasImage.width, canvasImage.height);
					volView.__drawingCanvasParams.drawingContext.setTransform(1,0,0,1,0,0);
					extWinSegImgCanvas.extWinSegImgContext.clearRect(-16,-16,volView.__imgMap.width+32, volView.__imgMap.height+32);
					volView.__drawingCanvasParams.drawingContext.drawImage(volView.__htmlCanvasLabels,0,0);
					extWinSegImgCanvas.extWinSegImgContext.setTransform(1,0,0,1,0,0);
					extWinSegImgCanvas.extWinSegImgContext.drawImage(htmlCanvasSegImg,0,0);
					extWinSeedsCanvas.extWinSeedsContext.clearRect(-16,-16,volView.__imgMap.width+32, volView.__imgMap.height+32);
					extWinSeedsCanvas.extWinSeedsContext.setTransform(1,0,0,1,0,0);
					extWinSeedsCanvas.extWinSeedsContext.drawImage(htmlCanvasUsedSeeds,0,0);
					mouseData.decaleZoomX = 0;
					mouseData.decaleZoomY = 0;
					wheelScale = 0;
					volView.__drawingCanvasParams.curCtxtZoom = 1;
			};
			
			
			
			
			
		////Function reads drawing canvas to save it in png format in the server  or
		//// to return true value if image is all black (if canvas is empty)
            var pngCanvasFctn = function()
            {
                    var sliceData = htmlContextImage.getImageData(0, 0, volView.__imgMap.width, volView.__imgMap.height);
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
									for(var j=0; j<labelColors.length; j++)
									{
											red = labelColors[j].red;
											green = labelColors[j].green;
											blue = labelColors[j].blue;
											var testD = Math.sqrt(Math.pow(red-seeds[i],2)+Math.pow(green-seeds[i+1],2)+Math.pow(blue-seeds[i+2],2));
											if(testD<distance)
											{
													distance = testD;
													rightColorIndex = j;
											}
									}
									pixels[i] = labelColors[rightColorIndex].red;
									pixels[i+1] = labelColors[rightColorIndex].green;
									pixels[i+2] = labelColors[rightColorIndex].blue;
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
							volView.debug("Writing  data/seeds/" + slicesNamePrefix + (slicesNameOffset + volView.__drawingCanvasParams.sliceNumber) + "." + selectBox.getSelection()[0].getLabel());
							pngRequest.send("data/seeds/" + slicesNamePrefix + (slicesNameOffset + volView.__drawingCanvasParams.sliceNumber) + "." + selectBox.getSelection()[0].getLabel() + "!" + pngImg);
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
                    if (typeof htmlContextImage.getImageData == "function")
                    {
                        var dataDesc = htmlContextImage.getImageData(0, 0, canvasImage.width, canvasImage.height);
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
					for(var i=0; i<listMembers.length; i++)
					{
							sliceID = {slice: listMembers[i] + ""};
							xmlContent += '     ' + element('seed', slicesNamePrefix + (slicesNameOffset + listMembers[i]) + "." + selectBox.getSelection()[0].getLabel(), sliceID) + '\n';
					}
					var xmlUpdateRequest = new XMLHttpRequest();
					xmlUpdateRequest.open("POST",'/visu/createXML.php',true);
					xmlUpdateRequest.setRequestHeader('Content-Type', 'application/upload');
					volView.debug("Writing  seeds.xml");
					xmlUpdateRequest.send(element('seeds', xmlContent));
			};
			
			
			
			
			
		////Seek value in given array (not implemented by default in Javascript)
			var findInArray = function(array, value)
            {
					var position = 0;
					for(var i=0; i<array.length; i++)
					{
							if(array[i]==value)
							{
									position = i;
									continue;
							}
					}
					return position
			};
			
			
			
			
			
		////Recreate list after removing member
			var updateList = function(tempPos)
            {
					var tempMembers = [];
					var j = 0;
					listSemahpore = true;
					for(var i=0; i<listMembers.length; i++)
					{
							if(i!=tempPos)
							{
									tempMembers[j] = listMembers[i];
									volView.__horizSlices.inProgData[listMembers[i]].inList = volView.__horizSlices.inProgData[listMembers[i]].inList;
									j++;
							}
							if(i==tempPos)
							{
									volView.__horizSlices.sliceLabels[listMembers[i]] = null;
									volView.__horizSlices.inProgData[listMembers[i]].inList = false;
							}
					}
					listMembers = tempMembers;
					listSemahpore = false;
			};
			
			
			
			
			
			// XML writer with attributes and smart attribute quote escaping 
			var APOS = "'"; QUOTE = '"'
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
					// this.__fileFormatBox.getSelection()[0].getLabel()+"?nocache="+this.__timestamp);
		// }
	}
});

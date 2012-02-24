qx.Class.define("desk.volMaster", 
{
	extend : qx.core.Object,
	
	construct : function(globalFile, globalFileBrowser)
	{	
		
        // Enable logging in debug variant
        if(qx.core.Environment.get("qx.debug"))
        {
            // support native logging capabilities, e.g. Firebug for Firefox
            qx.log.appender.Native;
            // support additional cross-browser console. Press F7 to toggle visibility
            qx.log.appender.Console;
        }

    ////Global variables
		
		this.__file = globalFile;
		
		this.__fileBrowser = globalFileBrowser;
		
		
		//~ var Z_xy_viewer = new desk.volView__classTest(this, globalFile, globalFileBrowser, 0);
		//~ var X_zy_viewer = new desk.volView__classTest(this, globalFile, globalFileBrowser, 1);
		//~ var Y_xz_viewer = new desk.volView__classTest(this, globalFile, globalFileBrowser, 2);
		
		//~ orion test : launch the 3 views at once ! ! !

		this.__createVolumesList();

		this.__viewers = [];
		this.__nbUsedOrientations = 3;
		this.addVolume(globalFile);
		
		
		var tryToolwin = new desk.segTools(this, globalFile, globalFileBrowser);
		
		this.__tools = tryToolwin;	
		this.setToolsReady(true);	
		
	//// MUST return the first volView__classTest instance !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//~ return (Z_xy_viewer);
		return (this.__viewers); //~ orion test : launch the 3 views at once ! ! !

	},

	events : {
		// add the "add oriented view" event!
		
		//add the "change viewer" event !
	},

	properties : {
		toolsReady : { init : false, check: "Boolean", event : "changeToolsReady"},
	
		firstViewerOn : { init:false, event:"firstViewerReady" },
		secondViewerOn : { init:false, event:"secondViewerReady" },
		thirdViewerOn : { init:false, event:"thirdViewerReady" },
		segToolsOn : { init:false, event:"segToolsReady" }
	},

	members :
	{
		__volumes : null,

		__viewers : null,
		
		__nbUsedOrientations : null,
		
		__tools : null,
		
		__file : null,
		
		__fileBrowser : null,
		
		getTools : function () {
			return this.__tools;
		},

		getViewers : function () {
			return this.__viewers;
		},

		__createVolumesList : function () {
			var window=new qx.ui.window.Window();

			window.setLayout(new qx.ui.layout.HBox(5));
			window.setShowClose(true);
			window.setShowMinimize(false);
			window.setResizable(true,true,true,true);
			window.setUseResizeFrame(true);
			window.setUseMoveFrame(true);
			window.set({width : 400, height : 400});
			window.setCaption("volumes");

			this.__volumes= new qx.ui.form.List();
			this.__volumes.set({ selectionMode : "multi" });

			window.add(this.__volumes, {flex : 1});
			window.open();
		},

		addVolume : function (file) {
			var volumeSlices=[];
			for(var i=0; i<this.__nbUsedOrientations; i++)
			{
				if (this.__viewers[i]==undefined)
				{
					this.__viewers[i] = new desk.sliceView(file, this.__fileBrowser, this, i, ( function (myI) { 
						return (function (volumeSlice) {
							volumeSlices[myI]=volumeSlice;
							});
						} ) (i));
					// index test : add lfexibility between orientation (1,2 or 3) and a unique index for each viewer no matter its view orientation
					//					<!> CAUTION : any index must be  <  this.__viewers.length
					this.__viewers[i].setUserData("viewerIndex",i);
				}
				else
				{
					alert ("already one volume present, implement addition TODO");
				}
			}
			var volumeListItem=new qx.ui.form.ListItem(file);
			volumeListItem.setUserData("slices", volumeSlices);
			this.__volumes.add(volumeListItem);
		},

		__loadSession : function()
		{
this.debug("------->>>   theMaster.__loadSession : function()   !!!!!!!");

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
	//~ theMaster.debug("88 : theMaster.__resetSeedsList(); !");
			theMaster.__resetSeedsList();
	//~ theMaster.debug("89 : after  theMaster.__resetSeedsList();");
			
			var loadSessionRequest = new XMLHttpRequest();
			
			loadSessionRequest.onreadystatechange = function()
			{
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(this.responseXML!=null)
					{
						var response = this.responseXML;
theMaster.debug("104 : loadSessionRequest -> response : " + response);
						var seedsTypes = tools.__seedsTypeSelectBox.getChildren();
						for (var k=0;k<seedsTypes.length;k++)
						{
							var seedsTypeSelectBoxItem=seedsTypes[k];
							var slices;
	//~ theMaster.debug("109 : seedsTypeSelectBoxItem.getUserData(filePrefix) : " + seedsTypeSelectBoxItem.getUserData("filePrefix"));
							if (seedsTypeSelectBoxItem.getUserData("filePrefix")=="seed")
								slices=response.getElementsByTagName("seed");
							else
								slices=response.getElementsByTagName("correction");
	//~ theMaster.debug("113 : slices.length : " + slices.length);
							for(var j=0; j<slices.length; j++)
							{
								var sliceId = parseInt(slices[j].getAttribute("slice"),10);
								var sliceOrientation = parseInt(slices[j].getAttribute("orientation"),10);
								for(var i=0; i<theMaster.__viewers.length; i++)
									if(sliceOrientation==theMaster.__viewers[i].__display.orientation)
										theMaster.__viewers[i].__addNewSeedItemToList(sliceId, seedsTypeSelectBoxItem);
							}
						}
						tools.__extractMeshesButton.setEnabled(true);
						//~ theMaster.__loadDisplay(); //~ Sorry, there's problems with this. Try again later...
						theMaster.__updateAll();
					}
					else
					{
						alert("no seeds found");
						theMaster.__updateAll();
					}
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					alert("no seeds found");

					theMaster.__updateAll();
				}
			};
			var filePrefix = tools.__seedsTypeSelectBox.getSelection()[0].getLabel();
			loadSessionRequest.open("GET",
				fileBrowser.getFileURL(tools.getSessionDirectory()+"/seeds.xml?nocache="+Math.random()), true);
			loadSessionRequest.send(null);
		},
		
		__updateAll : function()
		{
this.debug("------->>>   theMaster.__updateAll : function()   !!!!!!!");

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			var targetSlices=this.__volumes.getChildren()[0].getUserData("slices");
			
			for(var i=0; i<targetSlices.length; i++)
			{
				if (tools.__seedsTypeSelectBox!=null)
				{
					var currentSlice = targetSlices[i].getCurrentSlice();

		//~ theMaster.debug("162 : currentSlice : " + currentSlice);
					var seedsTypeListItem=tools.__seedsTypeSelectBox.getSelection()[0];
		//~ theMaster.debug("164 : seedsTypeListItem : " + seedsTypeListItem);
		//~ theMaster.debug("165 : seedsTypeListItem.getUserData(seedsArray).length : " + seedsTypeListItem.getUserData("seedsArray").length);
		//~ theMaster.debug("166 : theMaster.__viewers["+i+"].__display.orientation : " + theMaster.__viewers[i].__display.orientation);
		//~ theMaster.debug("167 : seedsTypeListItem.getUserData(seedsArray)[theMaster.__viewers["+i+"].__display.orientation].length : " + seedsTypeListItem.getUserData("seedsArray")[theMaster.__viewers[i].__display.orientation].length);
					var sliceItem=seedsTypeListItem.getUserData("seedsArray")[targetSlices[i].getOrientation()][currentSlice];
		//~ theMaster.debug("170 : sliceItem : " + sliceItem);
		//~ theMaster.debug("171 : theMaster.__viewers["+i+"].getUserData(viewerIndex) : " + theMaster.__viewers[i].getUserData("viewerIndex"));
		//~ theMaster.debug("172 : seedsTypeListItem.getUserData(seedsList) : " + seedsTypeListItem.getUserData("seedsList"));
					var seedsList=seedsTypeListItem.getUserData("seedsList")[theMaster.__viewers[i].getUserData("viewerIndex")];
		//~ theMaster.debug("174 : seedsList : " + seedsList);
					if(sliceItem!=0)
					{
						// the slice contains seeds
						theMaster.__updateSeeds();
						seedsList.setSelection([sliceItem]);
					}
					else
					{
						// current slice has no seeds
						seedsList.resetSelection();
//seb						theMaster.__viewers[i].__clearDrawingCanvas();
					}
				}

				////Update image canvas
//seb				theMaster.__viewers[i].__updateImage();
				
				////Clear "undo" stack
				theMaster.__viewers[i].__ctrlZData = [];
				theMaster.__viewers[i].__currentSeedsModified=false;
			}
			
		},
		
		
		__updateSeeds : function ()
		{
this.debug("------->>>   theMaster.__updateSeeds : function()   !!!!!!!");

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
			for(var i=0; i<theMaster.__viewers.length; i++)
			{
				
				var sliceId=theMaster.__viewers[i].__spinner.getValue();
				//~ var oldSeedSlice=theMaster.__viewers[i].__currentSeedsSlice;
				var oldSeedSlice = theMaster.__viewers[i].__display.depthShift;
				
				var selection = theMaster.__viewers[i].__formatSelectBox.getSelection()[0];
				
				var seedsURL = fileBrowser.getFileURL(tools.getSessionDirectory()+"/"+theMaster.__viewers[i].__getSeedFileName(sliceId))+"?nocache="+
				tools.__seedsTypeSelectBox.getSelection()[0].getUserData("cacheTags")[theMaster.__viewers[i].__display.orientation][sliceId];
				
				// test wether the seed is already loaded. If yes, we need to recreate the Image
				if (oldSeedSlice==sliceId)
					theMaster.__viewers[i].__loadSeeds = new Image();
				
				theMaster.__viewers[i].__loadSeeds.viewer = theMaster.__viewers[i];
				theMaster.__viewers[i].__loadSeeds.Id = sliceId;
				theMaster.__viewers[i].__loadSeeds.onload = function ()
				{
//~ theMaster.debug("231 : >>>>>>>  theMaster.__viewers[i].__loadSeeds.onload   !!!!!!!!!!!!!!!!!!!!!!!!!");
					var thisVolView = this.viewer;
					if(thisVolView.__drawingCanvasParams.drawingContext!=null)
					{
						thisVolView.__clearDrawingCanvas();
						thisVolView.__htmlContextLabels.drawImage(thisVolView.__loadSeeds, 0, 0);
						thisVolView.__drawZoomedCanvas(thisVolView.__display.curCtxtZoom,true);
						//~ thisVolView.__currentSeedsSlice=sliceId;
						thisVolView.__display.depthShift = this.Id;
					}
				};
				
				theMaster.__viewers[i].__loadSeeds.src = seedsURL;
				
			}
			
		},
		
		
		__resetSeedsList : function()
		{
this.debug("------->>>   theMaster.__resetSeedsList : function()   !!!!!!!");

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
			var seedsTypeSelectBoxItems = tools.__seedsTypeSelectBox.getChildren();

			for (var k=0;k<seedsTypeSelectBoxItems.length;k++)
			{
				var item=seedsTypeSelectBoxItems[k];
	//~ theMaster.debug("261 : item : " + item);
				
				var tempMultiArray = [];
				var tempMultiCacheTags = [];

				var volumeSlices=this.__volumes.getChildren()[0].getUserData("slices");

				for(var orionCount=0; orionCount<theMaster.__nbUsedOrientations; orionCount++)
				{
					var numberOfSlices=volumeSlices[orionCount].getNumberOfSlices();
/*seb					var numberOfSlices = theMaster.__viewers[0].__dimensions[2]; // just to give a default value to numberOfSlices
					for(var i=0; i<theMaster.__viewers.length; i++)
					{
						if(theMaster.__viewers[i].__display.orientation==orionCount)
						{
							item.getUserData("seedsList")[theMaster.__viewers[i].getUserData("viewerIndex")].removeAll();
							numberOfSlices = theMaster.__viewers[i].__dimensions[2];
						}
					}*/
					tempMultiArray[orionCount] = new Array(numberOfSlices);
					tempMultiCacheTags[orionCount] = new Array(numberOfSlices);
					for (var j=0;j!=numberOfSlices;j++)
					{
						tempMultiCacheTags[orionCount][j]=Math.random();
						tempMultiArray[orionCount][j]=0;
					}
	//~ theMaster.debug("285 : tempMultiArray[" + orionCount + "].length : " + tempMultiArray[orionCount].length);
	//~ theMaster.debug("286 : tempMultiArray[" + orionCount + "] : " + tempMultiArray[orionCount]);
				}
	//~ theMaster.debug("288 : tempMultiArray.length : " + tempMultiArray.length);
				
				item.setUserData("seedsArray", tempMultiArray);
				item.setUserData("cacheTags", tempMultiCacheTags);
				
			}
		},
		
		////Rewrite xml list of the drawn seeds
		__saveSeedsXML : function(callback)
        {
this.debug("------->>>   theMaster.__saveSeedsXML : function(callback)   !!!!!!!");

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
			
			var xmlContent = '\n';
			var colors='\n';
			for(var i=0; i<tools.__labelColors.length; i++)
			{
				colors+=theMaster.__element('color',null, tools.__labelColors[i]);
			}
			xmlContent+=theMaster.__element('colors', colors)+"\n";

			var seedsTypeItems=tools.__seedsTypeSelectBox.getChildren();
			for (var k=0;k<seedsTypeItems.length;k++)
			{
				var item=seedsTypeItems[k];
				
				for(var orionCount=0; orionCount<theMaster.__nbUsedOrientations; orionCount++)
				{
							var seedsList = item.getUserData("seedsList")[theMaster.__viewers[i].getUserData("viewerIndex")];
						if(seedsList!=null)
						{
		//~ theMaster.debug("345 : seedsList.length : " + seedsList.length);
							var filePrefix=item.getUserData("filePrefix");
		//~ theMaster.debug("347 : filePrefix : " + filePrefix);
							var slices=seedsList.getChildren();
							for(var j=0; j<slices.length; j++)
							{
								var sliceId=slices[j].getUserData("slice");
		//~ theMaster.debug("352 : sliceId : " + sliceId);
								var sliceAttributes = {slice: sliceId + "", orientation: orionCount + ""};
								xmlContent += theMaster.__element(filePrefix, theMaster.__viewers[i].__getSeedFileName(sliceId, item), sliceAttributes) + '\n';
							}
						}
				}
			}

//~ theMaster.debug("363 : .getSessionDirectory() !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
			var parameterMap={
				"action" : "save_xml_file",
				"file_name" : "seeds.xml",
				"xmlData" : theMaster.__element('seeds', xmlContent),
				"output_directory" : tools.getSessionDirectory()};

			fileBrowser.getActions().launchAction(parameterMap, callback);
		},
		
		////Use a php file to remove the specified file in the server
		__eraseFile : function(file)
        {
this.debug("------->>>   theMaster.__eraseFile : function()   !!!!!!!");

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
			
			var parameterMap={
				"action" : "delete_file",
				"file_name" : file};

			theMaster.__fileBrowser.getActions().launchAction(parameterMap);
		},
		
		
		
		__loadWindows : function ()
		{
this.debug("------->>>   theMaster.__loadWindows : function()   !!!!!!!");

			//~ use __loadDisplay method of the volViewers

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
		},
		
		__saveWindows : function()
        {
this.debug("------->>>   theMaster.__saveWindows : function()   !!!!!!!");

			//~ use __saveDisplay method of the volViewers
			

			var theMaster = this;
			
			var tools = theMaster.__tools;
			
			var fileBrowser = theMaster.__fileBrowser;
			
			
			//~ create main xml too
			/*
			var xmlContent = '\n';

			for (var key  in theMaster.__curView.__display)
			{
				if (key == 'length' || !theMaster.__curView.__display.hasOwnProperty(key))
				{
						continue;
				}
				var paramAttribute = {value : theMaster.__curView.__display[key] + ""};
				xmlContent += theMaster.__element(key, "", paramAttribute) + '\n';
				theMaster.debug(key + " : " + theMaster.__curView.__display[key]);
			}
			
			var parameterMap = {
					"action" : "save_xml_file",
					"file_name" : "savedDisplay.xml",
					"xmlData" : theMaster.__element('display', xmlContent)
				};
			if(tools.getSessionDirectory()!=null)
			{
				parameterMap.output_directory = tools.getSessionDirectory();
			}
			else
			{
				parameterMap.output_directory = theMaster.__file.substring(0,theMaster.__file.lastIndexOf('/'));
			}
			fileBrowser.getActions().launchAction(parameterMap, callback);
			*/
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
		}
		
		
		
		
		
		// add the "add oriented view" function  usable by the volView instances and the segTools windows !!!
		
		
		
		
		
		
	} //// END of   members :
	
	
	
	
	
	
	
}); //// END of   qx.Class.define("desk.volMaster",

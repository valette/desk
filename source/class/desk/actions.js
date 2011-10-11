qx.Class.define("desk.actions", 
{
	extend : qx.core.Object,

	construct : function(fileBrowser)
	{
		this.base(arguments);
		desk.actions.ACTIONSHANDLER=this;
		this.__actionMenu = new qx.ui.menu.Menu;
		this.populateActionMenu();
//		this.__menuButton=new qx.ui.menu.Button("Actions", null , null, this.__actionMenu);

		function getParameter( parameterName )
		{
		  parameterName = parameterName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		  var regexS = "[\\?&]"+parameterName+"=([^&#]*)";
		  var regex = new RegExp( regexS );
		  var results = regex.exec( window.location.href );
		  if( results == null )
			return null;
		  else
			return results[1];
		}

		if (fileBrowser!=null)
			this.__fileBrowser=fileBrowser;
		else
			this.__fileBrowser=new desk.fileBrowser(null ,getParameter("rootDir"));				

		var ongoingActions = new qx.ui.form.List().set({
			width: 200
	//		height: 400
		});
		this.__ongoingActions=ongoingActions;
		qx.core.Init.getApplication().getRoot().add(ongoingActions, { right : 0, top : 0});
		return this;
	},

	statics : {
		ACTIONHANDLER : null
	},

	members : {
		__actionsFile : "/visu/desk/actions.xml",
		__actionMenu : null,
		__actions : null,
		__fileBrowser : null,
		__ongoingActions : null,

		__actionsList : null,

		_currentFileBrowser : null,

		openActionsMenu : function(e, fileBrowser)
		{
			this.__currentFileBrowser=fileBrowser;
			this.__actionMenu.open();
			this.__actionMenu.placeToMouse(e);
			this.__actionMenu.show();
		},

		launchAction : function (actionParameters, successCallback, context)
		{
			var actionNotification=new qx.ui.basic.Label(actionParameters["action"]);
			this.__ongoingActions.add(actionNotification);
			var req = new qx.io.request.Xhr();

			function onSuccess (e){
					var req = e.getTarget();
					var response=req.getResponseText();
					var splitResponse=response.split("\n");
					
					var executionStatus=splitResponse[splitResponse.length-2].split(" ")[0];
					if ((executionStatus!="OK")&&(executionStatus!="CACHED"))
					{
						alert ("error for action "+actionParameters.action+": \n"+splitResponse[0]);
					}

				this.__ongoingActions.remove(actionNotification);
				if (successCallback!=null)
				{
					if (context!=null)
						successCallback.call(context,e);
					else
						successCallback(e);
				}
			}

			req.setUrl("/visu/desk/php/actions.php");
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData(actionParameters);
			req.addListener("success", onSuccess, this);
			req.send();
		},

		populateActionMenu : function()
		{
			var xmlhttp=new XMLHttpRequest();
			xmlhttp.open("GET",this.__actionsFile+"?nocache=" + Math.random(),false);
			xmlhttp.send();
			this.__actions=xmlhttp.responseXML;
			var actions=this.__actions.getElementsByTagName("action");
			var actionMenu=this;

			for (var n=0;n<actions.length;n++)
			{
				var action=actions[n];
				var actionName=action.getAttribute("name");
				var button=new qx.ui.menu.Button(actionName);
				var descriptions=action.getElementsByTagName("description");
				var tooltip=new qx.ui.tooltip.ToolTip("hello");
				button.setToolTip(tooltip);//descriptions[0].nodeValue);
				if (descriptions.length>0)
				{
			//		button.setToolTipText("hello");//descriptions[0].nodeValue);
//					if (n==0)
		//				alert (descriptions[0]);
				}

				button.addListener("click", function (e){
					actionMenu.createActionWindow(this.getLabel(), null, actionMenu.__currentFileBrowser);});
				this.__actionMenu.add(button);
			}
		},

		createActionWindowFromURL : function (fileURL)
		{
			var req = new qx.io.request.Xhr(fileURL+"?nocache=" + Math.random());
			req.addListener("success", function(e) {
				var req = e.getTarget();
				var parametersText=req.getResponseText();
				var parameters=[];
				var splitParameters=parametersText.split("\n");
				for (var i=0 ; i!=splitParameters.length;i++)
				{
					var splitString=splitParameters[i].split("=");
					parameters[splitString[0]]=splitString[1];
				}
				this.createActionWindow(parameters["action"],parameters);
			}, this);
			req.send();
		},

		createActionWindow : function (actionName, providedParameters, fileBrowser)
		{
			var action=this.__actions.getElementsByName(actionName)[0];

			var actionWindow=new qx.ui.window.Window();
			actionWindow.setLayout(new qx.ui.layout.HBox());
			var pane = new qx.ui.splitpane.Pane("horizontal");
			var embededFileBrowser=null;

//			actionWindow.setHeight(300);
			actionWindow.setWidth(300);
			actionWindow.setShowClose(true);
			actionWindow.setShowMinimize(false);
			actionWindow.setUseMoveFrame(true);
			actionWindow.setCaption(action.getAttribute("name"));

			var parametersBox = new qx.ui.container.Composite;
			parametersBox.setLayout(new qx.ui.layout.VBox());
			pane.add(parametersBox);
			actionWindow.add(pane, {flex : 1});

			var logFileURL=null;
			var showLogButton=new qx.ui.form.Button("Show console log");
			showLogButton.addListener("execute",function (e) {
				var logViewer=new desk.textEditor(logFileURL);
				})
			showLogButton.setVisibility("excluded");

			var outputDirectory=null;
			if (providedParameters)
			{
				outputDirectory=providedParameters["output_directory"];
				if (outputDirectory)
				{
					embededFileBrowser=new desk.fileBrowser(pane,outputDirectory);
					actionWindow.setWidth(600);
					logFileURL=embededFileBrowser.getFileURL(outputDirectory+"/action.log");
					showLogButton.setVisibility("visible");
				}
			}
			
			// create the form manager
			var manager = new qx.ui.form.validation.Manager();
			actionWindow.open();

			var intValidator = function(value, item) {
				var parameterName=this.getAttribute("name");
				if ((value==null) || (value==""))
				{
					if (this.getAttribute("required")=="true")
					{
						item.setInvalidMessage("\""+parameterName+"\" is empty");
						return (false);
					}
				}
				else if ( (parseInt(value)!=parseFloat(value))||
						 isNaN(value)){
					item.setInvalidMessage("\""+parameterName+"\" should be an integer");
					return (false);
				}
				return (true);
				};

			var floatValidator = function(value, item) {
				var parameterName=this.getAttribute("name");
				if ((value==null) || (value==""))
				{
					if (this.getAttribute("required")=="true")
					{
						item.setInvalidMessage("\""+parameterName+"\" is empty");
						return (false);
					}
				}
				else if (isNaN(value)){
					item.setInvalidMessage("\""+parameterName+"\" should be a number");
					return (false);
				}
				return (true);
				};

			var stringValidator = function(value, item) {
				var parameterName=this.getAttribute("name");
				if ((value==null) || (value==""))
				{
					if (this.getAttribute("required")=="true")
					{
						item.setInvalidMessage("\""+parameterName+"\" is empty");
						return (false);
					}
				}
				else if (value.split(" ").length!=1){
					item.setInvalidMessage("\""+parameterName+"\" should contain no space characters");
					return (false);
				}
				return (true);
				};
				var dummyValidator = function(value, item) {return (true)};

			var fileAlreadyPickedFromBrowser=false;

			var parameters=action.getElementsByTagName("parameter");
			actionWindow.setHeight(100+50*parameters.length);
			for (var i=0;i<(parameters.length);i++)
			{
				var parameter=parameters[i];
				var parameterName=parameter.getAttribute("name");
				parametersBox.add(new qx.ui.basic.Label(parameterName));
				var parameterForm=new qx.ui.form.TextField();
				parameterForm.setPlaceholder(parameterName);
				parametersBox.add(parameterForm);
				var parameterType=parameter.getAttribute("type");

				switch (parameterType)
				{
				case "int":
					manager.add(parameterForm, intValidator, parameter);
					break;
				case "string":
					manager.add(parameterForm, stringValidator, parameter);
					break;
				case "float":
					manager.add(parameterForm, floatValidator, parameter);
					break;
				case "file":
					if ((!fileAlreadyPickedFromBrowser) && (fileBrowser!=null))
					{
						fileAlreadyPickedFromBrowser=true;
						parameterForm.setValue(fileBrowser.getNodeFile(
							fileBrowser.getSelectedNode()));
					}
					parameterForm.setDroppable(true);
					parameterForm.addListener("drop", function(e) {
							var fileBrowser=e.getData("fileBrowser");
							var fileNode=fileBrowser.getSelectedNode();
 							this.setValue(fileBrowser.getNodeFile(fileNode));
						}, parameterForm);

					manager.add(parameterForm, stringValidator, parameter);
					break;
				case "directory":
					parameterForm.setDroppable(true);
					parameterForm.addListener("drop", function(e) {
							var fileBrowser=e.getData("fileBrowser");
							var fileNode=fileBrowser.getSelectedNode();
 							this.setValue(fileBrowser.getNodeFile(fileNode));
						}, parameterForm);

					manager.add(parameterForm, stringValidator, parameter);
					break;
				case "xmlcontent":
					manager.add(parameterForm, dummyValidator, parameter);
					break;
				default :
						alert("no validator implemented for type : "+parameterType);
				}

				//use default value if provided
				var defaultValue=parameter.getAttribute("default");
				if (defaultValue)
					parameterForm.setValue(defaultValue);

				if (providedParameters!=null)
				{
					var providedParameterValue=providedParameters[parameterName];
					if (providedParameterValue!=null)
						parameterForm.setValue(providedParameterValue);
				}

				parameterForm.addListener("input", function(e) 
					{this.setInvalidMessage(null);},parameterForm);
			}

			var executeBox = new qx.ui.container.Composite;
			executeBox.setLayout(new qx.ui.layout.HBox(10));
			parametersBox.add(executeBox);//, {flex:1});

			var send = new qx.ui.form.Button("Process");
			executeBox.add(send);//, {left: 20, top: 215});
			send.addListener("execute", function() {
				// return type can not be used because of async validation
				manager.validate()
				}, this);

			var forceUpdateCheckBox = new qx.ui.form.CheckBox("force");
//			var executionStatus=new qx.ui.basic.Label();
			var executionStatus=new qx.ui.form.TextField().set({
				readOnly: true});

			executeBox.add(forceUpdateCheckBox);
			executeBox.add(executionStatus);
			parametersBox.add(showLogButton, {flex : 1});

			// add a listener to the form manager for the validation complete
			manager.addListener("complete", function() {
				// check the validation status
				if (manager.getValid()) {
					// configure the send button
					send.setEnabled(false);
					send.setLabel("Processing...");
					var parameterMap={"action" : actionName};
					var items=manager.getItems();
					// add all parameters
					for (var i=0;i<items.length;i++)
					{
						var currentItem=items[i];
						var value=currentItem.getValue();
						if (value!=null)
							parameterMap[currentItem.getPlaceholder()]=value;
					}

					// add output directory if provided
					if (outputDirectory!=null)
						parameterMap["output_directory"]=outputDirectory;

					// add the value of the "force update" checkbox
					parameterMap["force_update"]=forceUpdateCheckBox.getValue();
					executionStatus.setValue("Processing...");

					function getAnswer (e)
					{
						// configure the send button
						send.setEnabled(true);
						send.setLabel("Update");

						var req = e.getTarget();
						var response=req.getResponseText();
						showLogButton.setVisibility("visible");
						var splitResponse=response.split("\n");
						outputDirectory=splitResponse[0];
						executionStatus.setValue(splitResponse[splitResponse.length-2]);
						if (action.getAttribute("void")!="true")
						{
							if (embededFileBrowser==null)
							{
								//display the results directory
								embededFileBrowser=new desk.fileBrowser(pane,outputDirectory);
								actionWindow.setWidth(600);
								logFileURL=embededFileBrowser.getFileURL(outputDirectory+"/action.log");
								showLogButton.setVisibility("visible");
							}
							embededFileBrowser.updateRoot();
						}

					}
					this.launchAction (parameterMap, getAnswer, this)
				} else {
					alert(manager.getInvalidMessages().join("\n"));
				}
				}, this);
		}
	}
});

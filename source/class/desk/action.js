qx.Class.define("desk.action", 
{
	extend : qx.ui.container.Composite,

	construct : function (actionName, standalone)
	{
		this.base(arguments);
		var actions=desk.actions.ACTIONSHANDLER;
		this.__action=actions.getActionXMLElement(actionName);
		this.__actionName=actionName;
		if (standalone==false)
			this.__standalone=false;
		this.__connections=[];

		return (this);
	},

	properties : {
		outputSubdirectory : { init : null}
	},

	events : {
		// the "changeOutputDirectory" event is fired whenever __outputDirectory is changed
		"changeOutputDirectory" : "qx.event.type.Event",

		"actionUpdated" : "qx.event.type.Event"
	},

	members : {

		__connections : null,

		__outputDirectory : null,

		__dependencies : null,

		__action : null,

		__actionName : null,

		__providedParameters : null,

		__loadedParameters : null,

		__fileBrowser : null,

		__standalone : true,

		__window : null,

		__validationManager : null,

		__embededFileBrowser : null,

		connect : function (parameterName, parentAction, fileName) {
			if (parentAction==this)
			{
				console.log("error : trying to connect to myself...");
				return;
			}
				
			this.__connections.push({
					action : parentAction,
					parameter : parameterName,
					file : fileName});
		},

		setOutputDirectory : function (directory) {
			this.__outputDirectory=directory;
			// try to load parameters on server

			var req = new qx.io.request.Xhr(desk.actions.BASEURL+
						this.getOutputDirectory()+"/action.par?nocache=" + Math.random());
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
				this.__loadedParameters=parameters;
				this.__updateUIParameters();
			}, this);
			req.send();
			this.fireEvent("changeOutputDirectory");
		},

		__updateUIParameters : function () {
			var manager=this.__validationManager;
			if (manager!=null) {
				var parameters=this.__loadedParameters;
				var items=manager.getItems();
				var hideProvidedParameters=false;
				function changeParameters() {
					for (var i=0;i!=items.length;i++) {
						var item=items[i];
						var parameterName=item.getPlaceholder();
						var parameterValue=parameters[parameterName];
						if (parameterValue!=null)
						{
							item.setValue(parameterValue);
							if (hideProvidedParameters)
							{
								item.setVisibility("excluded");
								item.getUserData("label").setVisibility("excluded");
							}
						}
					}
				}
				if (parameters!=null)
					changeParameters();

				hideProvidedParameters=!this.__standalone;
				parameters=this.__providedParameters;
				if (parameters!=null)
					changeParameters();
			}
		},

		getOutputDirectory : function () {
			var subDir=this.getOutputSubdirectory();
			if (subDir!=null)
				return this.__outputDirectory+"/"+subDir;
			else
				return this.__outputDirectory;
		},

		setActionParameters : function (parameters)
		{
			this.__providedParameters=parameters;
			this.__updateUIParameters();
		},

		setOriginFileBrowser : function (fileBrowser)
		{
			this.__fileBrowser=fileBrowser;
		},

		executeAction : function()
		{
			this.__validationManager.validate();
		},

		buildUI : function () {
			var action=this.__action;
			this.setLayout(new qx.ui.layout.VBox());

			var myAction=this;
			var pane = null;

			if (this.__standalone)
			{
				this.__window=new qx.ui.window.Window();
				this.__window.setLayout(new qx.ui.layout.HBox());

		//			this.__window.setHeight(300);
				this.__window.setWidth(300);
				this.__window.setShowClose(true);
				this.__window.setShowMinimize(false);
				this.__window.setUseMoveFrame(true);
				this.__window.setCaption(action.getAttribute("name"));
				
				pane=new qx.ui.splitpane.Pane("horizontal");
				pane.add(this);
				this.__window.add(pane, {flex : 1});
			}

			var logFileURL=null;
			var showLogButton=new qx.ui.form.Button("Show console log");
			showLogButton.addListener("execute",function (e) {
				var logViewer=new desk.textEditor(logFileURL);
				})
			showLogButton.setVisibility("excluded");

			var outputDirectory=null;
			if (this.__providedParameters)
			{
				outputDirectory=this.__providedParameters["output_directory"];
				if (outputDirectory)
				{
					if (this.__standalone)
					{
						this.__window.setWidth(600);
						this.__embededFileBrowser=new desk.fileBrowser(outputDirectory, false);
						pane.add(this.__embededFileBrowser, 1);
					}
					logFileURL=desk.actions.BASEURL+outputDirectory+"/action.log";
					showLogButton.setVisibility("visible");
				}
			}
		
			// create the form manager
			var manager = new qx.ui.form.validation.Manager();
			this.__validationManager=manager;
			if (this.__standalone)
				this.__window.open();

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
			if (this.__standalone)
				this.__window.setHeight(100+50*parameters.length);

			var connections=this.__connections;
			for (var i=0;i<(parameters.length);i++)
			{
				var parameter=parameters[i];
				var parameterName=parameter.getAttribute("name");

				var found=false;
				for (var j=0;j<connections.length;j++)
				{
					if (connections[j].parameter==parameterName)
					{
						found=true;
						break;
					}
				}

				if (!found)
				{
					var label=new qx.ui.basic.Label(parameterName);
					this.add(label);
					var parameterForm=new qx.ui.form.TextField();
					parameterForm.setUserData("label", label);
					parameterForm.setPlaceholder(parameterName);
					this.add(parameterForm);
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
						if ((!fileAlreadyPickedFromBrowser) && (this.__fileBrowser!=null))
						{
							fileAlreadyPickedFromBrowser=true;
							parameterForm.setValue(this.__fileBrowser.getNodeFile(
								this.__fileBrowser.getSelectedNode()));
						}
						parameterForm.setDroppable(true);
						parameterForm.addListener("drop", function(e) {
								var origin_fileBrowser=e.getData("fileBrowser");
								var fileNode=origin_fileBrowser.getSelectedNode();
								this.setValue(origin_fileBrowser.getNodeFile(fileNode));
							}, parameterForm);

						manager.add(parameterForm, stringValidator, parameter);
						break;
					case "directory":
						parameterForm.setDroppable(true);
						parameterForm.addListener("drop", function(e) {
								var origin_fileBrowser=e.getData("fileBrowser");
								var fileNode=origin_fileBrowser.getSelectedNode();
								this.setValue(origin_fileBrowser.getNodeFile(fileNode));
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

					parameterForm.addListener("input", function(e) 
						{this.setInvalidMessage("");},parameterForm);
				}
			}

			this.__updateUIParameters();

			var executeBox = new qx.ui.container.Composite;
			executeBox.setLayout(new qx.ui.layout.HBox(10));
			this.add(executeBox);

			var send = new qx.ui.form.Button("Process");
			executeBox.add(send);
			send.addListener("execute", function() {
				manager.validate();}, this);

			var forceUpdateCheckBox = new qx.ui.form.CheckBox("force");
			var executionStatus=new qx.ui.form.TextField().set({
				readOnly: true});

			executeBox.add(forceUpdateCheckBox);
			executeBox.add(executionStatus);
			this.add(showLogButton, {flex : 1});

			// add a listener to the form manager for the validation complete
			manager.addListener("complete", function() {
				// check the validation status
				if (manager.getValid()) {
					// configure the send button
					send.setEnabled(false);
					send.setLabel("Updating Parents...");

					var parameterMap={"action" : this.__actionName};
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


					// update parent Actions
					var parentActions=[];
					for (var i=0;i<connections.length;i++)
					{
						var parentAction=connections[i].action;
						var found=false;
						for (var j=0;j<parentActions.length;j++)
						{
							if (parentActions[j]==parentAction)
							{
								found=true;
								break;
							}
						}
						if (!found)
							parentActions.push(parentAction);
					}
					var numberOfFinishedParentActions=parentActions.length;
					
					function afterParentActionProcessed (event){
						numberOfFinishedParentActions++;
						if (event)
						{
							var finishedAction=event.getTarget();
							//locate action in connections array
							for (var i=0;i<connections.length;i++)
							{
								var currentConnection=connections[i];
								if (currentConnection.action==finishedAction)
								{
									var currentParameter=currentConnection.parameter;
									var currentFile=currentConnection.file;
									parameterMap[currentParameter]=
										currentConnection.action.getOutputDirectory()+"/"+currentFile;
								}
							}
						}
						if (numberOfFinishedParentActions>=parentActions.length)
						{
							send.setLabel("Processing...");
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
									if (this.__standalone)
									{
										//display the results directory
										if (this.__embededFileBrowser==null)
										{
											this.__window.setWidth(600);
											this.__embededFileBrowser=new desk.fileBrowser(outputDirectory, false);
											pane.add(this.__embededFileBrowser, 1);
										}
										else
											this.__embededFileBrowser.updateRoot();
									}
									logFileURL=desk.actions.BASEURL+outputDirectory+"/action.log";
									showLogButton.setVisibility("visible");
								}
								this.fireEvent("actionUpdated");
							}

							var out=this.getOutputDirectory();
							if (out)
								parameterMap["output_directory"]=out;
				

							function launchAction()
							{
								desk.actions.ACTIONSHANDLER.launchAction (parameterMap, getAnswer, myAction);
							}

							if (this.getOutputSubdirectory()==null)
								launchAction();
							else
								desk.actions.ACTIONSHANDLER.launchAction({
									"action" : "add_subdirectory",
									"subdirectory_name" : this.getOutputSubdirectory(),
									"output_directory" : this.__outputDirectory}, launchAction, myAction);
						}
					}

					if (parentActions.length>0)
					{
						for (var i=0;i!=parentActions.length;i++)
						{
							var currentParentAction=parentActions[i];
							currentParentAction.addListenerOnce("actionUpdated", afterParentActionProcessed, this);
							currentParentAction.executeAction();
						}
					}
					else
						afterParentActionProcessed.apply(this);

				} else {
					alert(manager.getInvalidMessages().join("\n"));
				}
				}, this);
		}

	}
});

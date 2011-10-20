qx.Class.define("desk.action", 
{
	extend : qx.ui.container.Composite,

	construct : function (actionName, standalone)
	{
		this.base(arguments);
		var actions=desk.actions.ACTIONSHANDLER;
		this.__action=actions.getActionsXMLElement().getElementsByName(actionName)[0];
		this.__actionName=actionName;
		if (standalone==false)
			this.__standalone=false;

		return (this);
	},

	members : {
		__action : null,

		__actionName : null,

		__providedParameters : null,

		__fileBrowser : null,

		__standalone : true,

		__window : null,

		setActionParameters : function (parameters)
		{
			this.__providedParameters=parameters;
		},

		setOriginFileBrowser : function (fileBrowser)
		{
			this.__fileBrowser=fileBrowser;
		},

		buildUI : function () {
			var action=this.__action;
			this.setLayout(new qx.ui.layout.VBox());

			var pane = null;
			var embededFileBrowser=null;

			if (this.__standalone)
			{
				console.log("standalone");
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
						embededFileBrowser=new desk.fileBrowser(outputDirectory, false);
						pane.add(embededFileBrowser, {flex : 1});
					}
					logFileURL=desk.actions.BASEURL+outputDirectory+"/action.log";
					showLogButton.setVisibility("visible");
				}
			}
		
			// create the form manager
			var manager = new qx.ui.form.validation.Manager();
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
			for (var i=0;i<(parameters.length);i++)
			{
				var parameter=parameters[i];
				var parameterName=parameter.getAttribute("name");
				this.add(new qx.ui.basic.Label(parameterName));
				var parameterForm=new qx.ui.form.TextField();
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

				if (this.__providedParameters!=null)
				{
					var providedParameterValue=this.__providedParameters[parameterName];
					if (providedParameterValue!=null)
						parameterForm.setValue(providedParameterValue);
				}

				parameterForm.addListener("input", function(e) 
					{this.setInvalidMessage(null);},parameterForm);
			}

			var executeBox = new qx.ui.container.Composite;
			executeBox.setLayout(new qx.ui.layout.HBox(10));
			this.add(executeBox);//, {flex:1});

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
			this.add(showLogButton, {flex : 1});

			// add a listener to the form manager for the validation complete
			manager.addListener("complete", function() {
				// check the validation status
				if (manager.getValid()) {
					// configure the send button
					send.setEnabled(false);
					send.setLabel("Processing...");
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
								if (this.__standalone)
								{
									this.__window.setWidth(600);
									embededFileBrowser=new desk.fileBrowser(outputDirectory, false);
									pane.add(embededFileBrowser, {flex : 1});
								}
								logFileURL=desk.actions.BASEURL+outputDirectory+"/action.log";
								showLogButton.setVisibility("visible");
							}
							embededFileBrowser.updateRoot();
						}

					}
					desk.actions.ACTIONSHANDLER.launchAction (parameterMap, getAnswer, this)
				} else {
					alert(manager.getInvalidMessages().join("\n"));
				}
				}, this);
		}

	}
});

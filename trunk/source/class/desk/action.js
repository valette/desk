qx.Class.define("desk.action", 
{
	extend : qx.ui.container.Composite,

	construct : function (name, standalone)
	{
		this.base(arguments);
		var actions=desk.actions.getInstance();
		this.__actions=actions;
		this.__action=actions.getAction(name);
		this.__actionName=name;
		if (standalone==false) {
			this.__standalone=false;
		}
		this.__connections=[];

		return (this);
	},

	properties : {
		outputSubdirectory : { init : null}
	},

	statics :
	{
		CREATEFROMFILE : function (file)
		{
			var req = new qx.io.request.Xhr(desk.FileSystem.getInstance().getFileURL(file)+"?nocache=" + Math.random());
			req.addListenerOnce("success", function(e) {
				var parameters=JSON.parse(e.getTarget().getResponseText());
				var action=new desk.action (parameters["action"]);
				action.setActionParameters(parameters);
				action.buildUI();
			});
			req.send();
		}
	},

	events : {
		// the "changeOutputDirectory" event is fired whenever __outputDirectory is changed
		"changeOutputDirectory" : "qx.event.type.Event",

		"actionUpdated" : "qx.event.type.Event"
	},

	members : {
		__tabView : null,

		__actions : null,

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
			var req = new qx.io.request.Xhr(desk.FileSystem.getInstance().getFileURL(this.getOutputDirectory())+"action.json?nocache=" + Math.random());
			req.addListener("success", function(e) {
				this.__loadedParameters=JSON.parse(e.getTarget().getResponseText());
				
				this.__updateUIParameters();
				if (this.__tabView) {
					this.__addOutputTab();
				}
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
						if (parameterValue!=null) {
							item.setValue(parameterValue);
							if (hideProvidedParameters)
							{
								item.setVisibility("excluded");
								item.getUserData("label").setVisibility("excluded");
							}
						}
					}
				}
				if (parameters!=null) {
					changeParameters();
				}

				hideProvidedParameters=!this.__standalone;
				parameters=this.__providedParameters;
				if (parameters!=null) {
					changeParameters();
				}
			}
		},

		getOutputDirectory : function () {
			var directory = this.__outputDirectory;
			if (directory == null) {
				return null;
			}

			var subDir=this.getOutputSubdirectory();
			if ( subDir != null ) {
				directory += '/' + subDir;
			}

			if ( directory.charAt( directory.length - 1 ) != '/' ) {
				directory += '/';
			}
			return directory;
		},

		setActionParameters : function (parameters)
		{
			this.__providedParameters=parameters;
			var outputDirectory=parameters.output_directory;
			if (typeof outputDirectory == "string")	{
				this.__outputDirectory=outputDirectory;
			}
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

		getTabView : function () {
			if ( this.__tabView != null ) {
				return this.__tabView;
			}
			var tabView = this.__tabView = new qx.ui.tabview.TabView ();
			var page = new qx.ui.tabview.Page("Input");
			page.setLayout(new qx.ui.layout.HBox());
			page.add(this, {flex : 1});
			tabView.add(page);
			return tabView;
		},

		__addOutputTab : function () {
			if ( this.__embededFileBrowser != null ) {
				return;
			}
			var outputDirectory = this.getOutputDirectory();
			this.__embededFileBrowser = new desk.fileBrowser( outputDirectory , false );
			this.__embededFileBrowser.setUserData( "action" , this );
			var page = new qx.ui.tabview.Page("Output");
			page.setLayout(new qx.ui.layout.HBox());
			page.add( this.__embededFileBrowser , { flex : 1 } );
			this.__tabView.add( page );

			this.addListener( "actionUpdated" , function () {
				this.__embededFileBrowser.updateRoot();
			} , this );
			this.addListener("changeOutputDirectory", function () {
				this.__embededFileBrowser.updateRoot();
			} , this );
		},

		buildUI : function () {
			var action=this.__action;
			this.setLayout(new qx.ui.layout.VBox());

			var that=this;

			if (this.__standalone) {
				this.__window=new qx.ui.window.Window();
				this.__window.setLayout(new qx.ui.layout.HBox());
				this.__window.setWidth(300);
				this.__window.setShowClose(true);
				this.__window.setShowMinimize(false);
				this.__window.setUseMoveFrame(true);
				this.__window.setCaption(action.name);
				this.__window.add(this.getTabView(), {flex : 1});
			}

			var logFile=null;
			var showLogButton=new qx.ui.form.Button("Show console log");
			showLogButton.addListener("execute",function (e) {
				new desk.textEditor(logFile);
				})
			showLogButton.setVisibility("excluded");

			var outputDirectory=null;
			if (this.__providedParameters) {
				outputDirectory=this.__providedParameters["output_directory"];
				if (outputDirectory) {
					if (this.__standalone) {
						this.__addOutputTab();
					}
					logFile=outputDirectory+"/action.log";
					showLogButton.setVisibility("visible");
				}
			}

			// create the form manager
			var manager = new qx.ui.form.validation.Manager();
			this.__validationManager=manager;
			if (this.__standalone) {
				this.__window.open();
			}

			var intValidator = function(value, item) {
				var parameterName=this.name;
				if ((value==null) || (value=="")) {
					if (this.required=="true") {
						item.setInvalidMessage("\""+parameterName+"\" is empty");
						return (false);
					}
				}
				else if ( (parseInt(value)!=parseFloat(value))||
						 isNaN(value)) {
					item.setInvalidMessage("\""+parameterName+"\" should be an integer");
					return (false);
				}
				return (true);
			};

			var floatValidator = function(value, item) {
				var parameterName=this.name;
				if ((value==null) || (value=="")) {
					if (this.required =="true") {
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
				var parameterName=this.name;
				if ((value==null) || (value=="")) {
					if (this.required =="true") {
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

			var parameters=action.parameters;
			if (this.__standalone) {
				this.__window.setHeight(100+50*parameters.length);
			}

			var connections=this.__connections;
			for (var i=0;i<(parameters.length);i++) {
				var parameter=parameters[i];
				if (parameter.text != undefined) {
					continue;
				}

				var parameterName=parameter.name;
				var found=false;
				for (var j=0;j<connections.length;j++) {
					if (connections[j].parameter==parameterName) {
						found=true;
						break;
					}
				}

				if (!found) {
					var label=new qx.ui.basic.Label(parameterName);
					this.add(label);
					var parameterForm=new qx.ui.form.TextField();
					parameterForm.setUserData("label", label);
					parameterForm.setPlaceholder(parameterName);
					this.add(parameterForm);
					var parameterType=parameter.type;

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
						if ((!fileAlreadyPickedFromBrowser) && (this.__fileBrowser!=null)) {
							fileAlreadyPickedFromBrowser=true;
							var fileNode=this.__fileBrowser.getSelectedNode();
							parameterForm.setValue(this.__fileBrowser.getNodeFile(fileNode));
							var parentAction=this.__fileBrowser.getUserData("action");
							if (parentAction!=null) {
								that.connect(parameterForm.getPlaceholder(),parentAction,fileNode.label);
							}
						}
						parameterForm.setDroppable(true);
						parameterForm.addListener("drop", function(e) {
								var originFileBrowser=e.getData("fileBrowser");
								var fileNode=originFileBrowser.getSelectedNode();
								this.setValue(originFileBrowser.getNodeFile(fileNode));
								var parentAction=originFileBrowser.getUserData("action");
								if (parentAction!=null) {
									that.connect(this.getPlaceholder(),parentAction,fileNode.label);
								}
							}, parameterForm);

						manager.add(parameterForm, stringValidator, parameter);
						break;
					case "directory":
						parameterForm.setDroppable(true);
						parameterForm.addListener("drop", function(e) {
							if (e.supportsType("fileBrowser")) {
								var origin_fileBrowser=e.getData("fileBrowser");
								var fileNode=origin_fileBrowser.getSelectedNode();
								this.setValue(origin_fileBrowser.getNodeFile(fileNode));
							}
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
					var defaultValue=parameter.defaultValue;
					if (defaultValue)  {
						parameterForm.setValue(defaultValue);
					}

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
					for (var i=0;i<items.length;i++) {
						var currentItem=items[i];
						var value=currentItem.getValue();
						if (value!=null) {
							parameterMap[currentItem.getPlaceholder()]=value;
						}
					}

					// add output directory if provided
					if (outputDirectory!=null) {
						parameterMap["output_directory"]=outputDirectory;
					}

					// add the value of the "force update" checkbox
					parameterMap["force_update"]=forceUpdateCheckBox.getValue();
					executionStatus.setValue("Processing...");

					// update parent Actions
					var parentActions=[];
					for (var i=0;i<connections.length;i++) {
						var parentAction=connections[i].action;
						var found=false;
						for (var j=0;j<parentActions.length;j++) {
							if (parentActions[j]==parentAction) {
								found=true;
								break;
							}
						}
						if (!found) {
							parentActions.push(parentAction);
						}
					}
					var numberOfFinishedParentActions=parentActions.length;
					
					function afterParentActionProcessed (event){
						numberOfFinishedParentActions++;
						if (event) {
							var finishedAction=event.getTarget();
							//locate action in connections array
							for (var i=0;i<connections.length;i++) {
								var currentConnection=connections[i];
								if (currentConnection.action==finishedAction) {
									var currentParameter=currentConnection.parameter;
									var currentFile=currentConnection.file;
									parameterMap[currentParameter]=
										currentConnection.action.getOutputDirectory()+"/"+currentFile;
								}
							}
						}
						if (numberOfFinishedParentActions>=parentActions.length) {
							send.setLabel("Processing...");
							function getAnswer (e)
							{
								// configure the send button
								send.setEnabled(true);
								send.setLabel("Update");

								var req = e.getTarget();
								var response=req.getResponseText();
								var splitResponse=response.split("\n");
								outputDirectory=splitResponse[0];
								if (this.getOutputDirectory()==null) {
									this.setOutputDirectory(outputDirectory);
								}

								executionStatus.setValue(splitResponse[splitResponse.length-2]);
								if ( action.attributes.voidAction != "true" ) {
									if (this.__standalone) {
										//display the results directory
										if (this.__embededFileBrowser==null) {
											this.__addOutputTab();
										}
									}
									logFile=outputDirectory+"/action.log";
									showLogButton.setVisibility("visible");
								}
								this.fireEvent("actionUpdated");
							}

							var out=this.getOutputDirectory();
							if (out) {
								parameterMap["output_directory"]=out;
							}
				

							function launchAction()
							{
								desk.actions.getInstance().launchAction (parameterMap, getAnswer, that);
							}

							if (this.getOutputSubdirectory()==null) {
								launchAction();
							}
							else {
								desk.actions.getInstance().launchAction({
									"action" : "add_subdirectory",
									"subdirectory_name" : this.getOutputSubdirectory(),
									"output_directory" : this.__outputDirectory}, launchAction, that);
							}
						}
					}

					if (parentActions.length>0) {
						for (var i=0;i!=parentActions.length;i++) {
							var currentParentAction=parentActions[i];
							currentParentAction.addListenerOnce("actionUpdated", afterParentActionProcessed, this);
							currentParentAction.executeAction();
						}
					}
					else {
						afterParentActionProcessed.apply(this);
					}

				}
				else {
					alert(manager.getInvalidMessages().join("\n"));
				}
			}, this);
		}

	}
});

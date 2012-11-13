/**
 * A container to launch RPC actions and edit parameters
 */
qx.Class.define("desk.Action", 
{
	extend : qx.ui.container.Composite,

	/**
	* Creates a new container
	* @param name {String} name of the action to create
	* @param standalone {Boolean} defines whether the container should be
	* embedded in a window or not (default : true)
	*/
	construct : function (name, standalone)
	{
		this.base(arguments);
		this.__action = desk.Actions.getInstance().getAction(name);
		this.__name = name;
		if (standalone === false) {
			this.__standalone = false;
		}
		this.__connections = [];

		return (this);
	},

	properties : {
		/**
		* Contains the output sub-directory.
		*/
		outputSubdirectory : {init : null}
	},

	statics :
	{
		/**
		* Creates a new container, with parameters contained in a JSON file
		* @param file {String} .JSON file to get settings from
		*/
		CREATEFROMFILE : function (file)
		{
			desk.FileSystem.readFile(file, function (request) {
				var parameters=JSON.parse(request.getResponseText());
				var action=new desk.Action (parameters.action);
				action.setActionParameters(parameters);
				action.buildUI();
			});
		}
	},

	events : {
		/**
		* Fired whenever the output directory is changed
		*/
		"changeOutputDirectory" : "qx.event.type.Event",

		/**
		* Fired whenever the action has been completed
		*/
		"actionUpdated" : "qx.event.type.Event"
	},

	members : {
		__tabView : null,

		__connections : null,

		__outputDirectory : null,

		__dependencies : null,

		__action : null,

		__name : null,

		__providedParameters : null,

		__loadedParameters : null,

		__fileBrowser : null,

		__standalone : true,

		__window : null,

		__validationManager : null,

		__embededFileBrowser : null,

		/**
		* Connects a parameter to an output file from an other action
		* @param parameterName {String} name of the parameter to set
		* @param parentAction {desk.Action} action to link to
		* @param fileName {string} name of the output file from parentAction
		*/
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

		/**
		* Defines the output directory for the action
		* @param directory {String} target subdirectory
		*/
		setOutputDirectory : function (directory) {
			this.__outputDirectory=directory;
			desk.FileSystem.readFile(this.getOutputDirectory() + 'action.json',
				function(request) {
          if (request.getStatus() === 200 ) {
          this.__loadedParameters=JSON.parse(request.getResponseText());
          this.__updateUIParameters();
          if (this.__tabView) {
            this.__addOutputTab();
          }
          }
					this.fireEvent("changeOutputDirectory");
				}, this);
		},

		__updateUIParameters : function () {
			var manager = this.__validationManager;
			if (manager !== null) {
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

		/**
		* Returns the action output directory
		* @return {String} output subdirectory
		*/
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

		/**
		* Definet input parameters for the action
		* @param parameters {Object} parameters as JSON object
		*/
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

		/**
		* Triggers the action execution
		*/
		executeAction : function()
		{
			this.__validationManager.validate();
		},

		/**
		* Returns the tabview containing different UI pages
		* @return {qx.ui.tabview.TabView} the tabViex container
		*/
		getTabView : function () {
			if (this.__tabView) {
				return this.__tabView;
			}
			var tabView = this.__tabView = new qx.ui.tabview.TabView ();
			var page = new qx.ui.tabview.Page("Input");
			page.setLayout(new qx.ui.layout.HBox());
			page.add(this, {flex : 1});
			tabView.add(page);
			this.addListenerOnce("actionUpdated", this.__addOutputTab, this);
			return tabView;
		},

		__outputTabTriggered : false,
		__addOutputTab : function () {
			if ((this.__action.attributes.voidAction == "true") ||
					this.__embededFileBrowser || this.__outputTabTriggered) {
				return;
			}
			this.__outputTabTriggered = true;
			var page = new qx.ui.tabview.Page("Output");
			this.__tabView.add( page );
			page.addListenerOnce('appear', function () {
				page.setLayout(new qx.ui.layout.HBox());
				var outputDirectory = this.getOutputDirectory();
				this.__embededFileBrowser = new desk.FileBrowser( outputDirectory , false );
				this.__embededFileBrowser.setUserData( "action" , this );
				page.add( this.__embededFileBrowser , { flex : 1 } );

				this.addListener( "actionUpdated" , function () {
					this.__embededFileBrowser.updateRoot();
				} , this );
				this.addListener("changeOutputDirectory", function () {
					this.__embededFileBrowser.updateRoot();
				} , this );
			}, this);
		},

		__updateButton : null,

		__forceUpdateCheckBox : null,

		__executionStatus : null,

		__showLogButton : null,

		__afterValidation : function () {
			var manager = this.__validationManager;
			var send = this.__updateButton;
			var connections=this.__connections;
			var i;

			// check the validation status
			if (manager.getValid()) {
				// configure the send button
				send.setEnabled(false);
				send.setLabel("Updating Parents...");

				var parameterMap={"action" : this.__name};
				var items=manager.getItems();
				// add all parameters
				for (i = 0; i < items.length; i++) {
					var currentItem=items[i];
					var value=currentItem.getValue();
					if (value != null) {
						parameterMap[currentItem.getPlaceholder()]=value;
					}
				}

				// add output directory if provided
				if (this.__outputDirectory != null) {
					parameterMap.output_directory = this.__outputDirectory;
				}

				// add the value of the "force update" checkbox
				parameterMap.force_update = this.__forceUpdateCheckBox.getValue();
				this.__executionStatus.setValue("Processing...");

				// update parent Actions
				var parentActions = [];
				for (i = 0; i < connections.length; i++) {
					var parentAction = connections[i].action;
					var found = false;
					for (var j = 0; j < parentActions.length; j++) {
						if (parentActions[j] == parentAction) {
							found=true;
							break;
						}
					}
					if (!found) {
						parentActions.push(parentAction);
					}
				}
				var numberOfFinishedParentActions = parentActions.length;
				
				function afterParentActionProcessed (event){
					numberOfFinishedParentActions++;
					if (event) {
						var finishedAction = event.getTarget();
						//locate action in connections array
						for (var i = 0; i < connections.length; i++) {
							var currentConnection = connections[i];
							if (currentConnection.action == finishedAction) {
								var currentParameter = currentConnection.parameter;
								var currentFile = currentConnection.file;
								parameterMap[currentParameter] =
									currentConnection.action.getOutputDirectory() + '/' + currentFile;
							}
						}
					}
					if (numberOfFinishedParentActions >= parentActions.length) {
						send.setLabel("Processing...");
						function getAnswer (response) {
							// configure the send button
							send.setEnabled(true);
							send.setLabel("Update");

							if (this.getOutputDirectory() == null) {
								this.setOutputDirectory(response.outputDirectory);
							}

							this.__executionStatus.setValue(response.status);
							if ( this.__action.attributes.voidAction != "true" ) {
								this.__showLogButton.setVisibility("visible");
							}
							this.fireEvent("actionUpdated");
						}

						var out = this.getOutputDirectory();
						if (out) {
							parameterMap.output_directory = out;
						}
			
						var that = this;
						function launchAction() {
							desk.Actions.getInstance().launchAction (parameterMap, getAnswer, that);
						}

						if (this.getOutputSubdirectory() == null) {
							launchAction();
						}
						else {
							desk.FileSystem.exists(that.__outputDirectory + '/' +
								that.getOutputSubdirectory(), function (exists) {
									if (!exists) {
										desk.Actions.getInstance().launchAction({
											"action" : "add_subdirectory",
											"subdirectory_name" : that.getOutputSubdirectory(),
											"output_directory" : that.__outputDirectory}, launchAction, that);								
									} else {
										launchAction();
									}
							});
						}
					}
				}

				if (parentActions.length > 0) {
					for (i = 0; i != parentActions.length; i++) {
						var currentParentAction = parentActions[i];
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
		},

		/**
		* Builds the UI
		*/
		buildUI : function () {
			var action = this.__action;
			this.setLayout(new qx.ui.layout.VBox());

			var that = this;

			if (this.__standalone) {
				this.__window = new qx.ui.window.Window();
				this.__window.set({ layout : new qx.ui.layout.HBox(),
					width : 300,
					showClose :true,
					showMinimize : false,
					useMoveFrame : true,
					caption : that.__name});
				this.__window.add(this.getTabView(), {flex : 1});
			}

			var showLogButton = new qx.ui.form.Button("Show console log");
			this.__showLogButton = showLogButton;
			showLogButton.addListener("execute",function () {
				new desk.TextEditor(this.getOutputDirectory() + "/action.log");
			}, this);
			showLogButton.setVisibility("excluded");

			var outputDirectory = null;
			if (this.__providedParameters) {
				outputDirectory = this.__providedParameters.output_directory;
				if (outputDirectory) {
					if (this.__standalone) {
						this.__addOutputTab();
					}
					showLogButton.setVisibility("visible");
				}
			}

			// create the form manager
			var manager = new qx.ui.form.validation.Manager();
			this.__validationManager = manager;
			if (this.__standalone) {
				this.__window.open();
			}

			var intValidator = function(value, item) {
				var parameterName = this.name;
				if ((value == null) || (value == '')) {
					if (this.required == "true") {
						item.setInvalidMessage('"' + parameterName + '" is empty');
						return (false);
					}
				}
				else if ((parseInt(value, 10) != parseFloat(value)) || isNaN(value)) {
					item.setInvalidMessage('"' + parameterName + '" should be an integer');
					return (false);
				}
				return (true);
			};

			var floatValidator = function(value, item) {
				var parameterName = this.name;
				if ((value == null) || (value == '')) {
					if (this.required =="true") {
						item.setInvalidMessage('"' + parameterName + '" is empty');
						return (false);
					}
				}
				else if (isNaN(value)){
					item.setInvalidMessage('"' + parameterName + '" should be a number');
					return (false);
				}
				return (true);
			};

			var stringValidator = function(value, item) {
				var parameterName = this.name;
				if ((value == null) || (value == '')) {
					if (this.required == "true") {
						item.setInvalidMessage('"' + parameterName + '" is empty');
						return (false);
					}
				}
				else if (value.split(" ").length != 1){
					item.setInvalidMessage('"' + parameterName + '" should contain no space characters');
					return (false);
				}
				return (true);
			};

			var dummyValidator = function(value, item) {return (true);};

			var fileAlreadyPickedFromBrowser = false;

			var parameters = action.parameters;
			if (this.__standalone) {
				this.__window.setHeight(100+50*parameters.length);
			}

			var connections = this.__connections;
			for (var i = 0; i < (parameters.length); i++) {
				var parameter = parameters[i];
				if (parameter.text != undefined) {
					continue;
				}

				var parameterName = parameter.name;
				var found = false;
				for (var j = 0; j < connections.length; j++) {
					if (connections[j].parameter == parameterName) {
						found=true;
						break;
					}
				}

				if (!found) {
					var label = new qx.ui.basic.Label(parameterName);
					this.add(label);
					var parameterForm; 
          var parameterType = parameter.type;
          switch (parameterType)
					{
					case "file":
          case "directory":
            parameterForm = new desk.FileField();
            break;
          default :
            parameterForm = new qx.ui.form.TextField();
            break;
					}
					parameterForm.setUserData("label", label);
					parameterForm.setPlaceholder(parameterName);
					this.add(parameterForm);

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
						if ( !fileAlreadyPickedFromBrowser && (this.__fileBrowser!=null)) {
							fileAlreadyPickedFromBrowser=true;
							var file = this.__fileBrowser.getSelectedFiles()[0];
							parameterForm.setValue(file);
							var parentAction = this.__fileBrowser.getUserData("action");
							if (parentAction != null) {
								that.connect(parameterForm.getPlaceholder(), parentAction, file);
							}
						}
						manager.add(parameterForm, stringValidator, parameter);
						break;
					case "directory":
						manager.add(parameterForm, stringValidator, parameter);
						break;
					case "xmlcontent":
						manager.add(parameterForm, dummyValidator, parameter);
						break;
					default :
						alert("no validator implemented for type : "+parameterType);
					}

					//use default value if provided
					var defaultValue = parameter.defaultValue;
					if (defaultValue)  {
						parameterForm.setValue(defaultValue);
					}

					parameterForm.addListener("input", function(e) {
						this.setInvalidMessage('');
					},parameterForm);
				}
			}

			this.__updateUIParameters();

			var executeBox = new qx.ui.container.Composite();
			executeBox.setLayout(new qx.ui.layout.HBox(10));
			this.add(executeBox);

			var send = new qx.ui.form.Button("Process");
			this.__updateButton = send;
			executeBox.add(send);
			send.addListener("execute", function() {
				manager.validate();
			}, this);

			var forceUpdateCheckBox = new qx.ui.form.CheckBox("force");
			this.__forceUpdateCheckBox = forceUpdateCheckBox;

			this.__executionStatus = new qx.ui.form.TextField().set({
				readOnly: true});

			executeBox.add( forceUpdateCheckBox );
			executeBox.add( this.__executionStatus );
			this.add(showLogButton, {flex : 1});

			// add a listener to the form manager for the validation complete
			manager.addListener("complete", this.__afterValidation, this);
		}
	}
});

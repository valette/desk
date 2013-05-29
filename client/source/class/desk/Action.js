/**
 * A container to launch RPC actions and edit parameters
 * @lint ignoreDeprecated (alert)
 * @ignore (async.each)
 */
qx.Class.define("desk.Action", 
{
	extend : qx.ui.container.Composite,
	/**
	* Creates a new container
	* @param name {String} name of the action to create
	* @param parameters {Object} settings object. Available settings:
    * standalone (boolean): defines whether the container should be
	* embedded in a window or not (default : true).
	*/
	construct : function (name, parameters) {
        parameters = parameters || {};
		this.base(arguments);
		this.__action = desk.Actions.getInstance().getAction(name);
		this.__name = name;
		if (parameters.standalone === false) {
			this.__standalone = false;
		}

        this.__connections = [];
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
		CREATEFROMFILE : function (file) {
			desk.FileSystem.readFile(file, function (err, parameters) {
				var action = new desk.Action (parameters.action);
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
		"actionUpdated" : "qx.event.type.Data",

		/**
		* Fired whenever the action has been completed
		*/
		"actionTriggered" : "qx.event.type.Data"
	},

	members : {
		__actionsCounter : 0,

        __controlsContainer : null,

        __tabView : null,

		__connections : null,

		__outputDirectory : null,

		__action : null,

		__name : null,

		__providedParameters : null,

		__loadedParameters : null,

		__fileBrowser : null,

		__standalone : true,

		__window : null,

		__validationManager : null,

		__embededFileBrowser : null,

        getControlsContainer : function () {
            return this.__controlsContainer;
        },

		/**
		* Connects a parameter to an output file from an other action
		* @param parameterName {String} name of the parameter to set
		* @param parentAction {desk.Action} action to link to
		* @param fileName {string} name of the output file from parentAction
		*/
		connect : function (parameterName, parentAction, fileName) {
			if (parentAction == this) {
				console.log("error : trying to connect to myself...");
				return;
			}
				
			this.__connections.push({
					action : parentAction,
					parameter : parameterName,
					file : fileName			
			});
		},

		/**
		* Defines the output directory for the action
		* @param directory {String} target subdirectory
 		* @param loadJSON {bool} determines whether saved json 
 		* parameters file will be loaded from the output directory (default : true)
		*/
		setOutputDirectory : function (directory, loadJSON) {
			this.__outputDirectory = directory;
            if (!this.getOutputSubdirectory()) {
                return;
            }
            if ((loadJSON === false) || (directory === "cache/")){
				this.fireEvent("changeOutputDirectory");
			} else {
				var jsonFile = this.getOutputDirectory() + 'action.json';
				desk.FileSystem.exists(jsonFile, function (exists) {
					if (exists) {
						desk.FileSystem.readFile(jsonFile,
							function(err, result) {
								if (!err) {
									this.__loadedParameters = result;
									this.__updateUIParameters();
									if (this.__tabView) {
										this.__addOutputTab();
									}
								}
								this.fireEvent("changeOutputDirectory");
						}, this);
					}
				}, this);
			}
        },

		__updateUIParameters : function () {
			var manager = this.__validationManager;
			if (!manager) {
				return;
			}
			function setUIParameters(parameters, hide) {
				if (!parameters) {
					return;
				}
				var items = manager.getItems();
				for (var i = 0; i != items.length; i++) {
					var item = items[i];
					var parameterName = item.getPlaceholder();
					var parameterValue = parameters[parameterName];
					if (parameterValue !== undefined) {
						item.setValue(parameterValue);
						if (hide) {
							item.setVisibility("excluded");
							item.getUserData("label").setVisibility("excluded");
						}
					}

				}
			}
			setUIParameters(this.__loadedParameters, false);
			setUIParameters(this.__providedParameters, !this.__standalone);
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
		* Defines input parameters for the action, which will
        * be hidden in the UI
		* @param parameters {Object} parameters as JSON object
		*/
		setActionParameters : function (parameters) {
			this.__providedParameters = parameters;
			var outputDirectory = parameters.output_directory;
			if (typeof outputDirectory === "string")	{
				this.__outputDirectory = outputDirectory;
			}
			this.__updateUIParameters();
		},

        /**
		* Defines UI input parameters for the action
		* @param parameters {Object} parameters as JSON object
		*/
        setUIParameters : function (parameters) {
			parameters = JSON.parse(JSON.stringify(parameters));
            var keys = Object.keys(parameters);
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var form = this.getForm(key);
                if (form) {
                    form.setValue(parameters[key].toString());
                }
            }
        },

		setOriginFileBrowser : function (fileBrowser) {
			this.__fileBrowser = fileBrowser;
		},

		/**
		* Triggers the action execution
		*/
		executeAction : function() {
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
					this.__embededFileBrowser.updateRoot(this.getOutputDirectory());
				} , this );
				this.addListener("changeOutputDirectory", function () {
					this.__embededFileBrowser.updateRoot(this.getOutputDirectory());
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
			var connections = this.__connections;

			// check the validation status
			if (!manager.getValid()) {
				alert(manager.getInvalidMessages().join("\n"));
				return;
			}
				// configure the send button
			send.setEnabled(false);
			send.setLabel("Updating Parents...");

			var parameterMap = {"action" : this.__name};
			var items = manager.getItems();
			// add all parameters
			for (var i = 0; i < items.length; i++) {
				var currentItem = items[i];
				var value = currentItem.getValue();
				if (typeof value === 'string') {
					if (value.length > 0) {
						parameterMap[currentItem.getPlaceholder()] = value;
					}
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
						found = true;
						break;
					}
				}
				if (!found) {
					parentActions.push(parentAction);
				}
			}

			var self = this;
			async.each(parentActions, 
				function (action, callback) {
					action.addListenerOnce("actionUpdated", function (event) {
						callback();
					});
					action.executeAction();
				},

			function (err) {
				// update parameters from connections
				for (var i = 0; i < connections.length; i++) {
					var connection = connections[i];
					parameterMap[connection.parameter] =
						connection.action.getOutputDirectory() +
							desk.FileSystem.getFileName(connection.file);
				}

				send.setLabel("Processing...");

				var out = self.getOutputDirectory();
				if (out) {
					parameterMap.output_directory = out;
				}

				if (self.__outputDirectory) {
					if (self.__outputDirectory.substring(0,6) === "cache/") {
						parameterMap.output_directory = "cache/";
					}
				}

				self.__createSubdirectory(parameterMap);
			});
		},

		__createSubdirectory : function (parameterMap) {
			var that = this;
			if (!this.getOutputSubdirectory()) {
				afterCreation();
			} else {
				desk.FileSystem.exists(that.__outputDirectory + '/' +
					that.getOutputSubdirectory(), function (exists) {
						if (!exists) {
							desk.Actions.getInstance().launchAction({
									"action" : "add_subdirectory",
									"subdirectory_name" : that.getOutputSubdirectory(),
									"output_directory" : that.__outputDirectory},
							afterCreation);
						} else {
							afterCreation();
						}
				});
			}

			function afterCreation () {
				that.__executeAction(parameterMap);
			}
		},

		__executeAction : function (parameterMap) {
			var actionId = this.__actionsCounter;
			this.__actionsCounter++;
			desk.Actions.getInstance().launchAction (parameterMap,
				afterExecution);
			this.fireDataEvent("actionTriggered", actionId);

			var that = this;

			function afterExecution (response) {
				// configure the send button
				var send = that.__updateButton;
				send.setEnabled(true);
				send.setLabel("Update");
				var currentOutputDir = that.getOutputDirectory();
				if ((currentOutputDir === null) ||
						(currentOutputDir.substring(0, 6) === "cache/")) {
					that.setOutputDirectory(response.outputDirectory);
				}

				that.__executionStatus.setValue(response.status);
				if ( that.__action.attributes.voidAction != "true" ) {
					that.__showLogButton.setVisibility("visible");
				}
				that.fireDataEvent("actionUpdated", actionId);
			}
		},

        __forms : null,

        getForm : function (parameterName) {
            if (this.__forms) {
                return this.__forms[parameterName];
            }
        },


        __intValidator : function(value, item) {
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
		},

		__stringValidator : function(value, item) {
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
		},

		__floatValidator : function(value, item) {
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
		},

		__dummyValidator : function(value, item) {
            return (true);
        },


		/**
		* Builds the UI
		*/
		buildUI : function () {
			var action = this.__action;
			this.setLayout(new qx.ui.layout.VBox(5));

			var scroll = new qx.ui.container.Scroll();
			var parametersContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox(5));
			scroll.add(parametersContainer, {flex : 1});
			this.add(scroll, {flex : 1});

			if (this.__standalone) {
				this.__window = new qx.ui.window.Window();
				this.__window.set({ layout : new qx.ui.layout.HBox(),
					width : 300,
					showClose :true,
					showMinimize : false,
					useMoveFrame : true,
					caption : this.__name});
				this.__window.add(this.getTabView(), {flex : 1});
			}

			var showLogButton = new qx.ui.form.Button("Show console log");
			this.__showLogButton = showLogButton;
			showLogButton.addListener("execute",function () {
				new desk.TextEditor(this.getOutputDirectory() + "action.log");
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

			var fileAlreadyPickedFromBrowser = false;

			var parameters = action.parameters;

            this.__forms = {};

			var connections = this.__connections;
			for (var i = 0; i < (parameters.length); i++) {
				var parameter = parameters[i];
				var parameterName = parameter.name;
				var found = false;
				for (var j = 0; j < connections.length; j++) {
					if (connections[j].parameter == parameterName) {
						found = true;
						break;
					}
				}

				if (!found) {
                    var parameterTooltip = '';
                    if (parameter.text) {
                        continue;
                    }
                    if (parameter.info) {
                        parameterTooltip += parameter.info + '<br>';
                    }
                    if (parameter.min) {
                        parameterTooltip += 'min : ' + parameter.min + '<br>';
                    }
                    if (parameter.max) {
                        parameterTooltip += 'max : ' + parameter.max + '<br>';
                    }
                    if (parameter.defaultValue) {
                        parameterTooltip += 'default : ' + parameter.defaultValue + '<br>';
                    }

                    var label = new qx.ui.basic.Label(parameterName);
					parametersContainer.add(label);
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
                    this.__forms[parameterName] = parameterForm;
					parameterForm.setUserData("label", label);
                    if (parameterTooltip.length) {
                        parameterForm.setToolTipText(parameterTooltip);
                        label.setToolTipText(parameterTooltip);
                    }
					parameterForm.setPlaceholder(parameterName);
					parametersContainer.add(parameterForm);

					switch (parameterType)
					{
					case "int":
						manager.add(parameterForm, this.__intValidator, parameter);
						break;
					case "string":
						manager.add(parameterForm, this.__stringValidator, parameter);
						break;
					case "float":
						manager.add(parameterForm, this.__floatValidator, parameter);
						break;
					case "file":
						if ( !fileAlreadyPickedFromBrowser && (this.__fileBrowser!=null)) {
							fileAlreadyPickedFromBrowser=true;
							var file = this.__fileBrowser.getSelectedFiles()[0];
							parameterForm.setValue(file);
							var parentAction = this.__fileBrowser.getUserData("action");
							if (parentAction) {
								this.connect(parameterForm.getPlaceholder(), parentAction, file);
							}
						}
						manager.add(parameterForm, this.__stringValidator, parameter);
						break;
					case "directory":
						manager.add(parameterForm, this.__stringValidator, parameter);
						break;
					case "xmlcontent":
						manager.add(parameterForm, this.__dummyValidator, parameter);
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
					}, parameterForm);
				}
			}

			this.__updateUIParameters();

			var executeBox = this.__controlsContainer = new qx.ui.container.Composite();
			executeBox.setLayout(new qx.ui.layout.HBox(10));
			this.add(executeBox);

			var send = new qx.ui.form.Button("Process");
			this.__updateButton = send;
			executeBox.add(send, {flex : 1});
			send.addListener("execute", function() {
				manager.validate();
			}, this);

			var forceUpdateCheckBox = new qx.ui.form.CheckBox("force");
			this.__forceUpdateCheckBox = forceUpdateCheckBox;

			this.__executionStatus = new qx.ui.form.TextField().set({
				readOnly: true});

			executeBox.add(forceUpdateCheckBox, {flex : 1});
			executeBox.add(this.__executionStatus, {flex : 1});
			this.add(showLogButton);

			// add a listener to the form manager for the validation complete
			manager.addListener("complete", this.__afterValidation, this);

            if (this.__standalone) {
				this.__window.open();
                this.__window.center();
			}
        }
	}
});

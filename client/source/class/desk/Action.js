/**
 * A container to launch RPC actions and edit parameters
 * @lint ignoreDeprecated (alert)
 * @ignore (async.each)
 * @ignore (_.*)
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
		this.base(arguments);
		this.__action = desk.Actions.getInstance().getAction(name);
		this.__name = name;
		if (parameters && parameters.standalone === false) {
			this.__standalone = false;
		}

        this.__connections = [];
	},

	properties : {
		/** disable caching*/
		forceUpdate : { init : false, check: "Boolean", event : "changeForceUpdate"}
	},

	statics : {
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
		* Fired whenever the action has been triggered
		*/
		"actionTriggered" : "qx.event.type.Data"
	},

	members : {
		__actionsCounter : 0,

        __controls : null,

        __tabView : null,

		__connections : null,

		__outputDir : null,

		__action : null,

		__name : null,

		__providedParameters : null,

		__loadedParameters : null,

		__standalone : true,

		__window : null,

		__manager : null,

		__fileBrowser : null,

        getControlsContainer : function () {
            return this.__controls;
        },

		/**
		* Connects a parameter to an output file from an other action
		* @param parameterName {String} name of the parameter to set
		* @param parentAction {desk.Action} action to link to
		* @param fileName {string} name of the output file from parentAction
		*/
		connect : function (parameterName, parentAction, fileName) {
			if (parentAction !== this) {
				this.__connections.push({action : parentAction,
					parameter : parameterName, file : fileName			
				});
			}
		},

		/**
		* Defines the output directory for the action
		* @param directory {String} target directory
 		* @param loadJSON {bool} determines whether saved json 
 		* parameters file will be loaded from the output directory (default : true)
		*/
		setOutputDirectory : function (directory, loadJSON) {
			if ( directory.charAt( directory.length - 1 ) != '/' ) {
				directory += '/';
			}

			this.__outputDir = directory;

            if ((loadJSON === false) || (directory === "cache/")){
				this.fireEvent("changeOutputDirectory");
				return;
			}
			var jsonFile = this.getOutputDirectory() + 'action.json';
			desk.FileSystem.exists(jsonFile, function (exists) {
				if (!exists) return;
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
			}, this);
        },

		__updateUIParameters : function () {
			var manager = this.__manager;
			if (!manager) {
				return;
			}
			function setUIParameters(parameters, hide) {
				if (!parameters) {
					return;
				}
				manager.getItems().forEach(function (item) {
					var parameterName = item.getPlaceholder();
					var parameterValue = parameters[parameterName];
					if (parameterValue !== undefined) {
						item.setValue(parameterValue.toString());
						if (hide) {
							item.setVisibility("excluded");
							item.getUserData("label").setVisibility("excluded");
						}
					}
				});
			}
			setUIParameters(this.__loadedParameters, false);
			setUIParameters(this.__providedParameters, !this.__standalone);
		},

		/**
		* Returns the action output directory
		* @return {String} output directory
		*/
		getOutputDirectory : function () {
			return this.__outputDir;
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
				this.__outputDir = outputDirectory;
			}
			this.__updateUIParameters();
		},

        /**
		* Defines UI input parameters for the action
		* @param parameters {Object} parameters as JSON object
		*/
        setUIParameters : function (parameters) {
            Object.keys(parameters).forEach(function (key) {
                var form = this.getForm(key);
                if (form) {
                    form.setValue(parameters[key].toString());
                }
            }, this);
        },

		/**
		* Triggers the action execution
		*/
		executeAction : function() {
			this.__manager.validate();
		},

		/**
		* Returns the tabview containing different UI pages
		* @return {qx.ui.tabview.TabView} the tabViex container
		*/
		getTabView : function () {
			if (!this.__tabView) {
				this.__tabView = new qx.ui.tabview.TabView ();
				var page = new qx.ui.tabview.Page("Parameters");
				page.setLayout(new qx.ui.layout.HBox());
				page.add(this, {flex : 1});
				this.__tabView.add(page);
				this.addListenerOnce("actionUpdated", this.__addOutputTab, this);
			}
			return this.__tabView;
		},

		__outputTabTriggered : false,

		__addOutputTab : function () {
			if ((this.__action.attributes.voidAction == "true") ||
					this.__fileBrowser || this.__outputTabTriggered) {
				return;
			}
			this.__outputTabTriggered = true;
			var page = new qx.ui.tabview.Page("Output");
			this.__tabView.add( page );
			page.addListenerOnce('appear', function () {
				page.setLayout(new qx.ui.layout.HBox());
				this.__fileBrowser = new desk.FileBrowser( this.__outputDir , false );
				this.__fileBrowser.setUserData( "action" , this );
				this.__fileBrowser.setHeight(200);
				page.add( this.__fileBrowser , { flex : 1 } );

				this.addListener( "actionUpdated", this.__updateFileBrowser, this );
				this.addListener( "changeOutputDirectory", this.__updateFileBrowser , this );
			}, this);
		},

		__updateFileBrowser : function () {
			this.__fileBrowser.updateRoot(this.getOutputDirectory());
		},

		__update : null,

		__forceUpdate : null,

		__executionStatus : null,

		__showLogButton : null,

		__afterValidation : function () {
			var manager = this.__manager;
			var send = this.__update;
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
			// add all parameters
			manager.getItems().forEach(function (item) {
				var value = item.getValue();
				if ((typeof value === 'string') && value.length) {
					parameterMap[item.getPlaceholder()] = value;
				}
			});

			// add output directory if provided
			if (this.__outputDir != null) {
				parameterMap.output_directory = this.__outputDir;
			}

			// add the value of the "force update" checkbox
			parameterMap.force_update = this.__forceUpdate.getValue();
			this.__executionStatus.setValue("Processing...");

			// update parent Actions
			async.each(
				_.uniq(connections.map(function (connection) {
					return connection.action;
				})),
 
				function (action, callback) {
					action.addListenerOnce("actionUpdated", function (event) {
						callback();
					});
					action.executeAction();
				},

				function (err) {
					// update parameters from connections
					connections.forEach(function (connection) {
						parameterMap[connection.parameter] =
							connection.action.getOutputDirectory() +
								desk.FileSystem.getFileName(connection.file);
					});

					send.setLabel("Processing...");
					var out = this.getOutputDirectory();
					if (out) {
						parameterMap.output_directory = out;
					}

					if (this.__outputDir) {
						if (this.__outputDir.substring(0,6) === "cache/") {
							parameterMap.output_directory = "cache/";
						}
					}

					this.__executeAction(parameterMap);
				}.bind(this)
			);
		},

		__executeAction : function (parameterMap) {
			var actionId = this.__actionsCounter;
			this.__actionsCounter++;
			desk.Actions.getInstance().launchAction (parameterMap,
				function (response) {
					this.__afterExecute(actionId, response);
			}, this);
			this.fireDataEvent("actionTriggered", actionId);
		},

		__afterExecute : function (actionId, response) {
			this.__update.setEnabled(true);
			this.__update.setLabel("Update");
			if ((this.__outputDir === null) ||
					(this.__outputDir.substring(0, 6) === "cache/") ||
					(this.__outputDir.substring(0, 8) === "actions/")) {
				this.setOutputDirectory(response.outputDirectory);
			}

			this.__executionStatus.setValue(response.status);
			if (this.__action.attributes.voidAction != "true" ) {
				this.__showLogButton.setVisibility("visible");
			}
			this.fireDataEvent("actionUpdated", actionId);
		},

        getForm : function (parameterName) {
			return _.find(this.__manager.getItems(), function (item) {
				return item.getUserData("name") === parameterName;
			});
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
		buildUI : function (opt) {
			opt = opt || {};
			var action = this.__action;
			this.setLayout(new qx.ui.layout.VBox(5));

			var scroll = new qx.ui.container.Scroll();
			var container = new qx.ui.container.Composite(new qx.ui.layout.VBox(5));
			scroll.add(container, {flex : 1});
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
			var manager = this.__manager = new qx.ui.form.validation.Manager();

			action.parameters.forEach(function (parameter) {
				if (parameter.text || _.find(this.__connections, function (connection ) {
						return connection.parameter === parameter.name;
					})) {
					return;
				}

				var parameterTooltip = '';
				["info", "min", "max", "defaultValue"].forEach(function (field) {
					if (parameter[field]) {
						parameterTooltip += field + ' : ' + parameter[field] + '<br>';
					}
				});

				var label = new qx.ui.basic.Label(parameter.name);
				container.add(label);
				var form; 
				switch (parameter.type) {
				case "file":
				case "directory":
					form = new desk.FileField();
					break;
				default :
					form = new qx.ui.form.TextField();
				break;
				}

				form.setUserData("label", label);
				form.setUserData("name", parameter.name);
				if (parameterTooltip.length) {
					form.setToolTipText(parameterTooltip);
					label.setToolTipText(parameterTooltip);
				}
				form.setPlaceholder(parameter.name);
				container.add(form);

				var validators = {
					"int" : this.__intValidator,
					"string" : this.__stringValidator,
					"float" : this.__floatValidator,
					"file" : this.__dummyValidator,
					"directory" : this.__dummyValidator,
					"xmlcontent" : this.__dummyValidator
				};

				var validator = validators[parameter.type];
				if (validator) {
					manager.add(form, validator, parameter);				
				} else {
					alert("no validator implemented for type : "+ parameter.type);
				}

				if ((parameter.type === "file") && opt.fileBrowser) {
					var file = opt.fileBrowser.getSelectedFiles()[0];
					form.setValue(file);
					var parentAction = opt.fileBrowser.getUserData("action");
					if (parentAction) {
						this.connect(form.getPlaceholder(), parentAction, file);
					}
					opt.fileBrowser = undefined;
				}

				//use default value if provided
				if (parameter.defaultValue)  {
					form.setValue(parameter.defaultValue);
				}

				form.addListener("input", function(e) {
					this.setInvalidMessage('');
				}, form);
			}, this);

			this.__updateUIParameters();

			this.__controls = new qx.ui.container.Composite();
			this.__controls.setLayout(new qx.ui.layout.HBox(10));
			this.add(this.__controls);

			this.__update = new qx.ui.form.Button("Process");
			this.__controls.add(this.__update, {flex : 1});
			this.__update.addListener("execute", manager.validate, manager);

			this.__forceUpdate = new qx.ui.form.CheckBox("force");
			this.bind("forceUpdate", this.__forceUpdate, "value");
			this.__forceUpdate.bind("value", this, "forceUpdate");

			this.__executionStatus = new qx.ui.form.TextField().set({
				readOnly: true});

			this.__controls.add(this.__forceUpdate, {flex : 1});
			this.__controls.add(this.__executionStatus, {flex : 1});
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

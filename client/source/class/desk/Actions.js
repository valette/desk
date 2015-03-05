/**
 * Singleton class which stores all available actions, handles launching
 * and display actions in progress
 * @asset(desk/desk.png)
 * @asset(qx/icon/${qx.icontheme}/16/categories/system.png) 
 * @ignore (io)
 * @ignore (_.some)
 * @lint ignoreDeprecated (alert)
 * @require(desk.LogContainer)
 * @require(desk.Random)
 */
qx.Class.define("desk.Actions", 
{
	extend : qx.core.Object,

	type : "singleton",

	/**
	* Constructor, never to be used. Use desk.Actions.getInstance() instead
	*/
	construct : function() {
		this.base(arguments);

		this.__ongoingActions = new qx.ui.container.Composite(new qx.ui.layout.VBox());

		var baseURL = desk.FileSystem.getInstance().getBaseURL();
		var req = new qx.bom.request.Script();
		req.onload = function () {
			this.__socket = io({path : baseURL + 'socket/socket.io'});
			this.__socket.on("action finished", this.__onActionEnd.bind(this));
			this.__socket.on("actions updated", this.__populateActionMenu.bind(this));
			this.__populateActionMenu();
		}.bind(this);
		req.open("GET", baseURL + 'js/browserified.js');
		req.send();
	},

	statics : {
		/**
		* Calls callback when the actions list is constructed
		* @param callback {Function} : callback to be called when ready
		* @param context {Object} : optional context for the callback
		*/
		init : function (callback, context) {
			var actions = desk.Actions.getInstance();
			if (actions.__settings) {
				callback.apply(context);
			} else {
				actions.addListenerOnce("changeReady", callback , context);
			}
		}
	},

	properties : {
		/**
		* Defines whether RPC cache is avoided (default : false);
		*/	
		forceUpdate : { init : false, check: "Boolean", event : "changeForceUpdate"}
	},

	events : {
		/**
		* Fired when the actions list is ready
		*/	
		"changeReady" : "qx.event.type.Event"
	},

	members : {
		__socket : null,
		__runingActions : [],

		/**
		* Creates the action menu, visible on all file browsers
		*/
		__createActionsMenu : function () {
			var menu = new qx.ui.menu.Menu();
			var forceButton = new qx.ui.menu.CheckBox("Disable cache");
			forceButton.setBlockToolTip(false);
			forceButton.setToolTipText("When active, this options disables actions caching");
			forceButton.bind('value', this, 'forceUpdate');
			this.bind('forceUpdate', forceButton, 'value');
			menu.add(forceButton);

			menu.add(this.__getPasswordButton());
			menu.add(this.__getConsoleLogButton());
			menu.add(this.__getServerLogButton());

			var button = new qx.ui.form.MenuButton(null, "icon/16/categories/system.png", menu);
			button.setToolTipText("Configuration");

			qx.core.Init.getApplication().getRoot().add(button, {top : 0, right : 0});

			// add already running actions
			this.getOngoingActions(function (actions) {
				Object.keys(actions).forEach(function (handle) {
					this.__addActionToList(actions[handle]);
					this.__runingActions[handle] = actions[handle];
				}, this);
			}, this);
		},

		/**
		* Creates the password change button
		* @return {qx.ui.menu.Button} the button
		*/
		__getPasswordButton : function () {
			var button = new qx.ui.menu.Button('Change password');
			button.setBlockToolTip(false);
			button.setToolTipText("To change your password");
			button.addListener('execute', function () {
				var password = prompt('Enter new password (more than 4 letters)');
				var req = new qx.io.request.Xhr(desk.FileSystem.getActionURL('password'));
				req.setMethod('POST');
				req.setRequestData({password : password});
				req.addListener('success', function(e) {
					var status = JSON.parse(req.getResponseText());
					if (status.error) {
						alert ('Error : ' + status.error);
					} else {
						alert (status.status);
					}
					req.dispose();
				}, this);
				req.send();
			}, this);
			return button;
		},

		/**
		* Creates the server log button
		* @return {qx.ui.menu.Button} the button
		*/
		__getServerLogButton : function () {
			var button = new qx.ui.menu.Button('Server log');
			button.setBlockToolTip(false);
			button.setToolTipText("To display server logs");
			button.addListener('execute', function () {
				function displayLog(data) {
					log.log(data, 'yellow');
				}
				this.__socket.emit('setLog', true);
				var win = new qx.ui.window.Window('Server log');
				win.setLayout(new qx.ui.layout.HBox());
				var log = new desk.LogContainer().set({backgroundColor : 'black'});
				win.add(log, {flex : 1});
				win.set({width : 600, height : 500});
				this.__socket.on("log", displayLog);
				win.addListener('close', function () {
					this.__socket.removeListener('log', displayLog);
					this.__socket.emit('setLog', false);
				}, this);
				win.open();
				win.center();
			}, this);
			return button;
		},

		/**
		* Creates the console log button
		* @return {qx.ui.menu.Button} the button
		*/
		__getConsoleLogButton : function () {
			var button = new qx.ui.menu.Button('Console log');
			button.setBlockToolTip(false);
			button.setToolTipText("To display console logs");
			button.addListener('execute', function () {
				var oldConsoleLog = console.log;
				console.log = function (message) {
					oldConsoleLog.apply(console, arguments);
					log.log(message.toString());
				};
				var win = new qx.ui.window.Window('Console log');
				win.setLayout(new qx.ui.layout.HBox());
				var log = new desk.LogContainer();
				win.add(log, {flex : 1});
				win.set({width : 600, height : 300});
				win.addListener('close', function () {
					console.log = oldConsoleLog;
				});
				win.open();
				win.center();
			}, this);
			return button;
		},

		__actionMenu : null,
		__settings : null,
		__ongoingActions : null,
		__settingsButton : null,

		__actionsList : null,

		__currentFileBrowser : null,

		/**
		* Returns the complete settings object
		* @return {Object} settings
		*/	
		getSettings : function () {
			return JSON.parse(JSON.stringify(this.__settings));
		},

		/**
		* Returns the JSON object defining a specific action
		* @param name {String} the action name
		* @return {Object} action parameters as a JSON object
		*/	
		getAction : function (name) {
			var action = this.__settings.actions[name];
			if (action) {
				return JSON.parse(JSON.stringify(action));
			} else {
				return null;
			}
		},

		/**
		* Returns the menu containing all actions. Advanced usage only...
		* @param fileBrowser {desk.FileBrowser} 
		* @return {qx.ui.menu.Menu} actions menu
		*/
		getActionsMenu : function (fileBrowser) {
			this.__currentFileBrowser = fileBrowser;
			return this.__actionMenu;
		},
		
		/**
		* Returns the container which lists all ongoing actions
		* @return {qx.ui.form.List} actions menu
		*/
		getOnGoingContainer : function() {
			return this.__ongoingActions;
		},

		/**
		* builds the actions UI
		*/
		buildUI : function () {
			this.__ongoingActions.set ({width : 200, zIndex : 1000000,
				decorator : "statusbar", backgroundColor : "transparent"});
			qx.core.Init.getApplication().getRoot().add(this.__ongoingActions, {top : 0, right : 100});
		},

		/**
		* kills an action
		* @param handle {String} action handle to kill
		* @param callback {Function} callback when the action has been killed
		* @param context {Object} optional context for the callback
		*/
		killAction : function (handle, callback, context) {
			this.launchAction({manage : 'kill', actionHandle : handle},
				function (res) {
					if (typeof callback === "function") {
						callback.call(context, res);
					}
				}
			);
		},

		/**
		* gets the list of currently runing actions on the server
		* @param callback {Function} when the response is available. 
		* The first function parameter is a JSON object containing all the actions
		* @param context {Object} optional context for the callback
		*/
		getOngoingActions : function (callback, context) {
			this.launchAction({manage : 'list'}, function (res) {
				if (typeof callback === "function") {
					callback.call(context, res.ongoingActions);
				}
			});
		},

		/**
		* Fired whenever an action is finished
		* @param response {Object} the server response
		*/
		__onActionEnd : function (response) {
			var params = this.__runingActions[response.handle];
			if (!params) return;
			delete this.__runingActions[response.handle];
			params.actionFinished = true;
			if (response.error) {
				console.log(response);
				var message = "error for action " + params.POST.action + ": \n";
				message += JSON.stringify(response.error);
				alert (message);
			}

			if (params.actionItem) {
				this.__garbageContainer.add(params.actionItem);
			}

			if (typeof params.callback === 'function') {
				params.callback.call(params.context, response);
			}
		},

		__garbageContainer : new qx.ui.container.Composite(new qx.ui.layout.HBox()),

		/**
		* launches an action
		* @param params {Object} object containing action parameters
		* @param callback {Function} callback for when the action has been performed
		* @param context {Object} optional context for the callback
		* @return {String} action handle for managemenent (kill etc...)
		*/
		launchAction : function (params, callback, context) {
			params = JSON.parse(JSON.stringify(params));
			params.handle = Math.random().toString();

			if (this.isForceUpdate()) params.force_update = true;

			var parameters = {
				actionFinished :false,
				callback : callback,
				context : context,
				POST : params
			};

            setTimeout(function () {
				this.__addActionToList(parameters);
			}.bind(this), Math.max(1000, (this.__runingActions.length - 20) * 1000));

			this.__socket.emit('action', params);
			this.__runingActions[params.handle] = parameters;
			return params.handle;
		},

		/**
		* Adds the action widget to the list of runing actions
		* @param parameters {Object} action parameters
		*/
		__addActionToList : function(parameters) {
			if (parameters.actionFinished) {
				return;
			}
			if (this.__ongoingActions.getChildren().length > 20) {
				setTimeout(function () {
					this.__addActionToList(parameters);
				}.bind(this), 2000 * Math.random());
				return;
			}
			var item = this.__garbageContainer.getChildren()[0];
			if (!item) {
				item = new qx.ui.form.ListItem("dummy");
				item.set({decorator : "button-hover", opacity : 0.7});
				var killButton = new qx.ui.menu.Button('kill');
				killButton.addListener('execute', function () {
					this.killAction(item.getUserData("handle"));
				}, this);
				var propertiesButton = new qx.ui.menu.Button('properties');
				propertiesButton.addListener('execute', function () {
					console.log(parameters);
				}, this);
				var menu = new qx.ui.menu.Menu();
				menu.add(killButton);
				menu.add(propertiesButton);
				item.setContextMenu(menu);
			}
			item.setLabel(parameters.POST.action || parameters.POST.manage);
			parameters.actionItem = item;
			item.setUserData("handle", parameters.POST.handle);
			this.__ongoingActions.add(item);
		},


		/**
		* fired when an action is launched via the action menu
		* @param e {qx.event.type.Event} button event
		*/
		__launch : function (e) {
			var name = e.getTarget().getLabel();
			var action = new desk.Action(name, {standalone : true});
			_.some(this.__settings.actions[name].parameters, function (param) {
				if ((param.type !== "file") && (param.type !== "directory")) {
					return false;
				}
				var parameters = {};
				parameters[param.name] = this.__currentFileBrowser.getSelectedFiles()[0];
				action.setParameters(parameters);
				return true;
			}, this);
			action.setOutputDirectory("actions/");
		},

		/**
		* custom comparator for the sort operator
		* @param a {String} first value to compare
		* @param b {String} second value to compare
		* @return {Boolean} true if a < b
		*/
		__myComparator : function (a, b) {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		},

		/**
		* Loads actions.json from server and refreshes the action menu
		*/
		__populateActionMenu : function() {
			desk.FileSystem.readFile('actions.json', function (error, settings) {
				this.__actionMenu = new qx.ui.menu.Menu();

				var actions = settings.actions;

				var libs = {};
				Object.keys(actions).forEach(function (name) {
					var action = actions[name];
					if (!libs[action.lib]) {
						libs[action.lib] = [];
					}
					libs[action.lib].push(name);
				}, this);

				Object.keys(libs).sort(this.__myComparator).forEach(function (lib) {
					var menu = new qx.ui.menu.Menu();
					var menubutton = new qx.ui.menu.Button(lib, null, null, menu);
					libs[lib].sort(this.__myComparator).forEach(function (name) {
						var button = new qx.ui.menu.Button(name);
						var description = actions[name].description;
						if (description) {
							button.setBlockToolTip(false);
							button.setToolTipText(description);
						}
						button.addListener("execute", this.__launch, this);
						menu.add(button);
					}, this);
					this.__actionMenu.add(menubutton);
				}, this);

				if (this.__settings === null) {
					this.__settings = settings;
					if (settings.permissions) {
						this.__createActionsMenu();
					}
					this.fireEvent('changeReady');
				}
				this.__settings = settings;

			}, this);
		}
	}
});

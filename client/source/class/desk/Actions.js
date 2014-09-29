/**
 * Singleton class which stores all available actions, handles launching
 * and display actions in progress
 * @asset(desk/desk.png)
 * @asset(qx/icon/${qx.icontheme}/16/categories/system.png) 
 * @ignore (io)
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
		this.__populateActionMenu();

		this.__ongoingActions = new qx.ui.container.Composite(new qx.ui.layout.VBox());

		var baseURL = desk.FileSystem.getInstance().getBaseURL();
		desk.FileSystem.includeScripts([baseURL + 'js/browserified.js'], function () {
			this.__socket = io({path : baseURL + 'socket/socket.io'});
			this.__socket.on("action finished", this.__onActionEnd.bind(this));
			if (--this.__remainingInits === 0) this.fireEvent('changeReady');
		}, this);
	},

	statics : {
		/**
		* Calls callback when the actions list is constructed
		* @param callback {Function} : callback to be called when ready
		* @param context {Object} : optional context for the callback
		*/
		init : function (callback, context) {
			var actions = desk.Actions.getInstance();
			if (actions.__remainingInits <= 0) {
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
		__remainingInits : 2,

		__createActionsMenu : function () {
			var menu = new qx.ui.menu.Menu();
			var forceButton = new qx.ui.menu.CheckBox("Disable cache");
			forceButton.setBlockToolTip(false);
			forceButton.setToolTipText("When active, this options disables actions caching");
			forceButton.bind('value', this, 'forceUpdate');
			this.bind('forceUpdate', forceButton, 'value');
			menu.add(forceButton);

			var reloadButton = new qx.ui.menu.Button('Reload Actions');
			reloadButton.setBlockToolTip(false);
			reloadButton.setToolTipText("Rebuild actions list on the server");
			reloadButton.addListener('execute', function () {
				this.launchAction({manage:"update"}, this.__populateActionMenu, this);
			}, this);
			menu.add(reloadButton);

			var passwordButton = new qx.ui.menu.Button('Change password');
			passwordButton.setBlockToolTip(false);
			passwordButton.setToolTipText("To change your password");
			passwordButton.addListener('execute', function () {
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
			menu.add(passwordButton);

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

		__actionMenu : null,
		__actions : null,
		__ongoingActions : null,
		__settingsButton : null,

		__actionsList : null,

		__currentFileBrowser : null,

		__permissionsLevel : 0,

		/**
		* Returns the permission level
		* @return {Int} the permissions level
		*/	
		getSettings : function () {
			return JSON.parse(JSON.stringify(this.__actions));
		},

		/**
		* Returns the permission level
		* @return {Int} the permissions level
		*/	
		getPermissionsLevel : function () {
			return this.__permissionsLevel;
		},

		/**
		* Returns the JSON object defining a specific action
		* @param name {String} the action name
		* @return {Object} action parameters as a JSON object
		*/	
		getAction : function (name) {
			var action = this.__actions.actions[name];
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

		__onActionEnd : function (response) {
			var params = this.__runingActions[response.handle];
			if (!params) return;
			delete this.__runingActions[response.handle];
			params.actionFinished = true;
			if (response.error) {
				console.log(response);
				var err = response.error;
				var message = "error for action " + params.POST.action + ": \n";
				var found = false;
				if (err.signal) {
					message += "signal : " + err.signal + "\n";
					found = true;
				}
				if (err.code) {
					message += "code : " + err.code + "\n";
					found = true;
				}
				if (response.stderr) {
					message += "stderr : " + response.stderr + "\n";
					found = true;
				}
				if (!found)	message += err;
				alert (message);
			}

			if (params.actionItem) {
				this.__garbageContainer.add(params.actionItem);
			}

			if (typeof params.callback === 'function') {
				setTimeout(function () {
					params.callback.call(params.context, response);
				}, 1);
			}
		},

		__garbageContainer : new qx.ui.container.Composite(new qx.ui.layout.HBox()),

		/**
		* launches an action
		* @param params {Object} object containing action aprameters
		* @param callback {Function} callback for when the action has been performed
		* @param context {Object} optional context for the callback
		* @return {String} action handle for managemenent (kill etc...)
		*/
		launchAction : function (params, callback, context) {
			desk.Actions.init(function () {
				this.__launchAction(params, callback, context);
			}, this);
		},

		__launchAction : function (params, callback, context) {
			params = JSON.parse(JSON.stringify(params));
			params.handle = Math.random().toString();

			if (this.isForceUpdate()) params.force_update = true;

			var parameters = {
				actionFinished :false,
				callback : callback,
				context : context,
				POST : params
			};

            setTimeout(function () {this.__addActionToList(parameters);}.bind(this), 1230);

			this.__socket.emit('action', params);
			this.__runingActions[params.handle] = parameters;
			return params.handle;
		},

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

		__launch : function (e){
			new desk.Action(e.getTarget().getLabel(), {fileBrowser : this.__currentFileBrowser});
		},

		__myComparator : function (a, b) {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		},

		__populateActionMenu : function(callback) {
			this.__actionMenu = new qx.ui.menu.Menu();
			desk.FileSystem.readFile('actions.json', function (error, settings) {
				this.__actions = settings;
				var permissions = this.__permissionsLevel = parseInt(settings.permissions, 10);
				if (permissions) {
					this.__createActionsMenu();
				}

				var actions = this.__actions.actions;

				var libs = {};
				Object.keys(actions).forEach(function (actionName) {
					var action = actions[actionName];
					action.attributes = action.attributes || {};
					var permissionLevel = parseInt(action.attributes.permissions, 10);
					if (permissionLevel !== 0) {
						permissionLevel = 1;
					}
					if (permissions < permissionLevel) {
						// skip this action as we do not have enough permissions
						return;
					}

					if (!libs[action.lib]) {
						libs[action.lib] = [];
					}
					libs[action.lib].push(actionName);
				});

				Object.keys(libs).sort(this.__myComparator).forEach(function (lib) {
					var menu = new qx.ui.menu.Menu();
					var menubutton = new qx.ui.menu.Button(lib, null, null, menu);
					libs[lib].sort(this.__myComparator).forEach(function (actionName) {
						var button = new qx.ui.menu.Button(actionName);
						var description = actions[actionName].description;
						if (description) {
							button.setBlockToolTip(false);
							button.setToolTipText(description);
						}
						button.addListener("execute", this.__launch, this);
						menu.add(button);
					}, this);
					this.__actionMenu.add(menubutton);
				}, this);

				if (--this.__remainingInits === 0) this.fireEvent('changeReady');
				if (typeof callback === "function") callback();
			}, this);
		}
	}
});

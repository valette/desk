/**
 * Singleton class which stores all available actions, handles launching
 * and display actions in progress
 * @ignore (HackCTMWorkerURL)
 * @asset(desk/desk.png)
 * @asset(desk/desk.png)
 * @asset(qx/icon/${qx.icontheme}/16/categories/system.png) 
 * @ignore (async)
 * @ignore (io)
 * @lint ignoreDeprecated (alert)
 * @require(desk.LogContainer)
 * @require(desk.Random)
 */
qx.Class.define("desk.Actions", 
{
	extend : qx.core.Object,

	type : "singleton",

	statics : {
		/**
		* Calls callback when the actions list is constructed
		* @param callback {Function} : callback to be called when ready
		* @param context {Object} : optional context for the callback
		*/
		init : function (callback, context) {
			var actions = desk.Actions.getInstance();
			if (actions.isReady()) {
				callback.apply(context);
			} else {
				actions.addListenerOnce("changeReady", callback , context);
			}
		},

		RPC : true
	},

	/**
	* Constructor, never to be used. Use desk.Actions.getInstance() instead
	* @ignore (performance.timing)
	* @ignore (performance.timing.navigationStart)
	*/
	construct : function() {
		this.base(arguments);

		// determine base URLs for RPC
		var baseURL = desk.FileSystem.getInstance().getBaseURL();
		this.__baseActionsURL = baseURL + 'rpc/';

		// performance.now polyfill
		(function(){
			// prepare base perf object
			if (typeof window.performance === 'undefined') {
				window.performance = {};
			}
			if (!window.performance.now) {
				var nowOffset = Date.now();
				if (performance.timing && performance.timing.navigationStart){
					nowOffset = performance.timing.navigationStart;
				}
				window.performance.now = function now(){
					return Date.now() - nowOffset;
				};
			}
		})();

		var onReady = function onReady() {
			this.__ready = true;
			this.fireEvent('changeReady');
		}.bind(this);

		if (typeof async != "undefined") {
			setTimeout(onReady, 10);
			return;
		}

		// load external three.js files
		var threeURL = baseURL + 'ext/three.js/';
		HackCTMWorkerURL = threeURL + "ctm/CTMWorkerMin.js";
		
		var scripts = [];
		if (qx.core.Environment.get("qx.debug")) {
			scripts.push(threeURL + 'three.js');
		} else {
			scripts.push(threeURL + 'three.min.js');
		}
		scripts.push(threeURL + 'Detector.js');
		scripts.push(threeURL + 'VTKLoader.js');
		scripts.push(threeURL + 'TrackballControls2.js');
		scripts.push(threeURL + 'ctm/CTMLoader.js');
		scripts.push(threeURL + 'ctm/ctm.js');
		scripts.push(threeURL + 'ctm/lzma.js');
		scripts.push(baseURL + 'ext/async.min.js');
		scripts.push(baseURL + 'ext/underscore-min.js');
		scripts.push(baseURL + 'ext/operative.min.js');
		scripts.push(baseURL + 'ext/kdTree-min.js');
		scripts.push(baseURL + 'ext/numeric-1.2.6.min.js');
		scripts.push(baseURL + 'socket/socket.io/socket.io.js');

		desk.FileSystem.includeScripts(scripts, function () {
			this.__socket = io({path : baseURL + 'socket/socket.io'});
			this.__socket.on("action finished", function (msg) {
				this.__onActionEnd(msg);
			}.bind(this))

			if (desk.Actions.RPC != true) {
				setTimeout(onReady, 10);
				return;
			}

			this.__populateActionMenu(onReady);
		}.bind(this));

		this.__runingActions = [];
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
		__runingActions : null,
		__baseActionsURL : null,
		__ready : false,

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
				var req = new qx.io.request.Xhr();
				req.setUrl(this.__baseActionsURL + 'reset');
				req.setMethod('POST');
				req.addListener('success', function () {
					this.__populateActionMenu();
					req.dispose();
				}, this);
				req.send();
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

			// dislpay list of already running actions
			this.getOngoingActions(function (actions) {
				var keys = Object.keys(actions);
				for (var i = 0; i != keys.length; i++) {
					var action = actions[keys[i]];
					var actionItem = new qx.ui.form.ListItem(action.POST.action);
					actionItem.setUserData('actionParameters', action.POST);
					this.__ongoingActions.add(actionItem);
				}
			}, this);
		},

		/**
		* To test if the actions list is ready
		* @return {Boolean}
		*/	
		isReady : function () {
			return this.__ready;
		},

		__actionMenu : null,
		__actions : null,
		__ongoingActions : null,
		__settingsButton : null,

		__actionsList : null,
		__actionsObject : null,

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
			var action = this.__actionsObject[name];
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
			this.__ongoingActions = new qx.ui.container.Composite(new qx.ui.layout.VBox());
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
		* The first function aprameter is a JSON object containing all the actions
		* @param context {Object} optional context for the callback
		*/
		getOngoingActions : function (callback, context) {
			this.launchAction({manage : 'list'}, function (res) {
				console.log(res);
				if (typeof callback === "function") {
					callback.call(context, res);
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
				var message = "error for action " + params.actionParameters.action + ": \n";
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

			var uiItem = params.actionItem
			if (uiItem) {
				this.__ongoingActions.remove(uiItem);
				uiItem.dispose();
			}
			var callback = params.callback;
			if (typeof callback === 'function') {
				callback.call(params.context, response);
			}
		},

		/**
		* launches an action
		* @param actionParameters {Object} object containing action aprameters
		* @param callback {Function} callback for when the action has been performed
		* @param context {Object} optional context for the callback
		* @return {String} action handle for managemenent (kill etc...)
		*/
		launchAction : function (actionParameters, callback, context) {
			actionParameters = JSON.parse(JSON.stringify(actionParameters));
			// add handle
			var handle = Math.random().toString();
			actionParameters.handle = handle;

			if (this.isForceUpdate()) actionParameters.force_update = true;

			var parameters = {
				actionFinished :false,
				callback : callback,
				context : context,
				actionParameters : actionParameters
			};

			setTimeout(function(){
				if (!parameters.actionFinished) {
					var actionItem = parameters.actionItem = new qx.ui.form.ListItem(actionParameters.action);
					actionItem.set({decorator : "button-hover", opacity : 0.7});
					this.__ongoingActions.add(actionItem);
					var killButton = new qx.ui.menu.Button('kill');
					killButton.addListener('execute', function () {
						this.killAction(actionParameters.handle);
					}, this);
					var menu = new qx.ui.menu.Menu();
					menu.add(killButton);
					actionItem.setContextMenu(menu);
				}
			}.bind(this), 1230);

			this.__socket.emit('action', actionParameters);

			this.__runingActions[actionParameters.handle] = parameters;
			return handle;
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
				this.__actionsObject = actions;
				var self = this;

               function launch(e){
                    var action = new desk.Action(this.getLabel());
					action.setOriginFileBrowser(self.__currentFileBrowser);
					action.buildUI();
				}

				var libs = {};
				var actionsNames = Object.keys(actions);
				for (var n = 0; n < actionsNames.length; n++) {
					var actionName = actionsNames[n];
					var action = actions[actionName];
					action.attributes = action.attributes || {};
					var permissionLevel = parseInt(action.attributes.permissions, 10);
					if (permissionLevel !== 0) {
						permissionLevel = 1;
					}
					if (permissions < permissionLevel) {
						// skip this action as we do not have enough permissions
						continue;
					}
					var lib = action.lib;
					var libArray = libs[lib];
					if (!libArray) {
						libArray = libs[lib] = [];
					}
					libArray.push(actionName);
				}

				var libNames = Object.keys(libs);
				function myStringComparator (a, b) {
					return a.toLowerCase().localeCompare(b.toLowerCase());
				}

				libNames.sort(myStringComparator);

				for (n = 0; n != libNames.length; n++) {
					var menu = new qx.ui.menu.Menu();
					lib = libNames[n];
					var menubutton = new qx.ui.menu.Button(lib, null, null, menu);
					var libActions = libs[lib];
					libActions.sort(myStringComparator);
					for (var i = 0; i != libActions.length; i++) {
						var actionName = libActions[i];
						var button = new qx.ui.menu.Button(actionName);
						var description = actions[actionName].description;
						if (description) {
							button.setBlockToolTip(false);
							button.setToolTipText(description);
						}
						button.addListener("execute", launch, button);
						menu.add(button);
					}
					this.__actionMenu.add(menubutton);
				}

				if (typeof callback === "function") callback();
			}, this);
		}
	}
});

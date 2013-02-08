/**
 * Singleton class which stores all available actions, handles launching
 * and display actions in progress
 * @ignore (HackCTMWorkerURL)
 * @lint ignoreDeprecated (alert)
 */
qx.Class.define("desk.Actions", 
{
	extend : qx.core.Object,

	type : "singleton",

	statics :
	{
		/**
		* Calls callback when the actions list is constructed
		* @param callback {Function} : callback to be called when ready
		*/
		init : function (callback)
		{
			var actions = desk.Actions.getInstance();
			if ( actions.isReady() ) {
				callback();
			}
			else {
				actions.addListenerOnce( "changeReady", callback );
			}
		}
	},

	/**
	* Constructor, never to be used. Use desk.Actions.getInstance() instead
	*/
	construct : function()
	{
		this.base( arguments );
		this.__actionsQueue = [];

		// determine base URLs for RPC
		var URLparser = document.createElement( 'a' );
		URLparser.href = document.href;
		var pathname = URLparser.pathname;
		this.user = URLparser.pathname.split( "/" )[1];
		var baseURL = desk.FileSystem.getInstance().getBaseURL();
		this.__baseActionsURL = baseURL + 'rpc/';

		this.__populateActionMenu();
		this.__ongoingActions = this.__createOngoingActions();

		// load external three.js files
		var threeURL = baseURL + 'ext/three.js/';
		HackCTMWorkerURL = threeURL + "ctm/CTMWorkerMin.js";
		
		var scripts = [];
		scripts.push(threeURL + 'three.min.js');
		scripts.push(threeURL + 'Detector.js');
		scripts.push(threeURL + 'VTKLoader.js');
		scripts.push(threeURL + 'TrackballControls2.js');
		scripts.push(threeURL + 'ctm/CTMLoader.js');
		scripts.push(threeURL + 'ctm/ctm.js');
		scripts.push(threeURL + 'ctm/lzma.js');
		scripts.push(threeURL + 'MeshAnalyser.js');
        scripts.push(baseURL + 'ext/async.min.js');
		desk.FileSystem.includeScripts(scripts, function () {
			this.__scriptsLoaded = true;
			if (this.__actionsLoaded) {
				this.__setReady();
			}
		}, this);

		if (0) {
			new qxjqplot.Plot();
			new desk.LogContainer();
		}

		return this;
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
		__baseActionsURL : null,
		__ready : false,

		__createOngoingActions : function () {
			var list = new qx.ui.form.List();
			list.set ({width : 200, selectionMode : 'multi'});
			var menu = new qx.ui.menu.Menu();
			var forceButton = new qx.ui.menu.CheckBox("Force Update");
			forceButton.bind('value', this, 'forceUpdate');
			this.bind('forceUpdate', forceButton, 'value');
			menu.add(forceButton);

			var reloadButton = new qx.ui.menu.Button('reset');
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

			var killButton = new qx.ui.menu.Button('kill selected');
			killButton.addListener('execute', function () {
				var selection = list.getSelection();
				for (var i = 0; i != selection.length; i++) {
					var actionItem = selection[i];
					this.killAction(actionItem.getUserData('actionParameters').handle, function () {
						if (!actionItem.getUserData('launchedByUser')) {
							this.__ongoingActions.remove(actionItem);
						}
					}, this);
				}
			}, this);
			menu.add(killButton);

			var passwordButton = new qx.ui.menu.Button('change password');
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
				// Send request
				req.send();
			}, this);
			menu.add(passwordButton);


			list.setContextMenu(menu);

			// dislpay list of already running acions
			this.getOngoingActions(function (actions) {
				var keys = Object.keys(actions);
				for (var i = 0; i != keys.length; i++) {
					var action = actions[keys[i]];
					var actionItem = new qx.ui.form.ListItem(action.POST.action);
					actionItem.setUserData('actionParameters', action.POST);
					this.__ongoingActions.add(actionItem);
				}
			}, this);
			return list;
		},

		/**
		* To test if the actions list is ready
		* @return {Boolean}
		*/	
		isReady : function () {
			return this.__ready;
		},

		__setReady : function () {
			this.__ready = true;
			this.fireEvent('changeReady');
		},

		__scriptsLoaded : false,

		__actionsLoaded : false,

		__actionMenu : null,
		__actions : null,
		__ongoingActions : null,

		__actionsList : null,
		__actionsObject : null,

		__currentFileBrowser : null,

		__permissionsLevel : 0,

		__actionsQueue : null,
		__maximumNumberOfParallelActions : 20,

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
			return (JSON.parse(JSON.stringify(this.__actionsObject[name])));
		},

		/**
		* Returns the menu containing all actions. Advanced usage only...
		* @param fileBrowser {desk.FileBrowser} 
		* @return {qx.ui.menu.Menu} actions menu
		*/
		getActionsMenu : function (fileBrowser) {
			this.__currentFileBrowser=fileBrowser;
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
			qx.core.Init.getApplication().getRoot().add(this.__ongoingActions, {top : 0, right : 0});
		},

		__tryToLaunchActions : function () {
			if ((this.__actionsQueue.length === 0)||(this.__maximumNumberOfParallelActions === 0)) {
				return;
			}
			this.__maximumNumberOfParallelActions--;
			var action=this.__actionsQueue[0];
			this.__actionsQueue.shift();
			this.__launchAction(action.action, action.callback, action.context);
		},

		/**
		* launches an action
		* @param actionParameters {Object} object containing action aprameters
		* @param callback {Function} callback for when the action has been performed
		* @param context {Object} optional context for the callback
		* @return handle {String} action handle for managemenent (kill etc...)
		*/
		launchAction : function (actionParameters, callback, context) {
			actionParameters = JSON.parse(JSON.stringify(actionParameters));
			// add handle
			var handle = Math.random().toString();
			actionParameters.handle = handle;
			this.__actionsQueue.push ({action : actionParameters,
									callback : callback,
									context : context});
			this.__tryToLaunchActions();
			return handle;
		},

		/**
		* kills an action
		* @param handle {String} action handle to kill
		* @param callback {Function} callback when the action has been killed
		*/
		killAction : function (handle, callback, context) {
			var req = new qx.io.request.Xhr();
			req.setUrl(desk.FileSystem.getActionURL('action'));
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData({manage : 'kill', handle : handle});
			req.addListener("success", function (e){
				callback.call(context, JSON.parse(e.getTarget().getResponseText()));
				req.dispose();
			}, this);
			req.send();
		},

		/**
		* gets the list of currently runing actions on the server
		* @param callback {Function} when the response is available. 
		* The first function aprameter is a JSON object containing all the actions
		* @param context {Object} optional context for the callback
		*/
		getOngoingActions : function (callback, context) {
			var req = new qx.io.request.Xhr();
			req.setUrl(desk.FileSystem.getActionURL('action'));
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData({manage : 'list'});
			req.addListener("success", function (e){
				callback.call(context, JSON.parse(e.getTarget().getResponseText()));
				req.dispose();
			}, this);
			req.send();
		},

		__onActionSuccess : function (e) {
			var req = e.getTarget();
			var parameters = req.getUserData('actionDetails');

			this.__maximumNumberOfParallelActions++;
			this.__tryToLaunchActions();

			parameters.actionFinished = true;
			var response = JSON.parse(req.getResponseText());
			if (response.error) {
				alert ("error for action " + parameters.actionParameters.action + ": \n" + response.error);
			}

			if (parameters.actionItem) {
				this.__ongoingActions.remove(parameters.actionItem);
			}
			var callback = parameters.callback;
			if ( typeof callback === 'function') {
					callback.call(parameters.context, response);
			}
			req.dispose();
		},

		__launchAction : function (actionParameters, callback, context) {
			if (this.isForceUpdate()) {
				actionParameters.force_update = true;
			}
			var that = this;
			var parameters = {actionFinished :false,
				callback : callback, context : context,
				actionParameters : actionParameters};

			setTimeout(function(){
				if (!parameters.actionFinished) {
					var actionItem = parameters.actionItem = new qx.ui.form.ListItem(actionParameters.action);
					actionItem.setUserData('actionParameters', actionParameters);
					actionItem.setUserData('launchedByUser', true);
					that.__ongoingActions.add(actionItem);
				}
			}, 1230);
			
			var req = new qx.io.request.Xhr();
			req.setUserData('actionDetails', parameters);
			req.setUrl(desk.FileSystem.getActionURL('action'));
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData(actionParameters);

			var numberOfRetries = 3;

			function onError (e){
				console.log("error : "+numberOfRetries+" chances left...");
				numberOfRetries--;
				if (numberOfRetries>0) {
					req = new qx.io.request.Xhr();
					req.setUrl(that.__baseActionsURL + 'actions');
					req.setMethod("POST");
					req.setAsync(true);
					req.setRequestData(actionParameters);
					req.addListener("success", this.__onSuccess, this);
					req.addListener("error", onError, this);
					req.setUserData('actionDetails', parameters);
					req.send();
				}
			}

			req.addListener("success", this.__onActionSuccess, this);
			req.addListener("error", onError, this);
			req.send();
		},

		__populateActionMenu : function()
		{
			this.__actionMenu = new qx.ui.menu.Menu();
			desk.FileSystem.readFile('actions.json', function (request) {
				var settings = JSON.parse(request.getResponseText());
				this.__actions = settings;
				this.__permissionsLevel = parseInt(settings.permissions, 10);

				var actions = this.__actions.actions;
				this.__actionsObject = actions;
				var that = this;

               function launch(e){
                    var action = new desk.Action(this.getLabel());
					action.setOriginFileBrowser(that.__currentFileBrowser);
					action.buildUI();
				}

				var libs = {};
				var actionsNames = Object.keys(actions);
				for (var n = 0; n < actionsNames.length; n++)
				{
					var actionName = actionsNames[n];
					var action = actions[actionName];
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
						// add tooltip when action description exists
						if (description) {
							button.setBlockToolTip(false);
							button.setToolTipText(description);
						}
						button.addListener("execute", launch, button);
						menu.add(button);
					}
					this.__actionMenu.add(menubutton);
				}

				this.__actionsLoaded = true;
				if ( this.__scriptsLoaded ) {
					this.__setReady();
				}
			}, this);
		}
	}
});

/*
#ignore(HackCTMWorkerURL)
*/

/**
 * Singleton class which stores all available actions, handles launching
 * and display actions in progress
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
		desk.FileSystem.includeScripts(scripts, function () {
			this.__scriptsLoaded = true;
			if (this.__actionsLoaded) {
				this.__setReady();
			}
		}, this);
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
			list.setWidth(200);
			var menu = new qx.ui.menu.Menu;
			var forceButton = new qx.ui.menu.CheckBox("Force Update");
			forceButton.bind('value', this, 'forceUpdate');
			this.bind('forceUpdate', forceButton, 'value');
			menu.add(forceButton);

			var reloadButton = new qx.ui.menu.Button('reset');
			reloadButton.addListener('execute', function () {
				var req = new qx.io.request.Xhr();
				req.setUrl(this.__baseActionsURL + 'reset');
				req.setMethod('POST');
				req.addListener('success', this.__populateActionMenu, this);
				req.send();
			}, this);
			menu.add(reloadButton);

			list.setContextMenu(menu);
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
			if ((this.__actionsQueue.length==0)||(this.__maximumNumberOfParallelActions==0)) {
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
		*/
		launchAction : function (actionParameters, callback, context) {
			this.__actionsQueue.push ({action : actionParameters,
									callback : callback,
									context : context});
			this.__tryToLaunchActions();
		},

		__launchAction : function (actionParameters, callback, context) {
			actionParameters = JSON.parse(JSON.stringify(actionParameters));
			if (this.isForceUpdate()) {
				actionParameters.force_update = true;
			}
			var that=this;
			var actionFinished=false;
			var actionNotification=null;
			setTimeout(function(){
				if (!actionFinished) {
					actionNotification=new qx.ui.basic.Label(actionParameters["action"]);
					that.__ongoingActions.add(actionNotification);
				}
			}, 3000);
			
			var req = new qx.io.request.Xhr();

			req.setUrl(desk.FileSystem.getActionURL('action'));
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData(actionParameters);

			function onSuccess (e){
				this.__maximumNumberOfParallelActions++;
				this.__tryToLaunchActions();
				var response = JSON.parse(e.getTarget().getResponseText());
				if (response.error) {
					alert ("error for action " + actionParameters.action + ": \n" + response.error);
				}
				else {
					actionFinished=true;
					if (actionNotification!=null) {
						this.__ongoingActions.remove(actionNotification);
					}
					if ( typeof callback === 'function') {
							callback.call(context, response);
					}
				}
			}

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
					req.addListener("success", onSuccess, this);
					req.addListener("error", onError, this);
					req.send();
				}
			}

			req.addListener("success", onSuccess, this);
			req.addListener("error", onError, this);
			req.send();
		},

		__populateActionMenu : function()
		{
			this.__actionMenu = new qx.ui.menu.Menu;
			desk.FileSystem.readFile('actions.json', function (request) {
				var settings = JSON.parse(request.getResponseText());
				this.__actions = settings;
				this.__permissionsLevel = parseInt(settings.permissions);

				var actions = this.__actions.actions;
				this.__actionsObject = actions;
				var that = this;
				var menus = [];

				var actionsNames = Object.keys(actions);
				for (var n = 0; n < actionsNames.length; n++)
				{
					var action = actions[actionsNames[n]];
					var actionName = actionsNames[n];
					var button = new qx.ui.menu.Button(actionName);
					var lib = action.lib;
					var menu = menus[lib];
					if (!menu) {
						menu = new qx.ui.menu.Menu();
						var menubutton = new qx.ui.menu.Button(lib, null, null, menu);
						menus[lib] = menu;
						this.__actionMenu.add(menubutton);
					}
					
					button.addListener("execute", function (e){
						var action = new desk.Action(this.getLabel());
						action.setOriginFileBrowser(that.__currentFileBrowser);
						action.buildUI();
					},button);
					menu.add(button);
				}
				this.__actionsLoaded = true;
				if ( this.__scriptsLoaded ) {
					this.__setReady();
				}
			}, this);
		}
	}
});

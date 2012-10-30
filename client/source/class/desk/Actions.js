/*
#ignore(HackCTMWorkerURL)
*/

qx.Class.define("desk.Actions", 
{
	extend : qx.core.Object,

	type : "singleton",

	statics :
	{
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
				this.__setReady(true);
			}
		});
		return this;
	},

	properties : {
		forceUpdate : { init : false, check: "Boolean", event : "changeForceUpdate"}
	},

	events : {
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
		__actionsArray : null,
		__currentFileBrowser : null,

		__permissionsLevel : 0,

		__actionsQueue : null,
		__maximumNumberOfParallelActions : 20,

		getPermissionsLevel : function () {
			return this.__permissionsLevel;
		},

		getAction : function (name) {
			var actions=this.__actionsArray;
			for (var i=0;i!=actions.length;i++)
			{
				var action=actions[i];
				if (action.name==name) {
					return (JSON.parse(JSON.stringify(action)));
				}
			}
			console.log("action "+name+" not found");
			return null;
		},

		getActionsMenu : function (fileBrowser) {
			this.__currentFileBrowser=fileBrowser;
			return this.__actionMenu;
		},
		
		getOnGoingContainer : function() {
			return this.__ongoingActions;
		},

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

		launchAction : function (actionParameters, successCallback, context) {
			this.__actionsQueue.push ({action : actionParameters,
									callback : successCallback,
									context : context});
			this.__tryToLaunchActions();
		},

		__launchAction : function (actionParameters, successCallback, context) {
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
				var req = e.getTarget();
				var response=req.getResponseText();
				var splitResponse=response.split("\n");
				if (splitResponse.length<2) {
					alert ("error for action "+actionParameters.action+": \n"+splitResponse[0]);
				}
				else {
					var executionStatus=splitResponse[splitResponse.length-2].split(" ")[0];
					if ((executionStatus!="OK")&&(executionStatus!="CACHED")) {
						alert ("error for action "+actionParameters.action+": \n"+splitResponse[0]);
					}
					else {
						actionFinished=true;
						if (actionNotification!=null) {
							this.__ongoingActions.remove(actionNotification);
						}
						if (successCallback!=null) {
							if (context!=null) {
								successCallback.call(context,e);
							}
							else {
								successCallback(e);
							}
						}
					}
				}
			}

			var numberOfRetries=3;

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
				this.__actionsArray = actions;
				var that = this;
				var menus = [];

				for (var n = 0; n < actions.length; n++)
				{
					var action = actions[n];
					var actionName = action.name
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
					this.__setReady(true);
				}
			}, this);
		}
	}
});

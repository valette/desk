/*
#ignore(HackCTMWorkerURL)
*/

qx.Class.define("desk.actions", 
{
	extend : qx.core.Object,

	type : "singleton",

	environment : {
		"desk.extURL" : "to define in config.json"
	},

	construct : function(fileBrowser)
	{
		this.base(arguments);

		this.__actionsQueue=[];

		this.__actionMenu = new qx.ui.menu.Menu;
		this.populateActionMenu();


		this.addListenerOnce("changeReady", function () {
			var ongoingActions = new qx.ui.form.List().set({
				width: 200
			});
			this.__ongoingActions=ongoingActions;
			if (this.__permissionsLevel<1) {
				return;
			}
			qx.core.Init.getApplication().getRoot().add(ongoingActions, { right : 0, top : 0});
		}, this);

		// load external three.js files
		var threeURL=qx.core.Environment.get("desk.extURL")+"three.js/";

		HackCTMWorkerURL=threeURL+"ctm/CTMWorkerMin.js";

		var files=["Three.js", "Detector.js", "VTKLoader.js","TrackballControls2.js","ctm/CTMLoader.js"];
		var index=-1;

		function myScriptLoader() {
			index+=1;
			if (index!=files.length) {
				var loader=new qx.io.ScriptLoader().load(
					threeURL+files[index], myScriptLoader);
			}
		}
		myScriptLoader();
		return this;
	},

	properties : {
		ready : { init : false, check: "Boolean", event : "changeReady"}
	},

	members : {
		__actionMenu : null,
		__actions : null,
		__fileBrowser : null,
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
			var actionNotification=new qx.ui.basic.Label(actionParameters["action"]);
			this.__ongoingActions.add(actionNotification);
			var req = new qx.io.request.Xhr();

			req.setUrl(qx.core.Environment.get("desk.extURL")+"php/actions.php");
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
						this.__ongoingActions.remove(actionNotification);
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
					req.setUrl(qx.core.Environment.get("desk.extURL")+"php/actions.php");
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

		populateActionMenu : function()
		{
			var xmlhttp=new XMLHttpRequest();
			var _this=this;
			xmlhttp.onreadystatechange = function() {
				 if(this.readyState == 4 && this.status == 200)
				 {
					// so far so good
					if(xmlhttp.responseText!=null)
					{
						var settings=JSON.parse(xmlhttp.responseText);
						console.log(settings);
						_this.__actions=settings;

						_this.__permissionsLevel=parseInt(settings.permissions);

						var actions=_this.__actions.actions;
						_this.__actionsArray=actions;
						var actionMenu=_this;

						for (var n=0;n<actions.length;n++)
						{
							var button=new qx.ui.menu.Button(actions[n].name);

							button.addListener("execute", function (e){
								var action= new desk.action(this.getLabel());
								action.setOriginFileBrowser(actionMenu.__currentFileBrowser);
								action.buildUI();},button);
							_this.__actionMenu.add(button);
						}
						_this.setReady(true);
					}
				}
			}
			xmlhttp.open("GET",qx.core.Environment.get("desk.extURL")+"php/actions.json?nocache=" + Math.random(),true);
			xmlhttp.send();
		},

		createActionWindowFromURL : function (fileURL)
		{
			var req = new qx.io.request.Xhr(fileURL+"?nocache=" + Math.random());
			req.addListener("success", function(e) {
				var req = e.getTarget();
				var parametersText=req.getResponseText();
				var parameters=[];
				var splitParameters=parametersText.split("\n");
				for (var i=0 ; i!=splitParameters.length;i++)
				{
					var splitString=splitParameters[i].split("=");
					parameters[splitString[0]]=splitString[1];
				}
				var action=new desk.action (parameters["action"]);
				action.setActionParameters(parameters);
				action.buildUI();
			}, this);
			req.send();
		}
	}
});

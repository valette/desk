qx.Class.define("desk.actions", 
{
	extend : qx.core.Object,

	type : "singleton",

	construct : function(fileBrowser)
	{
		this.base(arguments);

		var localAdress=window.location.href;
		var slashIndex=localAdress.indexOf("/");
		var slashIndex=localAdress.indexOf("/");
		var slashIndex2=localAdress.indexOf("/", slashIndex+1);
		var slashIndex3=localAdress.indexOf("/", slashIndex2+1);
		var questionMarkIndex=localAdress.indexOf("?");
		if (questionMarkIndex<0) {
			questionMarkIndex=localAdress.length;
			}

		desk.actions.BASEURL=localAdress.substring(slashIndex3,
												questionMarkIndex)+
									"php/";

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
		return this;
	},

	properties : {
		ready : { init : false, check: "Boolean", event : "changeReady"}
	},

	statics : {
		BASEURL : null
	},

	members : {
		__actionsFile : "php/actions.xml",
		__actionMenu : null,
		__actions : null,
		__fileBrowser : null,
		__ongoingActions : null,

		__actionsList : null,
		__actionsArray : null,
		__currentFileBrowser : null,

		__permissionsLevel : 0,

		getPermissionsLevel : function () {
			return this.__permissionsLevel;
		},

		getActionXMLElement : function (actionName) {
			var actions=this.__actionsArray;
			for (var i=0;i!=actions.length;i++)
			{
				var actionElement=actions[i];
				if (actionElement.getAttribute("name")==actionName)
					return actionElement;
			}
			console.log("action "+actionName+" not found");
		},

		getActionsMenu : function (fileBrowser) {
			this.__currentFileBrowser=fileBrowser;
			return this.__actionMenu;
		},

		launchAction : function (actionParameters, successCallback, context)
		{
			var actionNotification=new qx.ui.basic.Label(actionParameters["action"]);
			this.__ongoingActions.add(actionNotification);
			var req = new qx.io.request.Xhr();

			function onSuccess (e){
					var req = e.getTarget();
					var response=req.getResponseText();
					var splitResponse=response.split("\n");
					if (splitResponse.length<2)
						alert ("error for action "+actionParameters.action+": \n"+splitResponse[0]);
					else
					{
						var executionStatus=splitResponse[splitResponse.length-2].split(" ")[0];
						if ((executionStatus!="OK")&&(executionStatus!="CACHED"))
						{
							alert ("error for action "+actionParameters.action+": \n"+splitResponse[0]);
						}
						else
						{
							this.__ongoingActions.remove(actionNotification);
							if (successCallback!=null)
							{
								if (context!=null)
									successCallback.call(context,e);
								else
									successCallback(e);
							}
						}
					}
			}

			req.setUrl("php/actions.php");
			req.setMethod("POST");
			req.setAsync(true);
			req.setRequestData(actionParameters);
			req.addListener("success", onSuccess, this);
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
					if(xmlhttp.responseXML!=null)
					{
						_this.__actions=xmlhttp.responseXML;

						var permissions=_this.__actions.getElementsByTagName("permissions")[0];
						_this.__permissionsLevel=parseInt(permissions.getAttribute("level"));

						var actions=_this.__actions.getElementsByTagName("action");
						_this.__actionsArray=actions;
						var actionMenu=_this;

						for (var n=0;n<actions.length;n++)
						{
							var action=actions[n];
							var actionName=action.getAttribute("name");
							var button=new qx.ui.menu.Button(actionName);
							var descriptions=action.getElementsByTagName("description");
							var tooltip=new qx.ui.tooltip.ToolTip("hello");
							button.setToolTip(tooltip);//descriptions[0].nodeValue);
							if (descriptions.length>0)
							{
						//		button.setToolTipText("hello");//descriptions[0].nodeValue);
				//					if (n==0)
					//				alert (descriptions[0]);
							}

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

			xmlhttp.open("GET",this.__actionsFile+"?nocache=" + Math.random(),true);
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

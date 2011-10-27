qx.Class.define("desk.actions", 
{
	extend : qx.core.Object,

	construct : function(fileBrowser)
	{
		this.base(arguments);
		desk.actions.ACTIONSHANDLER=this;

		var localAdress=window.location.href;
		var slashIndex=localAdress.indexOf("/");
		var slashIndex=localAdress.indexOf("/");
		var slashIndex2=localAdress.indexOf("/", slashIndex+1);
		var slashIndex3=localAdress.indexOf("/", slashIndex2+1);
		var questionMarkIndex=localAdress.indexOf("?");
		if (questionMarkIndex<0)
			questionMarkIndex=localAdress.length;
		desk.actions.BASEURL=localAdress.substring(slashIndex3,
												questionMarkIndex)+
									"php/";

		this.__actionMenu = new qx.ui.menu.Menu;
		this.populateActionMenu();
//		this.__menuButton=new qx.ui.menu.Button("Actions", null , null, this.__actionMenu);

		function getParameter( parameterName )
		{
		  parameterName = parameterName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		  var regexS = "[\\?&]"+parameterName+"=([^&#]*)";
		  var regex = new RegExp( regexS );
		  var results = regex.exec( window.location.href );
		  if( results == null )
			return null;
		  else
			return results[1];
		}

		if (fileBrowser!=null)
			this.__fileBrowser=fileBrowser;
		else
			this.__fileBrowser=new desk.fileBrowser(getParameter("rootDir"));

		var ongoingActions = new qx.ui.form.List().set({
			width: 200
	//		height: 400
		});
		this.__ongoingActions=ongoingActions;
		qx.core.Init.getApplication().getRoot().add(ongoingActions, { right : 0, top : 0});
		return this;
	},

	statics : {
		ACTIONSHANDLER : null,
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

		getActionsXMLElement : function () {
			return this.__actions;
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
			xmlhttp.open("GET",this.__actionsFile+"?nocache=" + Math.random(),false);
			xmlhttp.send();
			this.__actions=xmlhttp.responseXML;
			var actions=this.__actions.getElementsByTagName("action");
			this.__actionsArray=actions;
			var actionMenu=this;

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
					action.buildUI();});
				this.__actionMenu.add(button);
			}
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

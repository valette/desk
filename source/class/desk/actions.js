qx.Class.define("desk.actions", 
{
	extend : qx.core.Object,

	construct : function(fileBrowser)
	{
		this.base(arguments);
		this.__actionMenu = new qx.ui.menu.Menu;
		this.populateActionMenu();
		this.__menuButton=new qx.ui.menu.Button("Actions", null , null, this.__actionMenu);

		if (fileBrowser!=null)
			this.__fileBrowser=fileBrowser;

		return this;
	},

	members : {
		__actionsFile : "/visu/desk/actions.xml",
		__actionMenu : null,
		__actions : null,
		__menuButton : null,
		__fileBrowser : null,

		getButton : function()
		{
			return (this.__menuButton);
		},

		populateActionMenu : function()
		{
			var xmlhttp=new XMLHttpRequest();
			xmlhttp.open("GET",this.__actionsFile+"?nocache=" + Math.random(),false);
			xmlhttp.send();
			this.__actions=xmlhttp.responseXML;
			var actions=this.__actions.getElementsByTagName("action");
			var actionMenu=this;
			function executeButton(e)
			{
				actionMenu.createActionWindow(this.getLabel());
			}

			for (var n=0;n<actions.length;n++)
			{
				var action=actions[n];
				var actionName=action.getAttribute("name");
				var button=new qx.ui.menu.Button(actionName);
				button.addListener("click", executeButton);
				this.__actionMenu.add(button);
			}
		},

		createActionWindow : function (actionName)
		{
			var action=this.__actions.getElementsByName(actionName)[0];
			
			var actionWindow=new qx.ui.window.Window();
			actionWindow.setLayout(new qx.ui.layout.VBox());
			actionWindow.setShowClose(true);
			actionWindow.setShowMinimize(false);
			actionWindow.setUseMoveFrame(true);
			actionWindow.setCaption(action.getAttribute("name"));

			// create the form manager
			var manager = new qx.ui.form.validation.Manager();
			actionWindow.open();

			var intValidator = function(value, item) {
				var parameterName=this.getAttribute("name");
				if (value==null) 
				{
					if (this.getAttribute("required")=="true")
					{
						item.setInvalidMessage("\""+parameterName+"\" is empty");
						return (false);
					}
				}
				else if ( (parseInt(value)!=parseFloat(value))||
						 isNaN(value)){
					item.setInvalidMessage("\""+parameterName+"\" should be an integer");
					return (false);
				}
				return (true);
				};

			var floatValidator = function(value, item) {
				var parameterName=this.getAttribute("name");
				if (value==null)
				{
					if (this.getAttribute("required")=="true")
					{
						item.setInvalidMessage("\""+parameterName+"\" is empty");
						return (false);
					}
				}
				else if (isNaN(value)){
					item.setInvalidMessage("\""+parameterName+"\" should be a number");
					return (false);
				}
				return (true);
				};

			var stringValidator = function(value, item) {
				var parameterName=this.getAttribute("name");
				if (value==null)
				{
					if (this.getAttribute("required")=="true")
					{
						item.setInvalidMessage("\""+parameterName+"\" is empty");
						return (false);
					}
				}
				else if (value.split(" ").length!=1){
					item.setInvalidMessage("\""+parameterName+"\" should contain no space characters");
					return (false);
				}
				return (true);
				};

			var fileAlreadyPickedFromBrowser=false;

			var parameters=action.getElementsByTagName("parameter");
			for (var i=0;i<(parameters.length+1);i++)
			{
				var parameter;
				if (i==parameters.length)
				{
					// insert output directory parameter by default
					parameter=document.createElement("parameter");
					parameter.setAttribute('name',"output_directory");
					parameter.setAttribute('type',"directory");
					parameter.setAttribute('required',"true");
				}
				else
					parameter=parameters[i];

				var parameterName=parameter.getAttribute("name");
				actionWindow.add(new qx.ui.basic.Label(parameterName));
				var parameterForm=new qx.ui.form.TextField();
				parameterForm.setPlaceholder(parameterName);
				actionWindow.add(parameterForm);
				var parameterType=parameter.getAttribute("type");

				switch (parameterType)
				{
				case "int":
					manager.add(parameterForm, intValidator, parameter);
					break;
				case "string":
					manager.add(parameterForm, stringValidator, parameter);
					break;
				case "float":
					manager.add(parameterForm, floatValidator, parameter);
					break;
				case "file":
					if ((!fileAlreadyPickedFromBrowser)&& (this.__fileBrowser!=null))
					{
						fileAlreadyPickedFromBrowser=true;
						parameterForm.setValue(this.__fileBrowser.getNodePath(
							this.__fileBrowser.getSelectedNode()));
					}
					parameterForm.setDroppable(true);
					parameterForm.addListener("drop", function(e) {
							var fileBrowser=e.getData("fileBrowser");
							var fileNode=fileBrowser.getSelectedNode();
 							this.setValue(fileBrowser.getNodePath(fileNode));
						}, parameterForm);

					manager.add(parameterForm, stringValidator, parameter);
					break;
				case "directory":
					if (this.__fileBrowser!=null)
					{
						var fileNode=this.__fileBrowser.getSelectedNode();
						if (fileNode.type==
							qx.ui.treevirtual.MTreePrimitive.Type.LEAF)
						{					
							var parentNode=this.__fileBrowser.getTree().nodeGet(
								fileNode.parentNodeId);
							parameterForm.setValue(this.__fileBrowser.getNodePath(parentNode));
						}
						else
						{
							parameterForm.setValue(this.__fileBrowser.getNodePath(fileNode))
						}
					}
					parameterForm.setDroppable(true);
					parameterForm.addListener("drop", function(e) {
							var fileBrowser=e.getData("fileBrowser");
							var fileNode=fileBrowser.getSelectedNode();
 							this.setValue(fileBrowser.getNodePath(fileNode));
						}, parameterForm);

					manager.add(parameterForm, stringValidator, parameter);
					break;
				default :
						alert("no validator implemented for type : "+parameterType);
				}

				parameterForm.addListener("input", function(e) 
					{this.setInvalidMessage(null);},parameterForm);
			}

			var send = new qx.ui.form.Button("Process");
			actionWindow.add(send, {left: 20, top: 215});
			send.addListener("execute", function() {
				// configure the send button
				send.setEnabled(false);
				send.setLabel("Processing...");
				// return type can not be used because of async validation
				manager.validate()
				}, this);


			// add a listener to the form manager for the validation complete
			manager.addListener("complete", function() {
				// check the validation status
				if (manager.getValid()) {
					var parameterMap={"action" : actionName};
					var items=manager.getItems();
//					alert (items.length+" items");
					for (var i=0;i<items.length;i++)
					{
						var currentItem=items[i];
						var value=currentItem.getValue();
						if (value!=null)
							parameterMap[currentItem.getPlaceholder()]=value;
//						alert(currentItem.getPlaceholder()+" : "+currentItem.getValue());
					}
//					alert (parameterMap);
					var req = new qx.io.request.Xhr();
					req.setUrl("/visu/desk/php/actions.php");
					req.setMethod("POST");
					req.setAsync(true);
					req.setRequestData(parameterMap);
					req.addListener("success", getAnswer, this);
					req.send();
					function getAnswer(e)
					{
				// configure the send button
						send.setEnabled(true);
						send.setLabel("Update");

						var req = e.getTarget();
						alert(req.getResponseText());
					}
				} else {
					alert(manager.getInvalidMessages().join("\n"));
				}
				}, this);
		}
	}
});

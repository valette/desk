qx.Class.define("desk.actions", 
{
	extend : qx.core.Object,

	construct : function()
	{
		this.base(arguments);
		this.__actionMenu = new qx.ui.menu.Menu;
		this.populateActionMenu();
		this.__menuButton=new qx.ui.menu.Button("Actions", null , null, this.__actionMenu);
		return this;
	},

	members : {
		__actionsFile : "/visu/desk/actions.xml",
		__actionMenu : null,
		__actions : null,
		__menuButton : null,

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
				var parameterName=this.childNodes[0].nodeValue;
				if (value==null)
				{
					item.setInvalidMessage("\""+parameterName+"\" is empty");
					return (false);
				}
				if ( (parseInt(value)!=parseFloat(value))||
						 isNaN(value)){
					item.setInvalidMessage("\""+parameterName+"\" should be an integer");
					return (false);
				}
				return (true);
				};

			var floatValidator = function(value, item) {
				var parameterName=this.childNodes[0].nodeValue;
				if ((value==null)&& item.isRequired())
				{
					item.setInvalidMessage("\""+parameterName+"\" is empty");
					return (false);
				}
				if (isNaN(value)){
					item.setInvalidMessage("\""+parameterName+"\" should be a number");
					return (false);
				}
				return (true);
				};

			var stringValidator = function(value, item) {
				var parameterName=this.childNodes[0].nodeValue;
				if ((value==null)&& item.isRequired())
				{
					item.setInvalidMessage("\""+parameterName+"\" is empty");
					return (false);
				}
				if (value.split(" ").length!=1){
					item.setInvalidMessage("\""+parameterName+"\" should contain no space characters");
					return (false);
				}
				return (true);
				};


			var parameters=action.getElementsByTagName("parameter");
			for (var i=0;i<parameters.length;i++)
			{
				var parameter=parameters[i];
				var parameterName=parameter.childNodes[0].nodeValue;
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
				case "float":
					manager.add(parameterForm, floatValidator, parameter);
					break;
				case "file":
					parameterForm.setDroppable(true);
					parameterForm.addListener("drop", function(e) {
							var fileBrowser=e.getData("fileBrowser");
							var fileNode=e.getData("fileNode");
 							this.setValue(fileBrowser.getNodePath(fileNode));
						}, parameterForm);

					manager.add(parameterForm, stringValidator, parameter);
					break;
				default :
						this.debug("no validator implemented for type : "+parameterType);
				}

				if (parameter.getAttribute("required")=="true")
				{
					parameterForm.setRequired(true);
				}

				parameterForm.addListener("input", function(e) 
					{this.setInvalidMessage(null);},parameterForm);

			}

			var send = new qx.ui.form.Button("Send");
			actionWindow.add(send, {left: 20, top: 215});
			send.addListener("execute", function() {
				// configure the send button
				send.setEnabled(false);
				send.setLabel("Validating...");
				// return type can not be used because of async validation
				manager.validate()
				}, this);


			// add a listener to the form manager for the validation complete
			manager.addListener("complete", function() {
				// configure the send button
				send.setEnabled(true);
				send.setLabel("Send");
				// check the validation status
				if (manager.getValid()) {
					var parameterMap={"action" : actionName};
					var items=manager.getItems();
//					alert (items.length+" items");
					for (var i=0;i<items.length;i++)
					{
						var currentItem=items[i];
						parameterMap[currentItem.getPlaceholder()]=currentItem.getValue();
//						alert(currentItem.getPlaceholder()+" : "+currentItem.getValue());
					}
//					alert (parameterMap);
					var req = new qx.io.request.Xhr();
					req.setUrl("/visu/action.php");
					req.setMethod("POST");
					req.setAsync(true);
					req.setRequestData(parameterMap);
					req.addListener("success", getAnswer, this);
					req.send();
					function getAnswer(e)
					{
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

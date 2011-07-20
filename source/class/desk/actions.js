qx.Class.define("desk.actions", 
{
	extend : qx.core.Object,

	construct : function()
	{
		this.base(arguments);

		// create actions menu

		this.__actionMenu = new qx.ui.menu.Menu;
		this.populateActionsMenu();

		// create main menu and buttons
		var menu = new qx.ui.menu.Menu();

		var uploadButton = new qx.ui.menu.Button("Upload", null , this.__uploadCommand);
		uploadButton.addListener("execute", function (e){alert ("Not implemented!");}, this);

		var actionsButton = new qx.ui.menu.Button("Actions", null, null, this.__actionMenu);

		// add buttons to menu
		menu.add(uploadButton);
		menu.addSeparator();
		menu.add(actionsButton);

		// Create opener button
		var button = new qx.ui.form.MenuButton("Actions",null, menu);
		return button;
	},

	members : {
		__actionsFile : "/visu/desk/actions.xml",
		__actionMenu : null,
		__actions : null,

		populateActionsMenu : function()
		{
			var xmlhttp=new XMLHttpRequest();
			xmlhttp.open("GET",this.__actionsFile+"?nocache=" + Math.random(),false);
			xmlhttp.send();
			this.__actions=xmlhttp.responseXML;
			var actions=this.__actions.getElementsByTagName("action");

			var actionMenu=this;
			function executeButton(e)
			{
//				alert(this.getLabel());
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
//			alert (actionName);
			var action=this.__actions.getElementsByName(actionName)[0];
			alert (action.getAttribute("name"));
		}
	}
});

/*
#asset(qx/icon/${qx.icontheme}/16/actions/view-refresh.png) 
*/

qx.Mixin.define("desk.ActionLinkMixin",
{
	members:
	{
		__updateButton : null,
		__updateCallback : null,

		getUpdateButton: function(callback, context) {
			var button=this.__updateButton;
			if (button != null) {
				return button;
			}
			button=new qx.ui.form.Button(null,"icon/16/actions/view-refresh.png");
			button.setDroppable(true);
			button.addListener("drop", function(e) {
				if (e.supportsType("action")) {
					e.getData("action").addListener("actionUpdated", callback, this);
				}
			}, this);

			button.addListener("execute", callback, context);
			this.__updateButton=button;
			return button;
		},

		getLinkLabel : function (existingLabel) {
/*	TODO		var label=existingLabel || new qx.ui.basic.Label("Link");
			label.setDraggable (true);
			label.addListener("dragstart", function(e) {
				e.addAction("alias");
				e.addType("action");
				});

			label.addListener("droprequest", function(e) {
					var type = e.getCurrentType();
					switch (type)
					{
					case "action":
						e.addData(type, this);
						break;
					default :
					}
			}, this);
			return (label);*/
		}
	}
});

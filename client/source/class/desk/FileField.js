/**
 * Simple File field with drag and drop capabilities
 */
qx.Class.define("desk.FileField", 
{
	extend : qx.ui.form.TextField,

	construct : function(text) {
		this.base(arguments);
		if (text) {
			this.setValue(text);
		}
		this.setDroppable(true);
		this.addListener("drop", function(e) {
			if (e.supportsType("file")) {
				this.setValue(e.getData("file"));
			}
		}, this);
		this.setDraggable(true);
		this.addListener('dragstart', this.__onDragStart);
		this.addListener("droprequest", this.__onDropRequest, this);
	},

	members : {
        /**
		* fired when a widget drag starts
		*/
		__onDragStart : function (e) {
			e.addAction("copy");
			e.addType("file");
		},

        /**
		* fired when a drop is performed
		*/
		__onDropRequest : function(e) {
			var type = e.getCurrentType();
			switch (type) {
			case "file":
				e.addData(type, this.getValue());
				break;
			default :
				break;
			}
		}
	}
});

/**
 * Simple TabView widget helper
 */
qx.Class.define("desk.TabView", 
{
	extend : qx.ui.tabview.TabView,

	construct : function() {
		this.base(arguments);
		return this;
	},

	members : {
		addElement : function (title, element) {
			var page = new qx.ui.tabview.Page(title);
			var layout = new qx.ui.layout.VBox();
			page.setLayout(layout);
			page.add(element, {flex : 1});
			this.add(page);
		}
	}
});

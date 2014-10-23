/**
 * A log container
 */
qx.Class.define("desk.LogContainer", 
{
	extend : qx.ui.container.Scroll,

	construct : function (message) {
		this.base(arguments);
		this.__html = new qx.ui.embed.Html('').set({
			font : "monospace",
			padding: 3,
			overflowX : "auto",
			overflowY : "auto"
		});
		this.add(this.__html);
	},

members : {
	__html : null,

    /**
    * Clears the log contents
    */
    clear : function () {
		this.__html.setHtml('');
	},

    /**
    * Add log message
    * @param message {String} message to display
    * @param coloe {String} optional message color
    */
    log : function (message, color) {
		if (!message) {
			return;
		}
		color = color || "black";

		this.__html.setHtml(message.toString().replace(' ', '&nbsp')
		    .split('\n').reduce(function (lines, line) {
			    return lines + '<span style="color:' + color + '">' + line + '<br/></span>';
		    }, this.__html.getHtml())
		);
		this.__html.getContentElement().scrollToY(1000000, true); 
	}
}
});

/**
 * A log container
 */
qx.Class.define("desk.LogContainer", 
{
	extend : qx.ui.embed.Html,

	construct : function (message) {
		this.base(arguments);
		this.set({
			font : "monospace",
			padding: 3,
			overflowX : "auto",
			overflowY : "auto"
		});
        this.addListener("mousewheel", function (e){
            // this is to avoid this bug : http://tinyurl.com/pmqurpn
            var element = this.getContentElement();
            element.scrollToY(element.getScrollY() + 30 * e.getWheelDelta());
        }, this);
	},

members : {

    /**
    * Clears the log contents
    */
    clear : function () {
		this.setHtml('');
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

		this.setHtml(message.toString().replace(' ', '&nbsp')
		    .split('\n').reduce(function (lines, line) {
			    return lines + '<span style="color:' + color + '">' + line + '<br/></span>';
		    }, this.getHtml())
		);
		this.getContentElement().scrollToY(1000000, true); 
	}
}
});

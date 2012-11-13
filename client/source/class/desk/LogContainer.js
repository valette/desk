/**
 * A log container
 */
qx.Class.define("desk.LogContainer", 
{
  extend : qx.ui.embed.Html,

  construct : function (message) {
    this.base(arguments);
    this.set({overflowY : 'auto',
          overflowX : 'auto',
          font : "monospace",
          padding: 3
    });
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
			message = message.toString().replace(' ', '&nbsp');
			var htmlMessage = '';
			var lines = message.split('\n');
			for (var i = 0; i < lines.length; i++) {
				var line = lines[i] + '<br/>';
				if (color) {
					htmlMessage += '<span style="color:' + color + '">' + line + '</span>';
				} else {
					htmlMessage += line;
				}
			}
      if (this.getHtml() === null){
        this.setHtml(htmlMessage);
      } else {
        this.setHtml(this.getHtml() + htmlMessage);        
      }
			this.getContentElement().scrollToY(1000000); 
    }
	}
});

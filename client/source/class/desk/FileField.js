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
      if (e.supportsType("fileBrowser")) {
        var originFileBrowser = e.getData("fileBrowser");
        this.setValue(originFileBrowser.getSelectedFiles()[0]);
      }
    }, this);
    return this;
  }
});
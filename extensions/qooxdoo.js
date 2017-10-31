"use strict";
/*global THREE desk async _ operative qx numeric MHD performance*/

var win = new qx.ui.window.Window();
win.set({
  layout : new qx.ui.layout.VBox(),
  caption : "Qoxdoo generator",
  width : 800,
  height : 400
});

var directory = new desk.FileField('ui/');
win.add(directory);

var container = new qx.ui.container.Composite(new qx.ui.layout.HBox());
win.add(container);

var button = new qx.ui.form.Button("generate");
button.addListener("execute", function(e) {
	button.setEnabled(false);
	result.clear();
	result.log("starting\n", "yellow");

	desk.Actions.execute({
		action : "qooxdoo_generator",
		stdout : true,
		output_directory : directory.getValue(),
		job : selectBox.getSelection()[0].getLabel()
	},
	{
		listener : function (message) {
			var color;
			switch (message.type) {
				case "stdout" : 
					color = 'white';
					break;
				case "stderr" : 
					color = 'red';
					break;
				default : return;
			}
			result.log( message.data, color );
		}
	},
	function (err, message) {
		button.setEnabled(true);
		result.log("finished\n", "yellow");
	});
});
container.add(button, {flex : 1});

var selectBox = new qx.ui.form.SelectBox();
['build', 'source', 'api', 'inspector', 'lint','dependencies'].forEach(
	function (job) {
		selectBox.add(new qx.ui.form.ListItem(job));
	}
);
container.add(selectBox);

var result = new desk.LogContainer();
result.setBackgroundColor('black');
win.add(result, {flex : 1});
win.open();
win.center();

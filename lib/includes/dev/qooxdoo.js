"use strict";
/*global THREE desk async _ operative qx numeric MHD performance*/

var win = new qx.ui.window.Window();
win.set({
  layout : new qx.ui.layout.VBox(),
  caption : "Qoxdoo generator",
  width : 800,
  height : 400
});

var directory = new desk.FileField('git/desk/client/application');
win.add(directory);

var container = new qx.ui.container.Composite();
container.setLayout(new qx.ui.layout.HBox());
win.add(container);

var button = new qx.ui.form.Button("generate");
button.addListener("execute", function(e) {
	button.setEnabled(false);
	result.clear();
	result.log("starting", "yellow");

	desk.Actions.execute({
		action : "qooxdoo_generator",
		stdout : true,
		output_directory : directory.getValue(),
		job : selectBox.getSelection()[0].getLabel()
	},
	{
		logHandler : function (type, message) {
			var color;
			switch (type) {
				case "stdout" : 
					color = 'white';
					break;
				case "stderr" : 
					color = 'red';
			}
			// filter out progress indicators...
			if (/[a-z0-9]/.test(message)) {
				result.log(message, color);
			}
		}
	},
	function (err, message) {
		button.setEnabled(true);
		result.log("finished", "yellow");
	});
});
container.add(button, {flex : 1});

var selectBox = new qx.ui.form.SelectBox();
var jobs = ['build', 'source', 'api', 'inspector', 'lint','dependencies'];
for (var key in jobs) {
	selectBox.add(new qx.ui.form.ListItem(jobs[key]));
}
container.add(selectBox);

var result = new desk.LogContainer('sssssssssssss');
result.setBackgroundColor('black');
win.add(result, {flex : 1});

win.open();
win.center();

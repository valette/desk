"use strict";
/*global THREE desk async _ operative qx numeric MHD performance*/

var win = new qx.ui.window.Window().set({
  layout : new qx.ui.layout.VBox(),
  caption : "GCC make",
  width : 600,
  height : 400
});

var container = new qx.ui.container.Composite(new qx.ui.layout.HBox());
win.add(container);

var directory = new desk.FileField('git/');
container.add(directory);
directory.addListener("changeValue", updateDirectories);

var subDir = new qx.ui.form.SelectBox();
container.add(subDir);

function updateDirectories() {
	subDir.removeAll();
	desk.FileSystem.readDir(directory.getValue(), function (err, files) {
		files.forEach(function (file) {
			if (!file.isDirectory) return;
			subDir.add(new qx.ui.form.ListItem(file.name));
		});
	});
}
updateDirectories();

container.add(new qx.ui.core.Spacer(50));

var button = new qx.ui.form.Button("make");
button.addListener("execute", function(e) {
button.setEnabled(false);
result.clear();
result.log("starting", "yellow");
desk.Actions.execute({
		action : "make",
		stdout : true,
		force_update : true,
		output_directory : directory.getValue() + "/" + subDir.getSelection()[0].getLabel(),
		number_of_concurrent_jobs : selectBox.getSelection()[0].getLabel()
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
			result.log(message.data, color);
		}
	},

	function (err, message) {
		button.setEnabled(true);
		result.log("finished", "yellow");
	});
});
container.add(button, {flex : 1});

var selectBox = new qx.ui.form.SelectBox().set({width : 60});
['24', '1'].forEach(function (n) {
	selectBox.add(new qx.ui.form.ListItem(n));  
});
container.add(selectBox);

var result = new desk.LogContainer('');
result.setBackgroundColor('black');
win.add(result, {flex : 1});
win.open();
win.center();

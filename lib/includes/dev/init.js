"use strict";
/*global THREE desk async _ operative qx numeric MHD performance*/

var button = desk.Actions.getSettingsButton();

var menu = new qx.ui.menu.Menu();
button.getMenu().add(new qx.ui.menu.Button("dev", null, null, menu));

['make', 'qooxdoo'].forEach(function (action) {
	var button = new qx.ui.menu.Button(action);
	button.addListener('execute', function () {
		desk.FileSystem.executeScript('dev/' + action + '.js');
	});
	menu.add(button);
});

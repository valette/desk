"use strict";
/*global THREE desk async _ operative qx numeric MHD performance*/

var button = desk.Actions.getSettingsButton();

var menu = new qx.ui.menu.Menu();
button.getMenu().add(new qx.ui.menu.Button("dev", null, null, menu));

var APIButton = new qx.ui.menu.Button("API documentation");
APIButton.addListener('execute', function () {
	var win = window.open(desk.FileSystem.getFileURL('ui/api'), '_blank');
	win.focus();
});
menu.add(APIButton);

var debugButton = new qx.ui.menu.Button("Debug mode");
debugButton.addListener('execute', function () {
	var win = window.open(desk.FileSystem.getFileURL('ui/source'), '_blank');
	win.focus();
});
menu.add(debugButton);

['make', 'qooxdoo'].forEach(function (action) {
	var button = new qx.ui.menu.Button(action);
	button.addListener('execute', function () {
		desk.FileSystem.executeScript('dev/' + action + '.js');
	});
	menu.add(button);
});

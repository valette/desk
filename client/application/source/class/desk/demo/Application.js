/* ************************************************************************

   Copyright: CNRS, INSERM, INSA-Lyon

   License: CeCILL B

   Authors: Sebastien Valette

************************************************************************ */

/**
 * @asset(desk/*)
 */

qx.Class.define("desk.demo.Application",
{
	extend : qx.application.Standalone,

	members :
	{

		main : function() {
			// Call super class
			this.base(arguments);

			// Enable logging in debug variant
			if (qx.core.Environment.get("qx.debug")) {
				// support native logging capabilities, e.g. Firebug for Firefox
				qx.log.appender.Native;
				// support additional cross-browser console. Press F7 to toggle visibility
				qx.log.appender.Console;
			}

			function getParameter( parameterName ) {
				parameterName = parameterName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
				var regex = new RegExp( "[\\?&]" + parameterName + "=([^&#]*)" );
				var results = regex.exec( window.location.href );
				if (results == null) {
					return null;
				} else {
					return results[1];
				}
			}

			var actions = desk.Actions.getInstance()
			desk.Actions.init(afterActionsInitialized);

			function afterActionsInitialized () {
				// first try to automatically launch startup script if it exists
				if (getParameter("noauto")) {
					next();
					return;
				}
				var initScript = 'code/init.js';
				desk.FileSystem.exists(initScript, function (exists) {
					if (exists) {
						desk.FileSystem.executeScript(initScript);
					} else {
						next();
					}
				});
			}

			function next() {
				var startupScript = getParameter("script");
				if (startupScript) {
					desk.FileSystem.executeScript(startupScript);
					return;
				}
				actions.buildUI();
				var menu = new qx.ui.menu.Menu();
				var button = new qx.ui.form.MenuButton("Places", null, menu);
				qx.core.Init.getApplication().getRoot().add(button, {top : 0, left : 0});

				var dataDirs = actions.getSettings().dataDirs;
				Object.keys(dataDirs).sort().forEach(function (dir) {
					var button = new qx.ui.menu.Button(dir);
					button.addListener("execute", function (e) {
						new desk.FileBrowser(e.getTarget().getLabel(), {standalone : true});
					});
					menu.add(button);
				});

				new desk.FileBrowser(getParameter("rootDir"), {standalone : true});
			}
		}
	}
});

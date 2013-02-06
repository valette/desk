/* ************************************************************************

   Copyright:

   License:

   Authors:

************************************************************************ */

/* ************************************************************************

#asset(desk/*)

************************************************************************ */

/**
 * This is the main application class of your custom application "desk"
 */
qx.Class.define("desk.demo.Application",
{
	extend : qx.application.Standalone,
	//extend : qx.application.Inline,

	/*
	*****************************************************************************
	MEMBERS
	*****************************************************************************
	*/

	members :
	{
		/**
		* This method contains the initial application code and gets called 
		* during startup of the application
		* 
		* @lint ignoreDeprecated(alert)
		*/

		main : function()
		{
			// Call super class
			this.base(arguments);

			// Enable logging in debug variant
			if (qx.core.Environment.get("qx.debug"))
			{
				// support native logging capabilities, e.g. Firebug for Firefox
				qx.log.appender.Native;
				// support additional cross-browser console. Press F7 to toggle visibility
				qx.log.appender.Console;
			}

			function getParameter( parameterName )
			{
				parameterName = parameterName.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
				var regexS = "[\\?&]"+parameterName+"=([^&#]*)";
				var regex = new RegExp( regexS );
				var results = regex.exec( window.location.href );
				if( results == null ) {
					return null;
				} else {
					return results[1];
				}
			}

			var initScript = 'code/init.js'
			// first try to automatically launch startup script if it exists
			if (getParameter("noauto") === null) {
				desk.FileSystem.exists(initScript, function (exists) {
					if (exists) {
						desk.FileSystem.executeScript(initScript);
					}
					else {
						Init();
					}
				});
			}
			else {
				Init();
			}

			function Init() {
				var startupScript = getParameter("script");
				if (startupScript) {
					desk.FileSystem.executeScript(startupScript);
				}
				else {
					var actions = desk.Actions.getInstance()
					actions.buildUI();
					desk.Actions.init(function () {
						var menu = new qx.ui.menu.Menu();
						var button = new qx.ui.form.MenuButton("Places", null, menu);
						qx.core.Init.getApplication().getRoot().add(button, {top : 0, left : 0});

						function openFileBrowser (e) {
							new desk.FileBrowser(e.getTarget().getLabel());
						}

						var dataDirs = actions.getSettings().dataDirs;
						var dirs = Object.keys(dataDirs);
                        dirs.sort();
						for (var i = 0; i != dirs.length; i++) {
							var dir = dirs[i];
							var button = new qx.ui.menu.Button(dir);
							button.addListener("execute", openFileBrowser);
							menu.add(button);
						}
						new desk.FileBrowser(getParameter("rootDir"));
					});
				}
			}
		}
	}
});

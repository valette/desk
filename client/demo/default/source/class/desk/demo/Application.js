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
			  if( results == null )
				return null;
			  else
				return results[1];
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
					desk.Actions.getInstance().buildUI();
					var menu = new qx.ui.menu.Menu();
					var button = new qx.ui.form.MenuButton("Places", null, menu);

					function openFileBrowser (e) {
						var files = new desk.FileBrowser(e.getTarget().getLabel());
					}

					var button1 = new qx.ui.menu.Button('data');
					var button2 = new qx.ui.menu.Button('actions');
					var button3 = new qx.ui.menu.Button('code');
					button1.addListener("execute", openFileBrowser);
					button2.addListener("execute", openFileBrowser);
					button3.addListener("execute", openFileBrowser);
					menu.add(button1);
					menu.add(button2);
					menu.add(button3);
					qx.core.Init.getApplication().getRoot().add(button, {top : 0, left : 0});
					var myDesk = new desk.FileBrowser(getParameter("rootDir"));
				}
			}
		}
	}
});

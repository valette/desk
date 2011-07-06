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
qx.Class.define("desk.Application",
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

			function fileClicked(file) {
				var extension=file.substring(file.length-4, file.length);
				if ((extension==".vtk")||(extension==".xml"))
				{
				var meshView=new desk.meshView(file);
				qx.core.Init.getApplication().add(meshView);
				}
			}

			var myBrowser=new desk.fileBrowser();
			myBrowser.setFileHandler(fileClicked);
			this.getRoot().add(myBrowser);

		}
	}
});

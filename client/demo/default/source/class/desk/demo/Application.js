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

			var startupScript = getParameter("script");
			if (startupScript) {
				desk.FileSystem.executeScript(startupScript);
			}
			else {
				desk.Actions.getInstance().buildUI();
				var myActions=new desk.FileBrowser("actions/");
				var myDesk=new desk.FileBrowser(getParameter("rootDir"));
			}
		}
	}
});

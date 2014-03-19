/* ************************************************************************

   Copyright: CNRS, CREATIS

   License: CeCILL-b

   Authors: S. Valette

************************************************************************ */

/* ************************************************************************


************************************************************************ */

/**
 * This is the main application class "deskUI"
 *
 * @asset(deskui/*)
 * @use(desk.MeshViewer)
 * @use (qx.ui.root.Inline)
 */
qx.Class.define("deskui.Application",
{
	extend : qx.application.Inline,

	members :
	{

		main : function()
		{
			// Call super class
			this.base(arguments);

			// Enable logging in debug variant
			if (qx.core.Environment.get("qx.debug")) {
				// support native logging capabilities, e.g. Firebug for Firefox
				qx.log.appender.Native;
				// support additional cross-browser console. Press F7 to toggle visibility
				qx.log.appender.Console;
			}

			desk.Actions.RPC = false;
			var actions = desk.Actions.getInstance();
		}
	}
});

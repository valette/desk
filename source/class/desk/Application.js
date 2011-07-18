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

			function fileClicked(node) {
				var modificationTime=myBrowser.getNodeMTime(node);
				var file=myBrowser.getNodeURL(node);
				var extension=file.substring(file.length-4, file.length);
				if (extension==".vtk")
				{
					var meshView=new desk.meshView(file);
					qx.core.Init.getApplication().getRoot().add(meshView);
				}
				else if ((extension==".png")||(extension==".jpg")||(extension==".bmp"))
				{
					var imageView=new desk.imageView(file);
					qx.core.Init.getApplication().getRoot().add(imageView);
				}
				else if (extension==".xml")
				{
					var xmlhttp=new XMLHttpRequest();
					xmlhttp.open("GET",file+"?nocache=" + myBrowser.getNodeMTime(node),false);
					xmlhttp.send();
					var xmlDoc=xmlhttp.responseXML;
					
					if (xmlDoc.getElementsByTagName("mesh").length!=0)
					{
						var meshView=new desk.meshView(file);
						qx.core.Init.getApplication().getRoot().add(meshView);
					}
					else if (xmlDoc.getElementsByTagName("volume").length!=0)
					{
						var volView=new desk.volView(file);
						qx.core.Init.getApplication().getRoot().add(volView);
					}
					else
						alert ("xml file of unknown type!");
				}
				else if (extension==".mhd")
				{
					var volView=new desk.volView(node, myBrowser);
					qx.core.Init.getApplication().getRoot().add(volView);
				}
				else
					alert("extension "+extension+" not supported!");
				
			}

			function extractMeshes (node)
			{
				var file=node.label;

				var extension=file.substring(file.length-4, file.length);
				if (extension!=".mhd")
					alert ("Error ! extension "+extension+" not supported!");
				else
				{
					var meshView=new desk.meshView(node, myBrowser);
					qx.core.Init.getApplication().getRoot().add(meshView);
				}
			}

			var myBrowser=new desk.fileBrowser();
			myBrowser.setFileHandler(fileClicked);
			myBrowser.addAction("extract meshes",extractMeshes);
			this.getRoot().add(myBrowser);
		}
	}
});

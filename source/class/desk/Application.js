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

      var win = new qx.ui.window.Window("Files");
//      win.setPadding(10);
      win.setLayout(new qx.ui.layout.VBox());
		win.setAllowClose(false);
		win.setAllowMinimize(false);
      win.open();
      var doc=this.getRoot();
     this.getRoot().add(win);

      var tree = new qx.ui.tree.Tree().set({width : 400, height : 400 });

      var root = new qx.ui.tree.TreeFolder("data");
      root.setOpen(true);
      tree.setRoot(root);
      root.setUserData("parent_directory","");
      win.add(tree);

	function getNodeURL(node)
	{
		return ("http://vip.creatis.insa-lyon.fr:8080/visu/"+getNodePath(node));
	}

	function getNodePath(node)
	{
		if (node.getLabel()=="data")
			return ("data");
		else
		{
			var parent=node.getParent().getUserData("parent_directory");
			if (parent=="")
				return (node.getParent().getLabel()+"\/"+node.getLabel());
			else			
				return (node.getParent().getUserData("parent_directory")+
					"\/"+
					node.getParent().getLabel()+
					"\/"+
					node.getLabel());
		}
	}

	function fileClicked(node) {
		var file=getNodeURL(node);
		var extension=file.substring(file.length-4, file.length);
		if ((extension==".vtk")||(extension==".xml"))
			displayMesh(file);
	}

	function displayMesh(file) {
	//	var doc=this.getRoot();

		var win = new qx.ui.window.Window(file);

		var layout = new qx.ui.layout.VBox();
		win.setLayout(layout);
		win.setAllowClose(true);
		win.setAllowMinimize(false);
		win.setResizable(true,true,true,true);
		win.setContentPadding(0);
		win.open();

		var iframe = new qx.ui.embed.Iframe().set({
			width: 400,
			height: 300,
			minWidth: 200,
			minHeight: 150,
			source: "http://vip.creatis.insa-lyon.fr:8080/visu/meshView/"+"?"+file,
			decorator : null
			});
		win.add(iframe, {flex: 1});
		doc.add(win);
		}

	function expandDirectoryListing(node) {
	node.removeAll();
	 var ajax = new XMLHttpRequest();
		ajax.onreadystatechange = function()
		{
				if(this.readyState == 4 && this.status == 200)
				{
					//	alert("ajax.responseText : " + ajax.responseText);
						var files=ajax.responseText.split("\n");
					//	alert (files.length+" files");
						for (var i=0;i<files.length;i++)
						{
							var splitfile=files[i].split(" ");
							if (splitfile[0]!="")
							{
								if (splitfile[1]=="file")
								{
									var filenode=new qx.ui.tree.TreeFile(splitfile[0]);
									node.add(filenode);
									filenode.addListener("click", function(event){fileClicked(this);},directorynode);
								}
								else
								{
									var directorynode=new qx.ui.tree.TreeFolder(splitfile[0]);
									node.add(directorynode);
									directorynode.setUserData("parent_directory", getNodePath(node));
									directorynode.addListener("click", function(event){expandDirectoryListing(this);},
											directorynode);
								}
							}
						}
				}
				else if (this.readyState == 4 && this.status != 200)
				{
						// fetched the wrong page or network error...
						alert('"Fetched the wrong page" OR "Network error"');
				}
		};
		ajax.open("POST", "/visu/listdir.php", false);
		ajax.send(getNodePath(node));
	 }

     expandDirectoryListing(root);
     root.addListener("click", function(event){
			        		            expandDirectoryListing(this);
       							     },root);

//	displayMesh("http://vip.creatis.insa-lyon.fr:8080/visu/meshView/ADAM/adam.xml");
	var meshView=new desk.meshView();
	meshView.open();
	doc.add(meshView);
    }
  }
});

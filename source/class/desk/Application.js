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

//			var myBrowser=new desk.fileBrowser();
			var actions=new desk.actions();
//			this.getRoot().add(myBrowser);
/*
			if (0)
			{
			var doc = this.getRoot();

      		var btn = new com.zenesis.qx.upload.UploadButton("Add File(s)", "com/zenesis/qx/upload/test.png");
      		var lst = new qx.ui.form.List();
      		
      		// Uploader controls the upload process; btn is the widget that will have the input[type=file]
      		// attached, and "/demoupload" is the path files will be uploaded to (i.e. it's the value used
      		// for the form's action attribute)
      		//
//      		var uploader = new com.zenesis.qx.upload.UploadMgr(btn, "http://www.zenesis.com/demoupload");
      		var uploader = new com.zenesis.qx.upload.UploadMgr(btn, "http://vip.creatis.insa-lyon.fr:8080/visu/desk/php/upload/php.php");
      		uploader.addListener("addFile", function(evt) {
      			var file = evt.getData(),
      				item = new qx.ui.form.ListItem(file.getFilename(), null, file);
      			lst.add(item);
      			
      			// On modern browsers (ie not IE) we will get progress updates
      			var progressListenerId = file.addListener("changeProgress", function(evt) {
      				this.debug("Upload " + file.getFilename() + ": " + evt.getData() + " / " + file.getSize() + " - " +
      						Math.round(evt.getData() / file.getSize() * 100) + "%");
      				item.setLabel(file.getFilename() + ": " + evt.getData() + " / " + file.getSize() + " - " +
      						Math.round(evt.getData() / file.getSize() * 100) + "%");
      			}, this);
      			
      			// All browsers can at least get changes in state (ie "uploading", "cancelled", and "uploaded")
      			var stateListenerId = file.addListener("changeState", function(evt) {
      				var state = evt.getData();
      				
      				this.debug(file.getFilename() + ": state=" + state + ", file size=" + file.getSize() + ", progress=" + file.getProgress());
      				
      				if (state == "uploading")
      					item.setLabel(file.getFilename() + " (Uploading...)");
      				else if (state == "uploaded")
      					item.setLabel(file.getFilename() + " (Complete)");
      				else if (state == "cancelled")
      					item.setLabel(file.getFilename() + " (Cancelled)");
      				
      				if (state == "uploaded" || state == "cancelled") {
          				file.removeListenerById(stateListenerId);
          				file.removeListenerById(progressListenerId);
      				}
      				
      			}, this);
      			
      			this.debug("Added file " + file.getFilename());
      		}, this);
      		
      		doc.add(btn, { left: 50, top: 115 });
      		
      		// Create a button to cancel the upload selected in the list
      		var btnCancel = new qx.ui.form.Button("Cancel upload", "qx/icon/Oxygen/22/actions/process-stop.png");
      		btnCancel.set({ enabled: false });
      		lst.addListener("changeSelection", function(evt) {
      			var sel = evt.getData(),
      				item = sel.length ? sel[0] : null,
      				file = item ? item.getModel() : null;
      			btnCancel.setEnabled(file != null && file.getState() == "uploading");
      		}, this);
      		btnCancel.addListener("execute", function(evt) {
      			var sel = lst.getSelection(),
      				item = sel[0],
      				file = item.getModel();
      			if (file.getState() == "uploading")
      				uploader.cancel(file);
      		}, this);
      		
      		// Auto upload? (default=true)
      		var cbx = new qx.ui.form.CheckBox("Automatically Upload");
      		cbx.setValue(true);
      		cbx.addListener("changeValue", function(evt) {
      			uploader.setAutoUpload(evt.getData());
      		}, this);
      		
      		// add them to the UI
      		lst.set({ width: 500 });
      		doc.add(cbx, { left: 170, top: 115 });
      		doc.add(lst, { left: 170, top: 130 });
      		doc.add(btnCancel, { left: 690, top: 115 });
      		
      		// Header
      		var comp = new qx.ui.container.Composite(new qx.ui.layout.HBox());
      		comp.add(new qx.ui.basic.Image("com/zenesis/qx/upload/banner.png").set({ padding: [ 0, 30 ] }));
      		comp.add(new qx.ui.basic.Label("UploadMgr Contrib Demo").set({ font: new qx.bom.Font(28, ["Arial"]), padding: [22, 20], textColor: "white", allowGrowX: true }), { flex: 1 });
      		comp.add(new qx.ui.basic.Image("com/zenesis/qx/upload/logo.gif"));
      		doc.add(comp, { top: 0, left: 0, right: 0 });
      		comp.setDecorator(new qx.ui.decoration.Background().set({
      			backgroundImage: "com/zenesis/qx/upload/banner-bg.png",
      			backgroundPositionX: 0}));      		
      		// Descriptions
      		var lbl = new qx.ui.basic.Label("This is a demo for the Qooxdoo UploadMgr contrib which can be found at <a href='http://qooxdoo.org/contrib/project/uploadmgr'>http://qooxdoo.org/contrib/project/uploadmgr</a>; " +
				"UploadMgr supports background uploads with progress feedback for modern browsers with fallback for older browsers (eg IE6-IE8).")
				.set({ rich: true, width: 700 });
			doc.add(lbl, { left: 100, top: 340 });
	  		var lbl = new qx.ui.basic.Label("You can upload anything you like to test this (or as many as you like); the files will be deleted after the upload completes.")
				.set({ rich: true, width: 700 });
			doc.add(lbl, { left: 100, top: 390 });
			}*/
		}
	}
});

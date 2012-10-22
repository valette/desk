qx.Class.define("desk.Uploader", 
{
	extend : qx.core.Object,

	events : {
		"upload" : "qx.event.type.Event"
	},

	construct : function( uploadDir )
	{
		uploadDir = uploadDir || 'data/upload';
		this.base( arguments );

		var win = new qx.ui.window.Window( 'Upload to '+uploadDir );
		win.setLayout( new qx.ui.layout.VBox() );
		win.setWidth( 450 );

  		var btn = new com.zenesis.qx.upload.UploadButton( "Add File(s)" );
  		var lst = new qx.ui.form.List();
  		var uploadCount = 0;
  
  		var uploader = new com.zenesis.qx.upload.UploadMgr( btn, 
			desk.FileSystem.getActionURL('upload'));
  		
  		// Parameter tp be added to all uploads (can be overridden by individual files)
  	//	uploader.setParam("myGlobalParam", "global123");
  		
  		// Optionally restrict the max number of simultaneous uploads (default is 5)
  		//uploader.getUploadHandler().setMaxConnections(1);
  		
  		uploader.addListener( "addFile", function( evt ) {
  			var file = evt.getData(),
  				item = new qx.ui.form.ListItem( file.getFilename() + " (queued for upload)", null, file );
  			lst.add(item);

  			// Set a parameter - each uploaded file has their own set, which can override those set
  			//	globally against the upload manager
  			++uploadCount;
      		file.setParam( 'uploadDir', uploadDir );
      		if ( uploadCount % 2 == 0)
          		file.setParam("myGlobalParam", "overridden-global-value");
      		
  			// On modern browsers (ie not IE) we will get progress updates
  			var progressListenerId = file.addListener("changeProgress", function(evt) {
  				item.setLabel( file.getFilename() + ": " + evt.getData() + " / " + file.getSize() + " - " +
  						Math.round(evt.getData() / file.getSize() * 100 ) + "%" );
  			}, this);
  			
  			// All browsers can at least get changes in state (ie "uploading", "cancelled", and "uploaded")
  			var stateListenerId = file.addListener( "changeState", function( evt ) {
  				var state = evt.getData();
  				
  				if ( state == "uploading" )
  					item.setLabel( file.getFilename() + " (Uploading...)" );
  				else if (state == "uploaded") {
  					item.setLabel( file.getFilename() + " (Complete)" );
  					this.fireEvent("upload");
  				}
  				else if ( state == "cancelled" )
  					item.setLabel( file.getFilename() + " (Cancelled)" );
  				
  				if ( state == "uploaded" || state == "cancelled" ) {
      				file.removeListenerById( stateListenerId );
      				file.removeListenerById( progressListenerId );
  				}
  			}, this );
  			
  		}, this );
  		
  		win.add(btn);
  		
  		// Create a button to cancel the upload selected in the list
  		var btnCancel = new qx.ui.form.Button("Cancel upload");
  		btnCancel.set({ enabled: false });
  		lst.addListener("changeSelection", function(evt) {
  			var sel = evt.getData(),
  				item = sel.length ? sel[0] : null,
  				file = item ? item.getModel() : null;
  			btnCancel.setEnabled(file != null && (file.getState() == "uploading" || file.getState() == "not-started"));
  		}, this);
  		btnCancel.addListener("execute", function(evt) {
  			var sel = lst.getSelection(),
  				item = sel[0],
  				file = item.getModel();
  			if (file.getState() == "uploading" || file.getState() == "not-started")
  				uploader.cancel(file);
  		}, this);
  		
  		// Auto upload? (default=true)
  		var cbx = new qx.ui.form.CheckBox("Automatically Upload");
  		cbx.setValue(true);
  		cbx.addListener("changeValue", function(evt) {
  			uploader.setAutoUpload(evt.getData());
  		}, this);
  		
  		// add them to the UI
  		win.add(cbx);
  		win.add(lst, {flex : 1});
  		win.add(btnCancel);
  		win.open();
	}
});

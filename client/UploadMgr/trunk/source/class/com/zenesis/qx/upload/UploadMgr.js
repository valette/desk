/* ***********************************************************************

   UploadMgr - provides an API for uploading one or multiple files
   with progress feedback (on modern browsers), does not block the user 
   interface during uploads, supports cancelling uploads.

   http://qooxdoo.org

   Copyright:
     2011 Zenesis Limited, http://www.zenesis.com

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     
     This software is provided under the same licensing terms as Qooxdoo,
     please see the LICENSE file in the Qooxdoo project's top-level directory 
     for details.

   Authors:
     * John Spackman (john.spackman@zenesis.com)

************************************************************************/

/*
#require(qx.event.handler.Input)
 */

/**
 * Manages uploading of files to the server; this class can use any suitable
 * widget to attach the input[type=file] to, provided the widget includes
 * com.zenesis.qx.upload.MUploadButton. 
 * 
 * Uploader will use XhrHandler to upload via XMLHttpRequest if supported or 
 * will fall back to FormHandler.
 */
qx.Class.define("com.zenesis.qx.upload.UploadMgr", {
	extend: qx.core.Object,
	
	construct: function(widget, uploadUrl) {
		this.base(arguments);
		this.__widgetsData = {};
		if (widget)
			this.addWidget(widget);
		if (uploadUrl)
			this.setUploadUrl(uploadUrl);
	},
	
	events: {
		/**
		 * Fired when a file is added to the queue; data is the com.zenesis.qx.upload.File
		 */
		"addFile": "qx.event.type.Data",
		
		/**
		 * Fired when a file starts to be uploaded; data is the com.zenesis.qx.upload.File
		 */
		"beginUpload": "qx.event.type.Data",
		
		/**
		 * Fired when a file has been uploaded; data is the com.zenesis.qx.upload.File
		 */
		"completeUpload": "qx.event.type.Data",
		
		/**
		 * Fired when a file upload has been cancelled; data is the com.zenesis.qx.upload.File
		 */
		"cancelUpload": "qx.event.type.Data"
	},
	
	properties: {
		/**
		 * The URL to upload to
		 */
		uploadUrl: {
			check: "String",
			nullable: false,
			init: "",
			event: "changeUploadUrl"
		},
		
		/**
		 * Whether to automatically start uploading when a file is added (default=true)
		 */
		autoUpload: {
			check: "Boolean",
			init: true,
			nullable: false,
			event: "changeAutoUpload",
			apply: "_applyAutoUpload"
		},
		
		/**
		 * Whether to support multiple files (default=true); this is not supported on
		 * older browsers
		 */
		multiple: {
			check: "Boolean",
			init: true,
			nullable: false,
			event: "changeMultiple",
			apply: "_applyMultiple"
		},
		
		/**
		 * Prefix to apply to the name of input fields
		 */
		inputNamePrefix: {
			check: "String",
			init: "uploadMgrInput",
			nullable: false,
			event: "changeInputNamePrefix"
		},
		
		/**
		 * Whether the server can only handle multipart/form-data content type
		 */
		requireMultipartFormData: {
			check: "Boolean",
			init: true,
			nullable: false,
			event: "changeRequireMultipartFormData",
			apply: "_applyRequireMultipartFormData"
		}
	},
	
	members: {
		__widgetsData: null,
		__inputSerial: 0,
		__uploadHandler: null,
		__params: null,
		
		/**
		 * Adds a widget which is to have an input[type=file] attached; this would typically be an 
		 * instance of com.zenesis.qx.upload.UploadButton (see com.zenesis.qx.upload.MUploadButton
		 * for implementing for other widgets)
		 */
		addWidget: function(widget) {
			var appearId = widget.addListenerOnce("appear", function(evt) {
				var data = this.__widgetsData[widget.toHashCode()];
				if (data) {
					data.appearId = null;
					var container = widget.getContainerElement();
					container.setStyle("overflow", "hidden");
					container.addAt(this._createInputElement(widget), 0);
					this.__fixupSize(widget);
				}
			}, this);
			var keydownId = null;
			if (qx.core.Environment.get("engine.name") != "gecko") {
				keydownId = widget.addListener("keydown", function(evt) {
					var data = this.__widgetsData[widget.toHashCode()];
					if (data && data.inputElement) {
						var dom = data.inputElement.getDomElement();
						if (dom && typeof dom.click == "function") {
							//dom.focus();
							dom.click();
						}
					}
				}, this);
			}
			this.__widgetsData[widget.toHashCode()] = { appearId: appearId, keydownId: keydownId, widget: widget, inputElement: null };
			widget.addListener("resize", function(evt) {
				this.__fixupSize(widget);
			}, this);
		},
		
		/**
		 * Removes a widget
		 * @param widget
		 */
		removeWidget: function(widget) {
			var data = this.__widgetsData[widget.toHashCode()];
			if (data) {
				if (data.appearId)
					widget.removeListener(data.appearId);
				if (data.keydownId)
					widget.removeListener(data.keydownId);
				delete this.__widgetsData[widget.toHashCode()];
			}
		},
		
		/**
		 * Sets a parameter value to be sent with the file
		 * @param name {String} name of the parameter
		 * @param value {String} the value of the parameter, or null to delete a previous parameter
		 */
		setParam: function(name, value) {
			if (value !== null && typeof value != "string")
				value ="" + value;
			if (!this.__params)
				this.__params = {};
			this.__params[name] = value;
		},
		
		/**
		 * Returns a parameter value to be sent with the file
		 * @param name
		 * @returns {Boolean}
		 */
		getParam: function(name) {
			return this.__params && this.__params[name];
		},
		
		/**
		 * Returns a list of parameter names
		 * @returns {Array}
		 */
		getParamNames: function() {
			var result = [];
			if (this.__params)
				for (var name in this.__params)
					result.push(name);
			return result;
		},
		
		/**
		 * Helper method that corrects the size of the input element to match the size of the widget
		 * @param widget
		 */
		__fixupSize: function(widget) {
			var data = this.__widgetsData[widget.toHashCode()];
			if (data && data.inputElement) {
				var bounds = widget.getBounds();
				data.inputElement.setStyles({
					width: bounds.width + "px",
					height: bounds.height + "px"
				});
			}
		},
		
		/**
		 * Callback for changes to the autoUpload property
		 * @param value
		 * @param oldValue
		 */
		_applyAutoUpload: function(value, oldValue) {
			this.getUploadHandler().beginUploads();
		},
		
		/**
		 * Callback for changes to the multiple property
		 * @param value
		 * @param oldValue
		 */
		_applyMultiple: function(value, oldValue) {
			for (var hash in this.__widgetsData) {
				var data = this.__widgetsData[hash];
				if (data.inputElement)
					data.inputElement.setMultiple(value);
			}
		},
		
		/**
		 * Callback for changes to the requireMultipartFormData property
		 */
		_applyRequireMultipartFormData: function(value, oldValue) {
			if (this.__uploadHandler)
				throw new Error("Changing the requireMultipartFormData property of " + this + " has no effect once uploads have started");
		},
		
		/**
		 * Cancels a file being uploaded
		 * @param file
		 */
		cancel: function(file) {
			this.getUploadHandler().cancel(file);
		},
		
		/**
		 * Cancels all files being uploaded
		 * @param file
		 */
		cancelAll: function() {
			this.getUploadHandler().cancelAll();
		},
		
		/**
		 * Creates the input[type=file] element
		 * @returns
		 */
		_createInputElement: function(widget) {
			var data = this.__widgetsData[widget.toHashCode()],
				name = this.getInputNamePrefix() + '-' + (++this.__inputSerial);
			qx.core.Assert.assertNull(data.inputElement);
			var elem = data.inputElement = new com.zenesis.qx.upload.InputElement(widget, this.getMultiple(), name);
	        elem.addListenerOnce("change", qx.lang.Function.bind(this._onInputChange, this, elem));
	
	        return elem;
		},
		
		/**
		 * Resets the input element - ie discards the current one (which presumably has already
		 * been queued for uploading) and creates a new one 
		 */
		_resetInputElement: function(widget) {
			var data = this.__widgetsData[widget.toHashCode()],
				elem = data.inputElement,
				container = widget.getContainerElement();
			data.inputElement = null;
			container.remove(elem);
			container.addAt(this._createInputElement(widget), 0);
		},
		
		/**
		 * Callback for changes to the input[ty=file]'s value, ie this is called when the user
		 * has selected a file to upload
		 * @param evt
		 */
		_onInputChange: function(elem, evt) {
			var widget = elem.getWidget();
			
			this.getUploadHandler().addFile(elem.getDomElement());
			if (this.getAutoUpload())
				this.getUploadHandler().beginUploads();
			this._resetInputElement(widget);
		},
		
		/**
		 * Returns the upload handler
		 * @returns
		 */
		getUploadHandler: function() {
			if (!this.__uploadHandler) {
				if (com.zenesis.qx.upload.XhrHandler.isSupported(this.isRequireMultipartFormData()))
					this.__uploadHandler = new com.zenesis.qx.upload.XhrHandler(this);
				else
					this.__uploadHandler = new com.zenesis.qx.upload.FormHandler(this);
			}
			return this.__uploadHandler;
		}
	}
});
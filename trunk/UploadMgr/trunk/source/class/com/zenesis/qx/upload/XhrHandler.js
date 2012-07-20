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

     Parts of this code is based on the work by Andrew Valums (andrew@valums.com)
     and is covered by the GNU GPL and GNU LGPL2 licenses; please see
     http://valums.com/ajax-upload/.

   Authors:
     * John Spackman (john.spackman@zenesis.com)

************************************************************************/
/*
#ignore(File)
#ignore(FileReader)
#ignore(FormData)
 */
/**
 * Implementation of AbstractHandler that uses XMLHttpRequest; this is based on work 
 * at http://valums.com/ajax-upload/.
 * 
 * Call com.zenesis.qx.upload.XhrHandler.isSupported() to check whether this class
 * can be used (otherwise use FormHandler)
 */
qx.Class.define("com.zenesis.qx.upload.XhrHandler", {
	extend: com.zenesis.qx.upload.AbstractHandler,
	
	members: {
		/*
		 * @Override
		 */
		_createFile: function(input) {
			var bomFiles = input.files;
	        if (!bomFiles || !bomFiles.length)
	            this.debug("No files found to upload via XhrHandler");
	        
	        var files = [];
	        for (var i = 0; i < bomFiles.length; i++) {
	        	var bomFile = bomFiles[i];
			    var id = "upload-" + this._getUniqueFileId(),
			    	// fix missing name in Safari 4
			    	//filename = bomFile.fileName != null ? bomFile.fileName : bomFile.name,
			    	filename = typeof bomFile.name != "undefined" ? bomFile.name : bomFile.fileName,
			    	file = new com.zenesis.qx.upload.File(bomFile, filename, id),
			    	//fileSize = bomFile.fileSize != null ? bomFile.fileSize : bomFile.size;
			    	fileSize = typeof bomFile.size != "undefined" ? bomFile.size : bomFile.fileSize;
			    file.setSize(fileSize);
			    files.push(file);
	        }
		    
			return files;
		},
		
		/*
		 * @Override
		 */
		_doUpload: function(file) {
	        var xhr = new XMLHttpRequest();
	        var self = this;
	        
	        file.setUserData("com.zenesis.qx.upload.XhrHandler", xhr);
	                                        
	        xhr.upload.onprogress = function(e){
	        	//self.debug("onprogress: lengthComputable=" + e.lengthComputable + ", total=" + e.total + ", loaded=" + e.loaded);
	            if (e.lengthComputable) {
	            	file.setSize(e.total);
	            	file.setProgress(e.loaded);
	            }
	        };

	        xhr.onreadystatechange = function(){            
	            if (xhr.readyState == 4) {
	                var response = xhr.responseText;
	                //self.debug("xhr server status=" + xhr.status + ", responseText=" + response);
	                file.setUserData("com.zenesis.qx.upload.XhrHandler", null);
	                self._onCompleted(file, response);
	            }                    
	        };
	        
	        if (typeof FormData == "function" || typeof FormData == "object") {
	        	var fd = new FormData();
	        	
		        // build query string
		        var action = this._getUploader().getUploadUrl(),
		        	params = this._getMergedParams(file);
		        for (var name in params)
		        	fd.append(name, encodeURIComponent(params[name]));
		        fd.append("file", file.getBrowserObject());

		        xhr.open("POST", action, true);
		        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		        xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.getFilename()));
		        xhr.send(fd);
		        
	        } else {
	        	var browserFile = file.getBrowserObject();
	        	var boundary = "--------FormData" + Math.random(),
	        		body = "",
	        		action = this._getUploader().getUploadUrl(),
		        	params = this._getMergedParams(file);
		        for (var name in params) {
		        	body += "--" + boundary + "\r\n";
		        	body += "Content-Disposition: form-data; name=\""+ name +"\";\r\n\r\n";
	                body += params[name] + "\r\n";
		        }
	        	body += "--" + boundary + "\r\n";
	            body += "Content-Disposition: form-data; name=\"file\"; filename=\"" + file.getFilename() + "\"\r\n";
	            body += "Content-Type: "+ (browserFile.type||"application/octet-stream") +"\r\n\r\n";
	            
	        	function sendAsMime(binaryData) {
	                body += binaryData + "\r\n";
	                body += "--" + boundary + "--";
	                
			        xhr.open("POST", action, true);
			        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			        xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.getFilename()));
			        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
			        xhr.send(body);
	        	}
	        	if (typeof browserFile.getAsBinary == "function") {
	        		sendAsMime(browserFile.getAsBinary());
	        	} else {
	        		var reader = new FileReader();
	        		reader.onload = function(evt) {
	        			sendAsMime(evt.target.result);
	        		};
	        		reader.readAsBinaryString(browserFile);
	        	}
	        }
		},
		
		/*
		 * @Override
		 */
		_doCancel: function(file) {
			var xhr = file.getUserData("com.zenesis.qx.upload.XhrHandler");
			if (xhr) {
				xhr.abort();
				file.setUserData("com.zenesis.qx.upload.XhrHandler", null);
			}
		}
	},
	
	statics: {
		/**
		 * Detects whether this handler is support on the current browser
		 * @returns {Boolean}
		 */
		isSupported: function(requireMultipartFormData) {
		    var input = document.createElement('input');
		    input.type = 'file';        
		    
		    var isSupported =
		        'multiple' in input &&
		        typeof File != "undefined" &&
		        typeof (new XMLHttpRequest()).upload != "undefined";
		    
		    return isSupported;
		}
	}
});
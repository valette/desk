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

/**
 * This mixin provides a trivial way to make any widget suitable as a widget
 * for Uploader - the only trick is that the capture and releaseCapture methods 
 * in qx.ui.core.Widget must not be fired.
 */
qx.Mixin.define("com.zenesis.qx.upload.MUploadButton", {
	members: {
	    // overridden
	    capture : qx.lang.Function.empty,

	    // overridden
	    releaseCapture : qx.lang.Function.empty
	}
});
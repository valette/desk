/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2008 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Martin Wittemann (martinwittemann)

************************************************************************ */

/**
 * @ignore(require)
 * @ignore(ace.*)
*/

/**
 * Container for the ACE source code editor.
 */
qx.Class.define("desk.AceContainer", {
	extend : qx.ui.container.Composite,

	/**
	* Constructor.
	*/
	construct : function() {
		this.base(arguments);
		this.setLayout(new qx.ui.layout.VBox());

		// plain text area
		this.__textarea = new qx.ui.form.TextArea().set({wrap : false});
		this.add(this.__textarea, {flex : 1});

		this.__editor = new qx.ui.core.Widget();
		this.__editor.addListenerOnce("appear", this.__loadAce, this);
		this.__editor.setVisibility("excluded");
		this.add(this.__editor, {flex : 1});
	},

	members : {
		/**
		 * Sets the language mode
		 * @param mode{String} mode : "javascript" or "c_cpp"
		 */
		setMode : function (mode) {
			this.__mode = mode;
		},

		__mode : 'javascript',

		__textarea : null,
		__highlighted : false,
		__editor : null,
		__ace : null,
		__fontSize : 14,

		/**
		* Returns the underlying ACE object
		* @return {Object} the ace editor
		*/
		getAce: function() {
			return this.__ace;
		},

		__loadAce : function () {
			var baseURL = desk.FileSystem.getInstance().getBaseURL() + 'ext/ace/';
			desk.FileSystem.includeScripts([baseURL + 'ace.js',
			baseURL + 'mode-javascript.js',
			baseURL + 'mode-c_cpp.js',
			baseURL + 'theme-eclipse.js'],
			this.__onReady, this);
		},

		__onReady : function() {
			// create the editor
			var editor = this.__ace = ace.edit(this.__editor.getContentElement().getDomElement());

			var mode = require("ace/mode/" + this.__mode).Mode;
			editor.getSession().setMode(new mode());

			// configure the editor
			var session = editor.getSession();

			this.__editor.addListener("resize", this.__onResize, this);
			this.useHighlight(this.__highlighted);
			this.setFontSize(this.__fontSize);
			this.__onResize();
		},

		__onResize : function () {
			setTimeout(function() {
				this.__ace.resize();
			}.bind(this), 0);
		},

		/**
		* Returns the current set code of the editor.
		* @return {String} The current set text.
		*/
		getCode : function() {
			if (this.__highlighted && this.__ace) {
				return this.__ace.getSession().getValue();
			} else {
				return this.__textarea.getValue();
			}
		},

		/**
		* Sets the given code to the editor.
		* @param code {String} The new code.
		*/
		setCode : function(code) {
			if (this.__ace) {
				this.__ace.getSession().setValue(code);

				// move cursor to start to prevent scrolling to the bottom
				this.__ace.renderer.scrollToX(0);
				this.__ace.renderer.scrollToY(0);
				this.__ace.selection.moveCursorFileStart();
			}
			this.__textarea.setValue(code);
		},

		/**
		* Sets the editor font size.
		* @param size {Number} new font size
		*/
		setFontSize : function (size) {
			this.__fontSize = size;
			if (this.__ace) {
				this.__ace.setFontSize(size);
			}
			this.__textarea.setFont(new qx.bom.Font.fromString(size + ' serif'));
		},

		/**
		* Switches between the ajax code editor editor and a plain textarea.
		* @param value {Boolean} True, if the code editor should be used.
		*/
		useHighlight : function(value) {
			if (this.__highlighted = value) {
				// change the visibility
				this.__editor.setVisibility("visible");
				this.__textarea.setVisibility("excluded");

				// copy the value, if the editor already availabe
				if (this.__ace) {
					this.__ace.getSession().setValue(this.__textarea.getValue());
				}
			} else {
				// change the visibility
				this.__editor.setVisibility("excluded");
				this.__textarea.setVisibility("visible");

				// copy the value, if the editor already availabe
				if (this.__ace) {
					this.__textarea.setValue(this.__ace.getSession().getValue());
				}
			}
		}
	},

	destruct : function() {
		this.__textarea.dispose();
		this.__editor.dispose();
		this.__ace = null;
	}
});

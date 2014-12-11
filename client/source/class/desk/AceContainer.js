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
		this.__editor = new qx.ui.core.Widget();
		this.add(this.__editor, {flex : 1});
        this.__editor.addListener('appear', this.__onAppear, this);
	},

	members : {
		/**
		 * Sets the language mode
		 * @param mode{String} mode : "javascript" or "c_cpp"
		 */
		setMode : function (mode) {
            this.__mode = mode;
		},

		/**
		 * callback launched when the container appears on screen
		 */
		__onAppear : function() {
			var editor = this.__ace = ace.edit(this.__editor.getContentElement().getDomElement());
			this.__editor.addListener("resize", this.__onResize, this);
			if (this.__mode) {
				this.__ace.getSession().setMode('ace/mode/' + this.__mode);
				this.__ace.setOptions({
					enableBasicAutocompletion: true,
					enableLiveAutocompletion: true
				});
			}

			this.setFontSize(this.__fontSize);
			this.__onResize();
		},

		__editor : null,
		__mode : null,
		__ace : null,
		__fontSize : 14,

		/**
		* Returns the underlying ACE object
		* @return {Object} the ace editor
		*/
		getAce: function() {
			return this.__ace;
		},

		/**
		 * callback launched when the container is resized
		 */
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
			return this.__ace.getSession().getValue();
		},

		/**
		* Sets the given code to the editor.
		* @param code {String} The new code.
		*/
		setCode : function(code) {
			this.__ace.getSession().setValue(code);

			// move cursor to start to prevent scrolling to the bottom
			this.__ace.renderer.scrollToX(0);
			this.__ace.renderer.scrollToY(0);
			this.__ace.selection.moveCursorFileStart();
		},

		/**
		* Sets the editor font size.
		* @param size {Number} new font size
		*/
		setFontSize : function (size) {
			this.__fontSize = size;
			this.__ace.setFontSize(size);
		}
	},

	destruct : function() {
		this.__editor.dispose();
		this.__ace = null;
	}
});

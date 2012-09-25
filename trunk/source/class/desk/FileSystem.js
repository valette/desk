/**
 * Singleton helper class for file system operations : path->URL conversion, session management etc...
 */
qx.Class.define("desk.FileSystem", 
{
	extend : qx.core.Object,

	type : "singleton",

	construct : function()
	{
		this.base(arguments);
		var URLparser = document.createElement('a');
		URLparser.href = document.href;

		var pathname=URLparser.pathname;
		this.__user=URLparser.pathname.split("/")[1];
		console.log('user : '+this.__user);
		this.__baseURL='/'+this.__user+'/';
		this.__filesURL=this.__baseURL+'files/';
		return this;
	},

	members : {
		__baseURL : null,
		__filesURL : null,
		__user : null,

		/**
		* Returns the base URL string
		*
		* @return {String} baseURL
		*/
		getBaseURL : function () {
			return this.__baseURL;
		},

		/**
		* Translates a file path to an URL
		*
		* @param file {String} file path
		*
		* @return {String} URL
		*/
		getFileURL : function (file) {
			return this.__filesURL+file;
		}
	}
});

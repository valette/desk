/**
 * Singleton helper class for file system operations : path->URL conversion, session management etc...
 * @lint ignoreDeprecated(alert)
 * @ignore (_.*)
 * @ignore (async.eachSeries)
 */
qx.Class.define("desk.FileSystem", 
{
	extend : qx.core.Object,

	type : "singleton",

	construct : function() {
		this.__baseURL = qx.bom.Cookie.get("homeURL") || window.location.href;
		this.debug("baseURL : ", this.__baseURL);
		this.__actionsURL = this.__baseURL + 'rpc/';
		this.__filesURL = this.__baseURL + 'files/';
	},

	statics : {
		/**
		* Loads a file into memory. Depending on the file type, the result can be a string, a json object or an xml element
		*
		* @param file {String} the file to load
		* @param options {Object} options which can be : 
		* <pre class='javascript'>
		* { <br>
		*   cache : true/false // enable/disable cache (false by default) <br>
		*   forceText : true/false // to force text output <br>
		* }
		* </pre>
		* @param callback {Function} success callback, with request as first parameter
		* @param context {Object} optional context for the callback
		* 
		* <pre class='javascript'>
		* example :<br>
		* desk.FileSystem.readFile ("myFilePath", function (err, result) {<br>
		*   if (!err) {<br>
		*      // do something with result<br>
		*   } else {<br>
		*      // read error message<br>
		*   }<br>
		*});<br>
		*</pre>
		*/
		readFile : function (file, options, callback, context) {
			var url = desk.FileSystem.getFileURL(file);
			desk.FileSystem.readURL(url, options, callback, context);
		},

		/**
		* Loads a URL into memory. Depending on the file type, the result can be a string, a json object or an xml element
		*
		* @param url {String} the url to load
		* @param options {Object} options which can be : 
		* <pre class='javascript'>
		* { <br>
		*   cache : true/false // enable/disable cache (false by default) <br>
		*   forceText : true/false // to force text output <br>
		* }
		* </pre>
		* @param callback {Function} success callback, with request as first parameter
		* @param context {Object} optional context for the callback
		* 
		* <pre class='javascript'>
		* example :<br>
		* desk.FileSystem.readURL ("myURL", function (err, result) {<br>
		*   if (!err) {<br>
		*      // do something with result<br>
		*   } else {<br>
		*      // read error message<br>
		*   }<br>
		*});<br>
		*</pre>
		*/
		readURL : function (url, options, callback, context) {
			if (typeof options === "function") {
				var temp = callback;
				callback = options;
				options = context;
				context = temp;
			}
			options = options || {};
			if (options.cache !== false) {
				url += "?nocache=" + Math.random();
			}
			var req = new qx.io.request.Xhr(url);
			req.addListener('load', function () {
				var res = options.forceText ? req.getResponseText() : req.getResponse();
				if ((typeof res === "string") && !options.forceText 
					&& (req.getResponseHeader("Content-Type").indexOf("xml") >= 0)) {
					// qooxdoo has a bug here : file is of xml type 
					// but the response is sometimes a string containing the xml, not an xml node
					res = (new DOMParser()).parseFromString(res, "text/xml");
				}
				callback.call(context, null, res);
				req.dispose();
			});
			req.addListener('fail', function (e) {
				callback.call(context, req.getStatusText());
				req.dispose();
			});
			req.send();					
		},

		/**
		* Writes a string to a file
		*
		* @param file {String} the file to write to
		* @param content {String} the string to write
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		* 
		* <pre class="javascript">
		* example : <br>
		* desk.FileSystem.writeFile ("myFilePath", myContent, function (err) {<br>
		* // here, the file has been written to disk<br>
		* });<br>
		* </pre>
		*/
		writeFile : function (file, content, callback, context) {
			desk.Actions.getInstance().launchAction({
				action : "write_binary",
				file_name : desk.FileSystem.getFileName(file),
				base64data : qx.util.Base64.encode(content, true),
				output_directory : desk.FileSystem.getFileDirectory(file)},
				function (res) {
					callback.call(context, res.error);
			});
		},
	    
	    
		/**
		* Writes an object to a JSON file
		*
		* @param file {String} the file to write to
		* @param content {Object} the object to write
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		* 
		* <pre class="javascript">
		* example : <br>
		* desk.FileSystem.writeJSON ("myFilePath", myContent, function () {<br>
		* // here, the file has been written to disk<br>
		* });<br>
		* </pre>
		*/
		writeJSON : function (file, content, callback, context) {
			desk.Actions.getInstance().launchAction({
				action : "write_string",
				file_name : desk.FileSystem.getFileName(file),
				data : JSON.stringify(content, true),
				output_directory : desk.FileSystem.getFileDirectory(file)
			}, callback, context);
		},

		/**
		* creates a (possibly already existing) directory
		* @param dir {String} the directory to ceate
		* @param callback {Function} success callback, with request as first parameter
		* @param context {Object} optional context for the callback
		*/
		mkdirp : function (dir, callback, context) {
			desk.Actions.execute({action : "mkdirp", directory: dir}, function (err) {
				callback.call(context, err);
			});
		},

		/**
		* extracts the directory from input file.
		*
		* @param file {String} the file
		* @return {string} the directory the file resides in
		* <pre class="javascript">
		* example : 
		* desk.FileSystem.getFileDirectory ('data/test/foo.txt');
		* returns 'data/test/'
		* </pre>
		*/
		getFileDirectory : function (file) {
			var slashIndex = file.lastIndexOf('/');
			if (slashIndex >= 0) {
				return file.substring(0, slashIndex+1);
			} else {
				return '/';
			}
		},

        /**
		* returns the file extension
		*
		* @param file {String} the file
		* @return {string} file extension
		* <pre class="javascript">
		* example : <br>
		* desk.FileSystem.getFileDirectory('data/test/foo.txt'); <br>
		* returns 'txt'<br>
		* </pre>
		*/
        getFileExtension : function (file) {
			var dotIndex = file.lastIndexOf('.');
			if (dotIndex >= 0) {
				return file.substring(dotIndex + 1);
			} else {
				return '';
			}
		},

		/**
		* extracts the name from input file (without full path)
		*
		* @param file {String} the file
		* @return {string} name of the file
		* <pre class="javascript">
		* example : 
		* desk.FileSystem.getFileName ('data/test/foo.txt');
		* returns 'foo.txt'
		* </pre>
		*/	
		getFileName  : function (file) {
			var slashIndex = file.lastIndexOf('/');
			if (slashIndex >= 0) {
				return file.substring(slashIndex + 1, file.length);
			} else {
				return file;
			}
		},

		/**
		* Translates a file path to an URL
		*
		* @param file {String} file path
		*
		* @return {String} the file URL
		*/
		getFileURL : function (file) {
			return desk.FileSystem.getInstance().__filesURL + file;
		},

		/**
		* traverse all files contained in the input directory
		*
		* @param directory {String} directory path
		* @param iterator {Function} iterator applied to each file name
		* @param asynchronous {Boolean} boolean to specify whether the iterator is an async one
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		* @ignore (async.queue)
		*/
		traverse : function (directory, iterator, asynchronous, callback, context) {
			if (typeof asynchronous === "function") {
				context = callback;
				callback = asynchronous;
				asynchronous = false;
			}

			var crawler = async.queue(function (directory, callback) {
				desk.FileSystem.readDir(directory, function (err, files) {
					if (err) {
						console.warn("error while traversing directory " + directory);
						console.warn(err);
						
					} else {
						files.forEach(function (file) {
							var fullFile = directory + "/" + file.name;
							if (file.isDirectory) {
								crawler.push(fullFile);
								if (asynchronous) {
									callback();
								}
							} else {
								iterator(fullFile, callback)
							}
						});
					}
					if (!asynchronous) {
						callback();
					}
				});
			}, 4);

			crawler.push(directory);
			crawler.drain = function () {
				if (typeof callback === "function") {
					callback.apply(context);
				};
			};
		},

		/**
		* Returns the URL for a specific action
		* @param action {String}
		* 
		* @return {String} actionsURL
		*/
		getActionURL : function (action) {
			return desk.FileSystem.getInstance().__actionsURL + action;
		},

		/**
		* executes the javascript code in file
		* @param file {String} the file to execute
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		*/
		executeScript : function (file, callback, context) {
			desk.FileSystem.readFile(file, function (err, content) {
				var script = document.createElement('script');
				script.setAttribute('type','text/javascript');
				script.text = '(function (__dirname) {' + content
					+ '\n})("' + desk.FileSystem.getFileDirectory(file)
					+ '")\n//@ sourceURL=' + file;
				document.getElementsByTagName('body')[0].appendChild(script);
				if (typeof callback === "function") {
					callback.apply(context);
				};
			});
		},

		/**
		* tests whether a file (or directory) exists or not
		* @param path {String} the path to test
		* @param callback {Function} callback with boolean as parameter when done
		* @param context {Object} optional context for the callback
		*/
		exists : function (path, callback, context) {
			desk.FileSystem.__get('exists', {path : path}, callback, context);
		},

		/**
		* gets the lists of files in a directory
		* @param path {String} the directory to list
		* @param callback {Function} callback with array of files as parameter
		* @param context {Object} optional context for the callback
		*/
		readDir : function (path, callback, context) {
			desk.FileSystem.__get('ls', {path : path}, callback, context);
		},

		/**
		* includes the scripts provided in the input array
		* @param scripts {Array} the scripts to load
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		*/
		includeScripts : function (scripts, callback, context) {
			var fs = desk.FileSystem.getInstance();
			var req = new qx.bom.request.Script();

			async.eachSeries(scripts, function (url, callback) {
				req.open("GET", url);
				req.onload = callback;
				req.send();
			}, function (err) {
				req.dispose();
				if (typeof callback === 'function') {
					callback.call(context, err);
				}
			});
		},

		/**
		* performs an xmlhttp GET request
		* @param action {String} action path
		* @param params {Object} requestData
		* @param callback {Function} callback when done
		* @param context {Object} optional context for the callback
		*/
		__get : function (action, params, callback, context) {
			var fs = desk.FileSystem.getInstance();
			var req = new qx.io.request.Xhr(fs.__actionsURL + action, 'GET');

			function cb (err) {
				try {
					var obj = JSON.parse(req.getResponseText());
				} catch(e) {
					err = e;
				}
				req.dispose();
				callback.call(context, err, obj);
			}

			req.setRequestData(params);
			req.addListener('load', function (e) {
				cb();
			});
			req.addListener('error', function (e) {
				cb(req.getResponse());
			});
			req.send();
		}
	},

	members : {
		__baseURL : null,
		__filesURL : null,
		__actionsURL : null,

		/**
		* Returns the base URL string
		*
		* @return {String} baseURL
		*/
		getBaseURL : function () {
			return this.__baseURL;
		},

		/**
		* Returns the directory for the given file, session type and Id
		*
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param sessionId {Number} session Id
		*
		* @return {String} directory path
		*/
		getSessionDirectory : function (file,sessionType,sessionId) {
			return file + "." + sessionType + "." + sessionId;
		},

		/**
		* creates an array containing sessions of given type (string)
		* sessions are directories for which the name contains in order:
		* -the file name
		* -the session type
		* -the session Id
		* all separated by a "."
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param callback {Function} the callback when the list is constructed
		*
		* the array is the first parameter for the callback function
		*/ 
		getFileSessions : function (file, sessionType, callback) {
			if (sessionType === null) {
				alert('error : no session type asked');
				return;
			}

			var directory = desk.FileSystem.getFileDirectory(file);
			var shortFileName = desk.FileSystem.getFileName(file);
			desk.FileSystem.readDir(directory, function (err, files) {
				var sessions = [];
				files.forEach(function (child) {
					var childName = child.name;
					if (!child.isDirectory) {
						return;
					}
					//test if the directory begins like the file
					if (childName.substring(0, shortFileName.length + 1) !== (shortFileName + ".")) {
						return;
					}
					var remaining = childName.substring(shortFileName.length + 1);
					var session = remaining.substring(0, sessionType.length + 1);
					if (session == (sessionType + ".")) {
						sessions.push(parseInt(remaining.substring(session.length), 10));
					}
				});
				// we need to tweak the .sort() method so that it generates correct output for ints
				sessions.sort(function (a,b) {return b - a;});
				callback(sessions);
			});
		},

		/**
		* Creates a new session
		* sessions are directories for which the name contains in order:
		* -the file name
		* -the session type
		* -the session Id
		* all separated by a "."
		* @param file {String} file path
		* @param sessionType {String} session type (e.g. "gcSegmentation")
		* @param callback {Function} the callback when the session is created
		*
		* executes the callback with the new session Id as parameter when finished
		*/
		createNewSession : function (file, sessionType, callback) {
			this.getFileSessions(file, sessionType, function (sessions) {
				var newSessionId = sessions.length ? _.max(sessions) + 1 : 0;
				var lastSlash = file.lastIndexOf("/");
				var subdir = file.substring(lastSlash+1) + "." + sessionType + "." + newSessionId;

				desk.Actions.getInstance().launchAction({
					action : "add_subdirectory",
					subdirectory_name : subdir,
					output_directory : file.substring(0,lastSlash)},
					function () {
						callback(newSessionId);
				});
			});
		}
	}
});

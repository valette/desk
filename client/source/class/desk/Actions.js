/**
 * Singleton class which stores all available actions, handles launching
 * and display actions in progress
 * @asset(desk/desk.png)
 * @asset(qx/icon/${qx.icontheme}/16/categories/system.png) 
 * @ignore (io)
 * @ignore (_.*)
 * @ignore (async.*)
 * @ignore (jsSHA)
 * @ignore (desk_RPC)
 * @lint ignoreDeprecated (alert)
 * @require(desk.LogContainer)
 * @require(desk.Random)
 */
qx.Class.define("desk.Actions", 
{
	extend : qx.core.Object,

	type : "singleton",

	/**
	* Constructor, never to be used. Use desk.Actions.getInstance() instead
	*/
	construct : function() {
		this.base(arguments);
		this.__ongoingActions = new qx.ui.container.Composite(new qx.ui.layout.VBox());

		var baseURL = desk.FileSystem.getInstance().getBaseURL();
		var req = new qx.bom.request.Script();
		req.onload = function () {
			this.debug("loaded browserified.js");
			if (!desk_RPC) {
				desk.FileSystem.readFile(this.__savedActionsFile, 
					function (err, result) {
						if (err) {
							console.log("Error while reading actions cache");
						}
						this.__recordedActions = result.actions;
						this.__populateActionMenu();
				}, this);
				return;
			}

			this.__socket = io({path : baseURL + 'socket/socket.io'});
			this.__socket.on("action finished", this.__onActionEnd.bind(this));
			this.__socket.on("actions updated", this.__populateActionMenu.bind(this));
			this.__populateActionMenu();
		}.bind(this);
		req.open("GET", baseURL + 'js/browserified.js');
		req.send();
	},

	statics : {
		/**
		* Calls callback when the actions list is constructed
		* @param callback {Function} : callback to be called when ready
		* @param context {Object} : optional context for the callback
		*/
		init : function (callback, context) {
			var actions = desk.Actions.getInstance();
			if (actions.__settings) {
				callback.apply(context);
			} else {
				actions.addListenerOnce("changeReady", callback , context);
			}
		},

		/**
		* executes an action
		* @param params {Object} object containing action parameters
		* @param callback {Function} callback for when the action has been performed
		* @param context {Object} optional context for the callback
		* @return {String} action handle for managemenent (kill etc...)
		*/
		execute : function (params, callback, context) {
			params = JSON.parse(JSON.stringify(params));
			params.handle = Math.random().toString();
			var actions = desk.Actions.getInstance();
			if (actions.isForceUpdate()) params.force_update = true;

			var parameters = {
				actionFinished : false,
				callback : callback || function () {},
				context : context,
				POST : params
			};

			if (actions.__recordedActions && !desk_RPC) {
				var response = actions.__recordedActions[actions.__getActionSHA(params)];
				if (response) {
					response.handle = params.handle;
					setTimeout(function () {
						actions.__onActionEnd(response);
					}, 1);
				} else {
					console.log("Error : action not found");
					console.log(params);
				}
			} else {
				actions.__socket.emit('action', params);
				setTimeout(function () {
					actions.__addActionToList(parameters);
				}, Math.max(1000, (_.size(actions.__runingActions) - 20) * 1000));
			}

			actions.__runingActions[params.handle] = parameters;
			return params.handle;
		}
	},

	properties : {
		/**
		* Defines whether RPC cache is avoided (default : false);
		*/	
		forceUpdate : { init : false, check: "Boolean", event : "changeForceUpdate"}
	},

	events : {
		/**
		* Fired when the actions list is ready
		*/	
		"changeReady" : "qx.event.type.Event"
	},

	members : {
		__socket : null,
		__runingActions : {},
		__actionMenu : null,
		__settings : null,
		__ongoingActions : null,
		__currentFileBrowser : null,
		__recordedActions : null,
		__savedActionsFile : 'cache/actions.json',
		__firstReadFile : null,

		/**
		* Creates the action menu
		*/
		__createActionsMenu : function () {
			var menu = new qx.ui.menu.Menu();
			var forceButton = new qx.ui.menu.CheckBox("Disable cache");
			forceButton.setBlockToolTip(false);
			forceButton.setToolTipText("When active, this options disables actions caching");
			forceButton.bind('value', this, 'forceUpdate');
			this.bind('forceUpdate', forceButton, 'value');
			menu.add(forceButton);

			menu.add(this.__getPasswordButton());
			menu.add(this.__getConsoleLogButton());
			menu.add(this.__getServerLogButton());
			this.__addSaveActionButtons(menu);

			if (!desk_RPC) return;

			var button = new qx.ui.form.MenuButton(null, "icon/16/categories/system.png", menu);
			button.setToolTipText("Configuration");
			qx.core.Init.getApplication().getRoot().add(button, {top : 0, right : 0});

			// add already running actions
			desk.Actions.execute({manage : 'list'}, function (err, res) {
				var actions = res.ongoingActions;
				Object.keys(actions).forEach(function (handle) {
					this.__addActionToList(actions[handle]);
					this.__runingActions[handle] = actions[handle];
				}, this);
			}, this);

			// add server load widget
			var label = new qx.ui.basic.Label("");
			label.setBlockToolTip(false);
			label.setToolTipText("CPU load");
			qx.core.Init.getApplication().getRoot().add(label, {top : 0, right : 40});

			this.__socket.on("loadavg", function (loadavg) {
				var load = Math.max(0, Math.min(1.0, loadavg[0]));
				var color = Math.floor(255 * (1 - load));
				label.setBackgroundColor('rgb(255,'  + color + ', ' + color + ')');
				label.setValue((100 * load).toPrecision(3) + "%");
			});
		},

		/**
		* Creates the actions record/save buttons
		* @param actionsMenu {qx.ui.menu.Menu} input menu
		*/
		__addSaveActionButtons : function (actionsMenu) {
			var menu = new qx.ui.menu.Menu();
			actionsMenu.add(new qx.ui.menu.Button("Statifier", null, null, menu));
			var recordedFiles
			var oldGetFileURL;

			var getFileURL = function (file) {
				this.debug("read : " + file);
				this.__firstReadFile = this.__firstReadFile || file;
				var sha = new jsSHA("SHA-1", "TEXT");
				sha.update(JSON.stringify(file));
				recordedFiles[sha.getHash("HEX")] = file;
				return oldGetFileURL(file);
			}.bind(this);

			var start = new qx.ui.menu.Button('Start recording');
			start.setBlockToolTip(false);
			start.setToolTipText("To save recorded actions");
			start.addListener('execute', function () {
				this.__recordedActions = {};
				recordedFiles = {};
				this.__firstReadFile = null;
				oldGetFileURL = desk.FileSystem.getFileURL;
				desk.FileSystem.getFileURL = getFileURL;
				start.setVisibility("excluded");
				stop.setVisibility("visible");
			}, this);
			menu.add(start);

			var stop = new qx.ui.menu.Button('Stop recording').set({
				blockToolTip : false, toolTipText : "To stop recording and save actions",
				visibility : "excluded"});
			stop.addListener('execute', function () {
				desk.FileSystem.getFileURL = oldGetFileURL;
				desk.FileSystem.readFile(this.__savedActionsFile, function (err, res) {
					var records = err ? {actions : {}, files : {}} : res;
					records.actions = records.actions || {};
					records.files = records.files || {};
					_.extend(records.actions, this.__recordedActions);
					_.extend(records.files, recordedFiles);
					this.__recordedActions = null;
					desk.FileSystem.writeFile(this.__savedActionsFile,
						JSON.stringify(records), function () {
							alert(Object.keys(records.actions).length + " actions recorded\n"
								+ Object.keys(records.files).length + " files recorded");
							start.setVisibility("visible");
							stop.setVisibility("excluded");
							this.__statify(false);
					}, this);
				}, this);
			}, this);
			menu.add(stop);

			var clear = new qx.ui.menu.Button('Clear records');
			clear.addListener('execute', function () {
				desk.FileSystem.exists(this.__savedActionsFile, function (err, exists) {
					if (!exists) {
						this.__statify(false);
						return;
					}
					desk.Actions.execute({action : "delete_file",
						file_name : this.__savedActionsFile
					}, function () {
						this.__statify(false);
					}, this);
				}, this);
			}, this);
			menu.add(clear);

			var statify = new qx.ui.menu.Button('Statify');
			statify.addListener('execute', this.__statify, this);
			menu.add(statify);
		},

		/**
		* Creates the password change button
		* @return {qx.ui.menu.Button} the button
		*/
		__getPasswordButton : function () {
			var button = new qx.ui.menu.Button('Change password');
			button.setBlockToolTip(false);
			button.setToolTipText("To change your password");
			button.addListener('execute', function () {
				var password = prompt('Enter new password (more than 4 letters)');
				var req = new qx.io.request.Xhr(desk.FileSystem.getActionURL('password'));
				req.setMethod('POST');
				req.setRequestData({password : password});
				req.addListener('success', function(e) {
					var status = JSON.parse(req.getResponseText());
					if (status.error) {
						alert ('Error : ' + status.error);
					} else {
						alert (status.status);
					}
					req.dispose();
				}, this);
				req.send();
			}, this);
			return button;
		},

		/**
		* Creates the server log button
		* @return {qx.ui.menu.Button} the button
		*/
		__getServerLogButton : function () {
			var button = new qx.ui.menu.Button('Server log');
			button.setBlockToolTip(false);
			button.setToolTipText("To display server logs");
			button.addListener('execute', function () {
				function displayLog(data) {
					log.log(data, 'yellow');
				}
				this.__socket.emit('setLog', true);
				var win = new qx.ui.window.Window('Server log').set(
					{width : 600, height : 500, layout : new qx.ui.layout.HBox()});
				var log = new desk.LogContainer().set({backgroundColor : 'black'});
				win.add(log, {flex : 1});
				this.__socket.on("log", displayLog);
				win.addListener('close', function () {
					this.__socket.removeListener('log', displayLog);
					this.__socket.emit('setLog', false);
				}, this);
				win.open();
				win.center();
			}, this);
			return button;
		},

		/**
		* Creates the console log button
		* @return {qx.ui.menu.Button} the button
		*/
		__getConsoleLogButton : function () {
			var button = new qx.ui.menu.Button('Console log');
			button.setBlockToolTip(false);
			button.setToolTipText("To display console logs");
			button.addListener('execute', function () {
				var oldConsoleLog = console.log;
				console.log = function (message) {
					oldConsoleLog.apply(console, arguments);
					log.log(message.toString());
				};
				var win = new qx.ui.window.Window('Console log').set(
					{width : 600, height : 300, layout : new qx.ui.layout.HBox()});
				var log = new desk.LogContainer();
				win.add(log, {flex : 1});
				win.addListener('close', function () {
					console.log = oldConsoleLog;
				});
				win.open();
				win.center();
			}, this);
			return button;
		},

		/**
		* Returns the complete settings object
		* @return {Object} settings
		*/	
		getSettings : function () {
			return JSON.parse(JSON.stringify(this.__settings));
		},

		/**
		* Returns the JSON object defining a specific action
		* @param name {String} the action name
		* @return {Object} action parameters as a JSON object
		*/	
		getAction : function (name) {
			var action = this.__settings.actions[name];
			return action ? JSON.parse(JSON.stringify(action)) : null;
		},

		/**
		* Returns the menu containing all actions. Advanced usage only...
		* @param fileBrowser {desk.FileBrowser} 
		* @return {qx.ui.menu.Menu} actions menu
		*/
		getActionsMenu : function (fileBrowser) {
			this.__currentFileBrowser = fileBrowser;
			return this.__actionMenu;
		},
		
		/**
		* Returns the container which lists all ongoing actions
		* @return {qx.ui.form.List} actions menu
		*/
		getOnGoingContainer : function() {
			return this.__ongoingActions;
		},

		/**
		* builds the actions UI
		*/
		buildUI : function () {
			this.__ongoingActions.set ({width : 200, zIndex : 1000000,
				decorator : "statusbar", backgroundColor : "transparent"});
			qx.core.Init.getApplication().getRoot().add(this.__ongoingActions, {top : 0, right : 100});
		},

		/**
		* kills an action
		* @param handle {String} action handle to kill
		* @param callback {Function} callback when the action has been killed
		* @param context {Object} optional context for the callback
		*/
		killAction : function (handle, callback, context) {
			var params = this.__runingActions[handle];
			if (params && params.item && (params.item.getDecorator() === "tooltip-error")) {
				this.__garbageContainer.add(params.item);
				params.item.resetDecorator();
				delete this.__runingActions[handle];
				return;
			}
			desk.Actions.execute({manage : 'kill', actionHandle : handle}, callback, context);
		},

		/**
		* returns the SHA1 hash of action parameters (handle omitted)
		* @param params {Object} action parameters
		* @return {String} the hash
		*/
		__getActionSHA : function (params) {
			var parameters = _.omit(params, 'handle');
			var sha = new jsSHA("SHA-1", "TEXT");
			sha.update(JSON.stringify(parameters));
			return sha.getHash("HEX");
		},

		/**
		* Fired whenever an action is finished
		* @param res {Object} the server response
		*/
		__onActionEnd : function (res) {
			var params = this.__runingActions[res.handle];
			if (!params) return;

			if (this.__recordedActions && desk_RPC) {
				this.__recordedActions[this.__getActionSHA(params.POST)] = res;
			}

			if (res.error) {
				console.log(res);
				var item = params.item;
				if (!item) {
					this.__addActionToList(params);
					item = params.item;
				}
				item.setDecorator("tooltip-error");
				item.setToolTipText(Object.keys(res.error).map(function (key) {
					return '' + key + ':' + res.error[key];
				}).join("<br>"));
			} else {
				delete this.__runingActions[res.handle];
				params.actionFinished = true;
				if (params.item) {
					this.__garbageContainer.add(params.item);
				}
			}

			if (params.callback) {
				params.callback.call(params.context, res.error, res);
			}
		},

		__garbageContainer : new qx.ui.container.Composite(new qx.ui.layout.HBox()),

		/**
		* launches an action
		* @param params {Object} object containing action parameters
		* @param callback {Function} callback for when the action has been performed
		* @param context {Object} optional context for the callback
		* @return {String} action handle for managemenent (kill etc...)
		*/
		launchAction : function (params, callback, context) {
			console.warn('desk.actions.launchAction is deprecated! Use desk.Actions.execute() instead!');
			console.warn(new Error().stack);
			return desk.Actions.execute(params, function (err, res) {
				if (typeof callback === "function") {
					res.err = err;
					callback.call(context, res);
				}
			});
		},

		/**
		* Adds the action widget to the list of runing actions
		* @param params {Object} action parameters
		*/
		__addActionToList : function(params) {
			if (params.item || params.actionFinished || params.POST.manage) {
				return;
			}
			if (this.__ongoingActions.getChildren().length > 20) {
				setTimeout(function () {
					this.__addActionToList(params);
				}.bind(this), 2000 * Math.random());
				return;
			}
			var item = this.__garbageContainer.getChildren()[0];
			if (!item) {
				item = new qx.ui.form.ListItem("dummy");
				item.set({decorator : "button-hover", opacity : 0.7});

				var kill = new qx.ui.menu.Button('Kill/remove');
				kill.addListener('execute', function () {
					this.killAction(item.getUserData("params").POST.handle);
				}, this);

				var killAll = new qx.ui.menu.Button('Kill/remove all').set({
					blockToolTip : false, toolTipText : "To kill all runing actions on server"});
				killAll.addListener('execute', function () {
					if (!confirm('Do you want to kill all actions?')) {
						return;
					}
					Object.keys(this.__runingActions).forEach(_.ary(this.killAction, 1), this);
				}, this);
				
				var properties = new qx.ui.menu.Button('Properties');
				properties.addListener('execute', function () {
					console.log(item.getUserData("params"));
				}, this);
				
				var menu = new qx.ui.menu.Menu();
				menu.add(kill);
				menu.add(killAll);
				menu.add(properties);
				item.setContextMenu(menu);
			}
			item.setLabel(params.POST.action || params.POST.manage);
			params.item = item;
			item.setUserData("params", params);
			this.__ongoingActions.add(item);
		},

		/**
		* fired when an action is launched via the action menu
		* @param e {qx.event.type.Event} button event
		*/
		__launch : function (e) {
			var name = e.getTarget().getLabel();
			var action = new desk.Action(name, {standalone : true});
			_.some(this.__settings.actions[name].parameters, function (param) {
				if ((param.type !== "file") && (param.type !== "directory")) {
					return false;
				}
				var parameters = {};
				parameters[param.name] = this.__currentFileBrowser.getSelectedFiles()[0];
				action.setParameters(parameters);
				return true;
			}, this);
			action.setOutputDirectory("actions/");
		},

		/**
		* custom comparator for the sort operator
		* @param a {String} first value to compare
		* @param b {String} second value to compare
		* @return {Boolean} true if a < b
		*/
		__myComparator : function (a, b) {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		},

		/**
		* Loads actions.json from server and refreshes the action menu
		*/
		__populateActionMenu : function() {
			desk.FileSystem.readFile('actions.json', function (error, settings) {
				this.__actionMenu = new qx.ui.menu.Menu();

				var actions = settings.actions;

				var libs = {};
				Object.keys(actions).forEach(function (name) {
					var action = actions[name];
					if (!libs[action.lib]) {
						libs[action.lib] = [];
					}
					libs[action.lib].push(name);
				}, this);

				Object.keys(libs).sort(this.__myComparator).forEach(function (lib) {
					var menu = new qx.ui.menu.Menu();
					var menubutton = new qx.ui.menu.Button(lib, null, null, menu);
					libs[lib].sort(this.__myComparator).forEach(function (name) {
						var button = new qx.ui.menu.Button(name);
						var description = actions[name].description;
						if (description) {
							button.setBlockToolTip(false);
							button.setToolTipText(description);
						}
						button.addListener("execute", this.__launch, this);
						menu.add(button);
					}, this);
					this.__actionMenu.add(menubutton);
				}, this);

				if (this.__settings === null) {
					this.__settings = settings;
					if (settings.permissions) {
						this.__createActionsMenu();
					}
					console.log("DESK launched, baseURL : " + desk.FileSystem.getInstance().getBaseURL());
					this.fireEvent('changeReady');
				}
				this.__settings = settings;

			}, this);
		},

		/**
		* Copies recorded actions and files to a static location
		*/

		__statifyWindow : null,
		__statifyLog : null,

		__statify : function (show) {
			var win = this.__statifyWindow;
			if (!win) {
				win = this.__statifyWindow = new qx.ui.window.Window("Statify");
				win.set({layout : new qx.ui.layout.VBox(), 
					height :400, width : 500, showClose : false});
				this.__statifyLog = new desk.LogContainer();
				win.add(this.__statifyLog, {flex :1});
				var button = new qx.ui.form.Button("Statify");
				button.addListener("execute", function () {
					this.__statify2(content);
				}, this);
				win.add(button);
			}
			var log = this.__statifyLog;
			if (show) {
				win.open();
				win.center();
			}
			log.clear();
			var content;
			desk.FileSystem.readFile(this.__savedActionsFile, function (err, res) {
				content = res;
				if (err) content = {files : {} ,actions : {}};
				log.log("Actions to copy : ");
				var actions = content.actions;
				Object.keys(actions).forEach(function (hash) {
					log.log(actions[hash].outputDirectory, "blue");
				});
				if (Object.keys(actions).length === 0) {
					log.log("none");
				}
				log.log("Files to copy : ");
				var files = content.files;
				Object.keys(files).forEach(function (hash) {
					log.log(files[hash]);
				});
				if (Object.keys(files).length === 0) {
					log.log("none");
				}
			});
		},

		__statify2 : function(content) {
			var installDir = prompt('output directory?' , "code/static");
			var browserifiedFile = "js/browserified.js";

			var boot = prompt('what is the startup file?', this.__firstReadFile);
			var startupFile;
			if (!boot) {
				boot = "";
			} else {
				startupFile = boot;
				boot = 'desk_startup_script = "' + boot + '";';
			}

			var self = this;

			async.waterfall([
				function (cb) {
					desk.Actions.execute({
					   action : "copy",
					   source : "application/build",
					   destination : installDir,
					   recursive : true
					}, cb);
				},
				function (res, cb) {
					desk.FileSystem.mkdirp(installDir + "/files/cache", cb);
				},
				function (res, cb) {
					self.debug("copying actions results...");
					var files = content.actions;
						console.log(files);
					async.eachSeries(Object.keys(files), function (hash, cb) {
						var res = files[hash];
						var source = res.outputDirectory;
						var des2 = source.split('/');
						des2.pop();
						des2.pop();
						var dest = installDir + '/files/' + des2.join("/");
						desk.FileSystem.mkdirp(dest, function (err) {
							if (err) {
								cb (err);
								return;
							}
							self.__statifyLog.log("copying " + source + " to " + dest);
							desk.Actions.execute({
								action : "copy",
								source : source,
								recursive : true,
								destination : dest
							}, cb);
						});
					}, cb);
				},
				function (cb) {
					self.debug("copying files...");
					var files = content.files;
					files.boot = startupFile;
					console.log(files);
					async.eachSeries(Object.keys(files), function (hash, cb) {
						var file = files[hash];
						self.debug("file : ", file);
						var dest = installDir + "/files/" + desk.FileSystem.getFileDirectory(file);
						desk.FileSystem.mkdirp(dest, function (err) {
							if (err) {
								cb (err);
								return;
							}
							self.__statifyLog.log("copying " + file + " to " + dest);
							desk.Actions.execute({
								action : "copy",
								source : file,
								recursive : true,
								destination : dest
							}, cb);
						});
					}, cb);
				},
				function (callback) {
					// hack index.html
					var file = installDir + "/index.html";
					desk.FileSystem.readFile(file, {forceText : true}, function (err, res) {
						var lines = res.split('\n').map(function (line, index) {
							if (line.indexOf('desk_RPC') >= 0) {
								return 'desk_RPC = false;' + boot;
							} else {
								return line;
							}
						});
						desk.FileSystem.writeFile(file, lines.join('\n'), callback);
					});
				},
				function (res, callback) {
					self.debug("copying recorded actions");
					desk.Actions.execute({
						action : "copy",
						source : self.__savedActionsFile,
						destination : installDir + "/files/cache"
					}, callback);
				},
				function (res, callback) {
					self.debug("copying actions list");
					desk.Actions.execute({
						action : "copy",
						source : "actions.json",
						destination : installDir + "/files"
					}, callback);
				},
				function (res, callback) {
					desk.FileSystem.readURL(desk.FileSystem.getInstance().getBaseURL() + browserifiedFile, callback);
				},
				function (res, callback) {
					self.debug("copying browserified code");
					self.debug(installDir + "/" + browserifiedFile);
					desk.FileSystem.writeFile(installDir + "/" + browserifiedFile, res, callback);
				}
			], function (err) {
				if (err) {
					alert("error, see console output");
					self.debug(err);
				} else {
					self.__statifyLog.log("Done");
					self.debug("Records statified!");
					alert("done");
				}
			});
		}
	}
});

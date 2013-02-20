/**
 * Simpe class to animate meshes
 * @ignore (async)
#asset(qx/icon/${qx.icontheme}/16/actions/media-playback-start.png) 
#asset(qx/icon/${qx.icontheme}/16/actions/media-playback-stop.png) 
*/

qx.Class.define("desk.Animator", 
{
	extend : qx.ui.container.Composite,

	/**
	*  Constructor
	* 	@param renderFunction {Function} is the function triggered for rendering.
	* If no function is provided, a desk.MeshViewer will be created
	* 
	*/
	construct : function (renderFunction) {
		this.base(arguments);

		if (renderFunction) {
			this.__render = renderFunction;		
		} else {
			this.__viewer = new desk.MeshViewer();
		}
		this.__createUI();
		return (this);
	},

	properties : {
		refreshTime : { init : 50, check: 'Number'}
	},

	events : {
		"close" : "qx.event.type.Event"
	},

	members : {
		__viewer : null,
		__window : null,
		__list : null,

		__animate : false,

		__index : 0,

		/**
		 * Loads an array of files in the viewer for animation
		 * @param files {Array} array of files to load
		 * @param callback {Function} callback when done
		 * @param context {Object} optional callback context
		 */
		animateFiles : function (files, callback, context) {
			var viewer = this.__viewer;
			var self = this;
			async.map(files, function (file, callback) {
				viewer.addFile(file, {visible : false}, function (mesh) {
					callback(null, mesh);
				});
			}, function (err, results){
				for (var i = 0; i != results.length; i++) {
				 self.addObject(results[i], files[i]);
				}
				if (typeof (callback) === "function") {
					callback.apply(context);
				}
			});
		},

		/**
		 * Starts the animation
		 */
		startAnimation : function () {
			if (this.__animate) {
				return;
			}
			var mesh;
			var numberOfObjects = this.__getNumberOfObjects();
			for (var i = 0; i != numberOfObjects;i++) {
				mesh = this.__getObject(i);
				if (mesh) {
					mesh.visible = false;
				}
			}
			this.__animate = true;

			var that = this;
			function animate () {
				var index = that.__index;
				var numberOfObjects = that.__getNumberOfObjects();
				var mesh = that.__getObject(index);
				if (mesh) {
					mesh.visible = true;
				}

				var lastIndex = index - 1;
				if (lastIndex<0) {
					lastIndex += numberOfObjects;
				}
				mesh = that.__getObject(lastIndex);
				if (mesh) {
					mesh.visible = false;
				}

				if (that.__index == (numberOfObjects - 1)) {
					that.__index = 0;
				}
				else {
					that.__index++;
				}
				that.__render();
				if (that.__animate) {
					setTimeout(animate, that.getRefreshTime());
				}
			}
			animate();
		},

		/**
		 * Stops the animation
		 */
		stopAnimation : function () {
			this.__animate = false;
		},

		__getNumberOfObjects : function () {
			return this.__list.getChildren().length;
		},

		/**
		 * Returns an array containing all animated objects
		 * @return {Array} array of THREE.Object3D
		 */
		getObjects : function () {
			var objects = [];
			var list = this.__list.getChildren();
			for (var i = 0; i !=list.length; i++) {
				objects.push(list[i].getUserData('threeObject'));
			}
			return objects;
		},

		__getObject : function (index) {
			return this.__list.getChildren()[index].getUserData('threeObject');
		},

		__getControlsContainer : function () {
			var startButton = new qx.ui.form.Button(null, "icon/16/actions/media-playback-start.png");
			startButton.addListener("execute", this.startAnimation, this);

			var stopButton = new qx.ui.form.Button(null, "icon/16/actions/media-playback-stop.png");
			stopButton.addListener("execute", this.stopAnimation, this);

			var spinner = new qx.ui.form.Spinner(5, 50, 5000);
			spinner.bind('value', this, 'refreshTime');

			var container = new qx.ui.container.Composite();		
			container.setLayout(new qx.ui.layout.HBox());
			container.add(startButton, {flex : 1});
			container.add(stopButton, {flex : 1});
			container.add(spinner);
			return (container);
		},

		/**
		 * Adds a three.js object to the animation list
		 * @param object {THREE.Object3D} the object to add
		 * @param label {String} object label in the list
		 */
		addObject : function (object, label) {
			var item = new qx.ui.form.ListItem(label);
			item.setUserData('threeObject', object);
			this.__list.add(item);
		},

		__render : function () {
			this.__viewer.render();
		},

		__createUI : function () {
			this.setLayout(new qx.ui.layout.VBox());

			var window = new qx.ui.window.Window();
			window.setLayout(new qx.ui.layout.HBox());
			window.setWidth(300);
			window.setShowClose(true);
			window.setShowMinimize(false);
			window.setCaption('animate');
			window.add(this, {flex : 1});
			window.addListener('close', function () {
				this.stopAnimation();
				this.fireEvent('close');
			}, this);

			var list = new qx.ui.form.List();
			list.setDraggable(true);
			list.setDroppable(true);
			list.setSelectionMode("multi");
			this.__list = list;
			this.add(list, {flex : 1});
			this.add(this.__getControlsContainer());

			// Create drag indicator
			var indicator = new qx.ui.core.Widget();
			indicator.setDecorator(new qx.ui.decoration.Single().set({
				top : [ 1, "solid", "#33508D" ]
			}));
			indicator.setHeight(0);
			indicator.setOpacity(0.5);
			indicator.setZIndex(100);
			indicator.setLayoutProperties({left: -1000, top: -1000});
			indicator.setDroppable(true);
			this.add(indicator);

			// Just add a move action
			list.addListener("dragstart", function(e) {
				e.addAction("move");
			});

			list.addListener("dragend", function(e){
				// Move indicator away
				indicator.setDomPosition(-1000, -1000);
			});

			var currentListItem;
			list.addListener("drag", function(e) {
				var orig = e.getOriginalTarget();
				// store the current listitem - if the user drops on the indicator
				// we can use this item instead of calculating the position of the
				// indicator
				if (orig instanceof qx.ui.form.ListItem) {
					currentListItem = orig;
				}
				if (!qx.ui.core.Widget.contains(window, orig) && orig != indicator) {
					return;
				}

				var origCoords2 = list.getContainerLocation();
				var origCoords = orig.getContainerLocation();

				indicator.setWidth(orig.getBounds().width);
				indicator.setDomPosition(origCoords.left-origCoords2.left,
          origCoords.top-origCoords2.top);
			});

			list.addListener("dragover", function(e) {
				// Stop when the dragging comes from outside
				if (e.getRelatedTarget()) {
					e.preventDefault();
				}
			});

			list.addListener("drop", function(e) {
				reorderList(e.getOriginalTarget());
			});

			indicator.addListener("drop", function(e) {
				reorderList(currentListItem);
			});

			function reorderList (listItem)
			{
				// Only continue if the target is a list item.
				if (listItem.classname != "qx.ui.form.ListItem") {
					return ;
				}

				var sel = list.getSortedSelection();
				for (var i=0, l=sel.length; i<l; i++)
				{
					list.addBefore(sel[i], listItem);
				// recover selection as it get lost during child move
					list.addToSelection(sel[i]);
				}
			}
			window.open();
            window.center();
			qx.util.DisposeUtil.disposeTriggeredBy(window, this);
			qx.util.DisposeUtil.disposeTriggeredBy(list, this);
			qx.util.DisposeUtil.disposeTriggeredBy(indicator, this);
		}
	}
});

/**
 * 
 * 
 * A class to animate an object sequence : all given objects will be
 * sequentially made visible in the scene.
 * 
 * *Example*
 *
 * Here is a little example of how to use the widget.
 * 
 * <pre class='javascript'>
 * var viewer = new desk.SceneContainer();
 * // add your objects to the scene
 * viewer.addMesh(object1);
 * viewer.addMesh(object2);
 * // .....
 * viewer.addMesh(objectN);
 * 
 * var animator = new desk.Animator(viewer.render.bind(viewer),
 *   {
 *     visibilityCallback : function (object, visibility) {
 *       object.visible = visibility; // this is what the default callback does
 *     },
 *     snapshotCallback : function () {
 *       viewer.snapshot();
 *     }
 *   });
 * animator.addObject(object1);
 * animator.addObject(object2);
 * // .....
 * animator.addObject(objectN);
 * 
 * // now you can control it
 * animator.startAnimation();
 * </pre>
 * 
 * @ignore (async.*)
 * @asset(qx/icon/${qx.icontheme}/16/actions/media-playback-start.png) 
 * @asset(qx/icon/${qx.icontheme}/16/actions/media-playback-stop.png) 
 * @asset(qx/icon/${qx.icontheme}/16/actions/media-seek-backward.png) 
 * @asset(qx/icon/${qx.icontheme}/16/actions/media-seek-forward.png) 
 */

qx.Class.define("desk.Animator", 
{
	extend : qx.ui.container.Composite,

	/**
	*  Constructor
	* @param renderCallback {Function} is the callback to the rendering function
	* @param opts {Object} : options object which can contain :
	*/
	construct : function (renderCallback, opts) {
		opts = opts || {};
		this.base(arguments);
		this.__render = renderCallback;

		if (opts.visibilityCallback) {
			this.__setVisibility = opts.visibilityCallback;
		}

		if (opts.snapshotCallback) {
			this.__snapshot = opts.snapshotCallback;
		}

		this.setLayout(new qx.ui.layout.VBox());

		if (opts.standalone === true) {
			this.__standalone = true;
			var win = new qx.ui.window.Window();
			win.setLayout(new qx.ui.layout.HBox());
			win.setWidth(300);
			win.setShowClose(true);
			win.setShowMinimize(false);
			win.setCaption('animate');
			win.add(this, {flex : 1});
			win.addListener('close', function () {
				this.stopAnimation();
				this.fireEvent('close');
			}, this);
			win.open();
			win.center();
			qx.util.DisposeUtil.disposeTriggeredBy(win, this);
		}

		var list = new qx.ui.form.List();
		list.setDraggable(true);
		list.setDroppable(true);
		list.setSelectionMode("multi");
		this.__list = list;
		this.add(list, {flex : 1});
		this.add(this.getControlsContainer());
		var snapCheckBox = this.__snapshotCheckBox = new qx.ui.form.CheckBox("snapshot");
		this.add(snapCheckBox);

		// Create drag indicator
		var indicator = new qx.ui.core.Widget();
		indicator.setDecorator(new qx.ui.decoration.Decorator().set({
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

			var origCoords2 = list.getContentLocation();
			var origCoords = orig.getContentLocation();

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

		function reorderList (listItem) {
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
		qx.util.DisposeUtil.disposeTriggeredBy(list, this);
		qx.util.DisposeUtil.disposeTriggeredBy(indicator, this);
	},

	properties : {
		/**
		 * Defines each frame duration in milliseconds
		 */
		refreshTime : { init : 50, check: 'Number'},

		/**
		 * Defines current frame
		 */
		frame : { init : 0, check: 'Number', apply : "__applyFrame"}

	},

	members : {
		__list : null,
		__snapshotCheckBox : null,
		__animate : false,
		__standalone : false,

		__controls : null,

		__frameLabel : null,

		/**
		 * Changes the visibility of a given object
		 * @param obj {Object} the object to modify
		 * @param visibility {Boolean} visibility (false/true)
		 */
		__setVisibility : function (obj, visibility) {
			obj.visible = visibility;
		},

		__snapshot : null,

		__render : null,

		/**
		 * Starts the animation
		 */
		startAnimation : function () {
			if (this.__animate) {
				return;
			}
			var numberOfObjects = this.__getNumberOfObjects();
			this.__animate = true;

			async.whilst(function () {
					return this.__animate;
				}.bind(this),

				function (callback) {
					this.setFrame((this.getFrame() + 1) % numberOfObjects);

					if (this.__snapshotCheckBox.getValue()) {
						setTimeout(this.__snapshot, this.getRefreshTime() / 3);
					}

					setTimeout(callback, this.getRefreshTime());
				}.bind(this),
				function (err) {}
			);
		},

		/**
		 * Updates all the objects'visibility and triggers rendering
		 */
		 __applyFrame : function () {
			var frame = this.getFrame();
			this.__list.getChildren().forEach(function (item, index) {
				var obj = item.getUserData('threeObject');
				if (obj) {
					this.__setVisibility(obj, index === frame);
				}
			}, this);
			this.__frameLabel.setValue(frame.toString());
			this.__render();
		},

		/**
		 * Stops the animation
		 */
		stopAnimation : function () {
			this.__animate = false;
		},

		/**
		 * Seeks to the next frame
		 */
		getNextFrame : function () {
			this.setFrame((this.getFrame() + 1 ) % this.__getNumberOfObjects());
		},

		/**
		 * Seeks to the previous frame
		 */
		getPreviousFrame : function () {
			var numberOfObjects = this.__getNumberOfObjects();
			this.setFrame((this.getFrame() - 1 + numberOfObjects) % numberOfObjects);
		},

		/**
		 * Returns the number of objects to animate
		 * @return {Number} number of objects
		 */
		__getNumberOfObjects : function () {
			return this.__list.getChildren().length;
		},

		/**
		 * Returns an array containing all animated objects
		 * @return {Array} array of THREE.Object3D
		 */
		getObjects : function () {
			return this.__list.getChildren().map(function (child) {
				return child.getUserData('threeObject');
			});
		},

		/**
		 * Returns an the object at given index
		 * @param index {Number} the object's index
		 * @return {Object} corresponding object
		 */
		__getObject : function (index) {
			return this.__list.getChildren()[index].getUserData('threeObject');
		},

		/**
		 * Returns the container containing playback controls
		 * @return {qx.ui.container.Composite} playback container
		 */
		getControlsContainer : function () {
			if (this.__controls) {
				return this.__controls;
			}

			var frameLabel = this.__frameLabel = new qx.ui.basic.Label("0");
			frameLabel.setWidth(30);

			var startButton = new qx.ui.form.Button(null, "icon/16/actions/media-playback-start.png");
			startButton.addListener("execute", this.startAnimation, this);

			var stopButton = new qx.ui.form.Button(null, "icon/16/actions/media-playback-stop.png");
			stopButton.addListener("execute", this.stopAnimation, this);

			var nextButton = new qx.ui.form.Button(null, "icon/16/actions/media-seek-forward.png");
			nextButton.addListener("execute", this.getNextFrame, this);

			var prevButton = new qx.ui.form.Button(null, "icon/16/actions/media-seek-backward.png");
			prevButton.addListener("execute", this.getPreviousFrame, this);

			var spinner = new qx.ui.form.Spinner(5, 50, 5000);
			spinner.bind('value', this, 'refreshTime');

			var container = this.__controls = new qx.ui.container.Composite();		
			container.setLayout(new qx.ui.layout.HBox());
			container.add(frameLabel);
			container.add(startButton, {flex : 1});
			container.add(stopButton, {flex : 1});
			container.add(prevButton, {flex : 1});
			container.add(nextButton, {flex : 1});
			container.add(spinner);
			return container;
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

		/**
		 * Removes all objects handled by the animator
		 */
		clearObjects : function () {
			this.__list.removeAll();
		},

		/**
		 * Refreshes visibility of all objects
		 */
		refresh : function () {
			this.__applyFrame();
		}

	}
});

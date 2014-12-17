/**
* @lint ignoreDeprecated(alert)
*/

qx.Class.define("desk.VolViewSimple", 
{
  extend : qx.ui.window.Window,

	/**
	 * Constructor
	 * @param file {String} input volume
	 */
	construct : function(file) {
		this.base(arguments);

		this.setLayout(new qx.ui.layout.HBox(5));
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);
		this.setCaption(file);

		desk.Actions.getInstance().launchAction({
			action : "slice_volume",
			input_volume : file,
			slice_orientation : 0},
			function (response) {
				this.openFile(desk.FileSystem.getFileURL(response.outputDirectory + '/volume.xml'));
		}, this);

		var font = new qx.bom.Font(28, ["Verdana", "sans-serif"]);
		var label = new qx.ui.basic.Label("Computing slices, wait...").set({
			font : font
		});
		this.add(label, {flex : 1});
		qx.util.DisposeUtil.disposeTriggeredBy(font, this);

		// drag and drop support
		this.setDraggable(true);
		this.addListener("dragstart", function(e) {
			e.addAction("copy");
			e.addType("volumeSlice");
			});

		this.addListener("droprequest", function(e) {
				var type = e.getCurrentType();
				switch (type)
				{
				case "volumeSlice":
					e.addData(type, this);
					break;
				default :
					alert ("type "+type+"not supported for drag and drop");
				}
			}, this);

		this.open();
	},

	statics : {
		/**
		 * The possibly linked window
		 */
		LINKEDWINDOW : null
	},

	properties : {
		/** defines current slice index */
		slice : { check : "Number", init : 0 ,  event : "changeSlice"}
	},

	members : {
		__path : null,
		__offset : null,
		__prefix : null,
		__image : null,
		__canvas : null,
		__maxZ : null,
		__slider : null,
		__timestamp : null,
		__fileFormatBox : null,

		__extent : null,
		__origin : null,
		__spacing : null,
		__dimensions: null,

		/**
		 * Returns the volume dimensions
		 * @return {Array} dimensions
		 */
		getDimensions : function () {
			return (this.__dimensions);
		},

		/**
		 * Returns current slice as an image
		 * @return {Image} the image
		 */
		getImage : function() {
			return this.__image;
		},

		/**
		 * Returns the canvas
		 * @return {qx.ui.embed.Canvas} the canvas
		 */
		getCanvas : function() {
			return this.__canvas;
		},

		/**
		 * Returns the slider
		 * @return {qx.ui.form.Slider}
		 */
		getSlider : function (){
			return this.__slider;
		},

		/**
		 * Returns the array of image pixels
		 * @return {Array} pixel array
		 */
		getSlicePixels : function (){
			return this.__canvas.getContext2d().getImageData(0, 0,
					this.__dimensions[0], this.__dimensions[1]).data;
		},

		/**
		 * Returns current slice 3D coordinates
		 * @return {Array} coordinates
		 */
		getCornersCoordinates : function () {
			var z=this.__origin[2]+(this.__dimensions[2]-this.__slider.getValue()+this.__extent[4])*this.__spacing[2];
			var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
			var xmax=this.__origin[0]+this.__extent[1]*this.__spacing[0];
			var ymin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
			var ymax=this.__origin[1]+this.__extent[3]*this.__spacing[1];
			var coordinates=[];
			coordinates[0]=xmin;
			coordinates[1]=ymax;
			coordinates[2]=z;
			coordinates[3]=xmax;
			coordinates[4]=ymax;
			coordinates[5]=z;
			coordinates[6]=xmax;
			coordinates[7]=ymin;
			coordinates[8]=z;
			coordinates[9]=xmin;
			coordinates[10]=ymin;
			coordinates[11]=z;
			return (coordinates);
		},

		/**
		 * Opens a file
		 * @param file {String} file to visualize
		 */
		openFile : function (file) {
			this.removeAll();

			var xmlhttp = new XMLHttpRequest();
			xmlhttp.open("GET", file + "?nocache=" + Math.random(), false);
			xmlhttp.send();
			var xmlDoc = xmlhttp.responseXML;

			var volume = xmlDoc.getElementsByTagName("volume")[0];
			if (volume == null) {
				return;
			}

			// parse extent, dimensions, origin, spacing
			var XMLextent = volume.getElementsByTagName("extent")[0];
			this.__extent = new Array(parseInt(XMLextent.getAttribute("x1")),
							parseInt(XMLextent.getAttribute("x2")),
							parseInt(XMLextent.getAttribute("y1")),
							parseInt(XMLextent.getAttribute("y2")),
							parseInt(XMLextent.getAttribute("z1")),
							parseInt(XMLextent.getAttribute("z2")));

			var XMLdimensions = volume.getElementsByTagName("dimensions")[0];
			this.__maxZ = parseInt(XMLdimensions.getAttribute("z"))-1;
			this.__dimensions = new Array(parseInt(XMLdimensions.getAttribute("x")),
							parseInt(XMLdimensions.getAttribute("y")),
							parseInt(XMLdimensions.getAttribute("z")));

			var XMLspacing = volume.getElementsByTagName("spacing")[0];
			this.__spacing = new Array(parseFloat(XMLspacing.getAttribute("x")),
							parseFloat(XMLspacing.getAttribute("y")),
							parseFloat(XMLspacing.getAttribute("z")));

			var XMLorigin = volume.getElementsByTagName("origin")[0];
			this.__origin = new Array(parseFloat(XMLorigin.getAttribute("x")),
							parseFloat(XMLorigin.getAttribute("y")),
							parseFloat(XMLorigin.getAttribute("z")));

			var slices = volume.getElementsByTagName("slicesprefix")[0];
			this.__offset = parseInt(slices.getAttribute("offset"));
			this.__timestamp = slices.getAttribute("timestamp");
			if (this.__timestamp == null) {
				this.__timestamp = Math.random();
			}
			this.__prefix = slices.childNodes[0].nodeValue;

			var slashIndex = file.lastIndexOf("/");
			this.__path = "";
			if (slashIndex > 0) {
				this.__path=file.substring(0,slashIndex)+"\/";
			}

			var leftContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox(5));

			this.__slider = new qx.ui.form.Slider();
			this.__slider.setMinimum(0);
			this.__slider.setMaximum(this.__maxZ);
			this.__slider.setValue(Math.round(0.5*this.__maxZ));
			this.__slider.setWidth(30);
			this.__slider.setOrientation("vertical");
			this.__slider.addListener("changeValue", function(event){this.updateImage();},this);
			
			// if there is only one slice, do not show the slider...
			if (this.__maxZ > 0) {
				leftContainer.add(this.__slider, {flex : 1});
			}

			this.__fileFormatBox = new qx.ui.form.SelectBox();
			this.__fileFormatBox.setWidth(30);
			var SelectJPG = new qx.ui.form.ListItem("jpg");
			this.__fileFormatBox.add(SelectJPG);
//			var SelectPNG = new qx.ui.form.ListItem("png");
//			this.__fileFormatBox.add(SelectPNG);
			leftContainer.add(this.__fileFormatBox);
			this.__fileFormatBox.addListener("changeSelection", function(event){
				this.updateImage();
			},this);

			this.add(leftContainer);

			this.__image = new Image();
			this.__canvas = new qx.ui.embed.Canvas().set({
				canvasWidth: this.__dimensions[0],
				canvasHeight: this.__dimensions[1],
				width: this.__dimensions[0],
				height: this.__dimensions[1],
				syncDimension: true
				});
	        this.__canvas.addListener("redraw", this.redraw, this);

			this.add(this.__canvas);
			this.updateImage();

			this.addListener("keypress",
				function(event) {if (event.getKeyIdentifier()=="S") 
					desk.VolViewSimple.LINKEDWINDOW=this;},this);
			this.addListener("click", function(event) {
				if ((desk.VolViewSimple.LINKEDWINDOW!=null)
					&&(desk.VolViewSimple.LINKEDWINDOW!=this)) {
					this.__slider.bind("value", desk.VolViewSimple.LINKEDWINDOW.__slider, "value");
					desk.VolViewSimple.LINKEDWINDOW.__slider.bind("value", this.__slider, "value");
					desk.VolViewSimple.LINKEDWINDOW=null;
				}
			},this);
		},

		/**
		 * trigers redraw
		 */
		redraw : function() {
			this.__canvas.getContext2d().drawImage(this.__image, 0, 0);
		},

		/**
		 * triggers image update
		 */
		updateImage : function() {
			var volView = this;
			var slice = volView.__maxZ-volView.__slider.getValue();
			this.__image.onload = function(){
				volView.redraw();
				volView.setSlice(slice);
			};
			this.__image.src = this.__path + this.__prefix 
				+ "XY" + (this.__offset + this.__maxZ - this.__slider.getValue())
				+ "." + this.__fileFormatBox.getSelection()[0].getLabel()
				+ "?nocache=" + this.__timestamp;
		}
	}
});

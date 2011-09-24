qx.Class.define("desk.volView", 
{
  extend : qx.ui.window.Window,

	construct : function(file, fileBrowser)
	{
		this.base(arguments);

		this.setLayout(new qx.ui.layout.HBox(5));
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);

		var volView=this;
		if (fileBrowser!=null)
		{
			//file is a tree node...
			var node=file;
			this.setCaption(node.label);
			var parameterMap={
				"action" : "Slice_Volume",
				"input_file" : fileBrowser.getNodePath(node),
				"output_directory" : "cache\/"};
			fileBrowser.getActions().launchAction(parameterMap, getAnswer, this);

			function getAnswer(e)
			{
				var req = e.getTarget();
				var slicesDirectory=req.getResponseText().split("\n")[0];
				volView.openFile("\/visu\/desk\/php\/"+slicesDirectory+"\/"+"volume.xml");
			}

			var label = new qx.ui.basic.Label("Computing slices, wait...").set({
				font : new qx.bom.Font(28, ["Verdana", "sans-serif"])
				});
			this.add(label, {flex : 1});
		}
		else
		{
			this.setCaption(file);
			this.openFile(file);
		}

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
		return (this);		
	},

	statics : {
		LINKEDWINDOW : null
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

		getDimensions : function ()
		{
			return (this.__dimensions);
		},

		getImage : function(){
			return this.__image;
		},

		getCanvas : function(){
			return this.__canvas;
		},

		getSlider : function (){
			return this.__slider;
		},

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

		openFile : function (file) {
			this.removeAll();

			var xmlDoc;
			{
				var xmlhttp=new XMLHttpRequest();
				xmlhttp.open("GET",file+"?nocache=" + Math.random(),false);
				xmlhttp.send();
				xmlDoc=xmlhttp.responseXML;
			}

			var volume=xmlDoc.getElementsByTagName("volume")[0];
			if (volume==null)
				return;

			// parse extent, dimensions, origin, spacing
			var XMLextent=volume.getElementsByTagName("extent")[0];
			this.__extent=new Array(parseInt(XMLextent.getAttribute("x1")),
							parseInt(XMLextent.getAttribute("x2")),
							parseInt(XMLextent.getAttribute("y1")),
							parseInt(XMLextent.getAttribute("y2")),
							parseInt(XMLextent.getAttribute("z1")),
							parseInt(XMLextent.getAttribute("z2")));

			var XMLdimensions=volume.getElementsByTagName("dimensions")[0];
			this.__maxZ=parseInt(XMLdimensions.getAttribute("z"))-1;
			this.__dimensions=new Array(parseInt(XMLdimensions.getAttribute("x")),
							parseInt(XMLdimensions.getAttribute("y")),
							parseInt(XMLdimensions.getAttribute("z")));

			var XMLspacing=volume.getElementsByTagName("spacing")[0];
			this.__spacing=new Array(parseFloat(XMLspacing.getAttribute("x")),
							parseFloat(XMLspacing.getAttribute("y")),
							parseFloat(XMLspacing.getAttribute("z")));

			var XMLorigin=volume.getElementsByTagName("origin")[0];
			this.__origin=new Array(parseFloat(XMLorigin.getAttribute("x")),
							parseFloat(XMLorigin.getAttribute("y")),
							parseFloat(XMLorigin.getAttribute("z")));

			var slices=volume.getElementsByTagName("slicesprefix")[0];
			this.__offset=parseInt(slices.getAttribute("offset"));
			this.__timestamp=slices.getAttribute("timestamp");
			if (this.__timestamp==null)
				this.__timestamp=Math.random();
			this.__prefix=slices.childNodes[0].nodeValue;

			var slashIndex=file.lastIndexOf("/");
			this.__path="";
			if (slashIndex>0)
				this.__path=file.substring(0,slashIndex)+"\/";

			var leftContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox(5));

			this.__slider=new qx.ui.form.Slider();
			this.__slider.setMinimum(0);
			this.__slider.setMaximum(this.__maxZ);
			this.__slider.setValue(Math.round(0.5*this.__maxZ));
			this.__slider.setWidth(30);
			this.__slider.setOrientation("vertical");
			this.__slider.addListener("changeValue", function(event){this.updateImage();},this);
			
			// if there is only one slice, do not show the slider...
			if (this.__maxZ>0)
				leftContainer.add(this.__slider, {flex : 1});

			this.__fileFormatBox = new qx.ui.form.SelectBox();
			this.__fileFormatBox.setWidth(30);
			var SelectJPG = new qx.ui.form.ListItem("jpg");
			this.__fileFormatBox.add(SelectJPG);
			var SelectPNG = new qx.ui.form.ListItem("png");
			this.__fileFormatBox.add(SelectPNG);
			leftContainer.add(this.__fileFormatBox);
			this.__fileFormatBox.addListener("changeSelection", function(event){this.updateImage();},this);

			this.add(leftContainer);

			this.__image=new Image();
			this.__canvas = new qx.ui.embed.Canvas().set({
				canvasWidth: this.__dimensions[0],
				canvasHeight: this.__dimensions[1],
				width: this.__dimensions[0],
				height: this.__dimensions[1],
				syncDimension: true
				});
	        this.__canvas.addListener("redraw", this.redraw, this);

			console.log(this.__dimensions);
			this.add(this.__canvas);
			this.updateImage();

			this.addListener("keypress",
				function(event) {if (event.getKeyIdentifier()=="S") 
					desk.volView.LINKEDWINDOW=this;},this);
			this.addListener("click",
				function(event) {
					if ((desk.volView.LINKEDWINDOW!=null)&&(desk.volView.LINKEDWINDOW!=this))
					{
						this.__slider.bind("value", desk.volView.LINKEDWINDOW.__slider, "value");
						desk.volView.LINKEDWINDOW.__slider.bind("value", this.__slider, "value");
						desk.volView.LINKEDWINDOW=null;
					}},this);				
		},

		redraw : function()
		{
			var width=this.__dimensions[0];
			var height=this.__dimensions[1];
			this.__canvas.getContext2d().drawImage(this.__image, 0, 0, width, height,
							0, 0, width, height);
		},

		updateImage : function() {
			var volView=this;
			this.__image.onload=function(){volView.redraw();};
			this.__image.src=this.__path+this.__prefix+(this.__offset+this.__maxZ-this.__slider.getValue())
				+"."+this.__fileFormatBox.getSelection()[0].getLabel()+"?nocache="+this.__timestamp;
		}
	}
});

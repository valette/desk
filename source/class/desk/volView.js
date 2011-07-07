qx.Class.define("desk.volView", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
	{
		this.base(arguments);

		this.setLayout(new qx.ui.layout.HBox());
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);
		this.setCaption(file);

		var xmlhttp=new XMLHttpRequest();
		xmlhttp.open("GET",file+"?nocache=" + Math.random(),false);
		xmlhttp.send();
		var xmlDoc=xmlhttp.responseXML;

		var volume=xmlDoc.getElementsByTagName("volume")[0];
		if (volume==null)
			return;

		var dimensions=volume.getElementsByTagName("dimensions")[0];
		this.__maxZ=parseInt(dimensions.getAttribute("z"))-1;

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

		this.__slider=new qx.ui.form.Slider();
		this.__slider.setMinimum(0);
		this.__slider.setMaximum(this.__maxZ);
		this.__slider.setWidth(30);
		this.__slider.setOrientation("vertical");
		this.__slider.addListener("changeValue", function(event){this.updateImage();},this);
		this.add(this.__slider);

		this.__image=new qx.ui.basic.Image();
		this.add(this.__image);
		this.updateImage();

		this.open();
		return (this);
	},

	members : {
		__path : null,
		__offset : null,
		__prefix : null,
		__image : null,
		__maxZ : null,
		__slider : null,
		__timestamp : null,

		updateImage : function() {
			this.__image.setSource(
				this.__path+this.__prefix+(this.__offset+this.__maxZ-this.__slider.getValue())+".png?nocache="+this.__timestamp);
		}
	}
});

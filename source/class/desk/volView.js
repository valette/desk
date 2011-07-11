qx.Class.define("desk.volView", 
{
  extend : qx.ui.window.Window,

	construct : function(file)
	{
		this.base(arguments);

		this.setLayout(new qx.ui.layout.HBox(5));
		this.setShowClose(true);
		this.setShowMinimize(false);
		this.setResizable(true,true,true,true);
		this.setUseResizeFrame(true);
		this.setUseMoveFrame(true);

		var volView=this;
		if (file.getTree!=null)
		{
			//file is a tree node...
			var node=file;
			this.setCaption(node.getLabel());
			var fileBrowser=node.getTree().getUserData("fileBrowser");
			var ajax = new XMLHttpRequest();
			ajax.onreadystatechange = function()
			{
				if(this.readyState == 4 && this.status == 200)
				{
					var sha1=ajax.responseText.split("\n")[0];
					volView.openFile("\/visu\/visu_cache\/"+sha1+"\/"+"volume.xml");
				}
				else if (this.readyState == 4 && this.status != 200)
				{
					// fetched the wrong page or network error...
					alert('"Fetched the wrong page" OR "Network error"');
				}
			};
			var label = new qx.ui.basic.Label("Computing slices, wait...").set({
				font : new qx.bom.Font(28, ["Verdana", "sans-serif"])
				});
			this.add(label, {flex : 1});
			ajax.open("POST", "/visu/volumeSlice.php", true);
			ajax.send(fileBrowser.getNodePath(node));
		}
		else
		{
			this.setCaption(file);
			this.openFile(file);
		}
			

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
		__fileFormatBox : null,
		
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

			var leftContainer = new qx.ui.container.Composite(new qx.ui.layout.VBox(5));

			this.__slider=new qx.ui.form.Slider();
			this.__slider.setMinimum(0);
			this.__slider.setMaximum(this.__maxZ);
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

			this.__image=new qx.ui.basic.Image();
			this.add(this.__image);
			this.updateImage();

		},

		updateImage : function() {
			this.__image.setSource(
				this.__path+this.__prefix+(this.__offset+this.__maxZ-this.__slider.getValue())+"."+
					this.__fileFormatBox.getSelection()[0].getLabel()+"?nocache="+this.__timestamp);
		}
	}
});

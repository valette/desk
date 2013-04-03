/**
* @ignore(THREE.Texture)
* @ignore(THREE.DataTexture)
* @ignore(THREE.NearestFilter)
* @ignore(THREE.LinearFilter)
* @ignore(THREE.RGBAFormat)
* @ignore(THREE.ShaderMaterial)
* @ignore(Uint8Array)
* @lint ignoreDeprecated(alert)
*/

qx.Class.define("desk.VolumeSlice", 
{
  extend : qx.core.Object,

	construct : function(file, orientation, parameters, callback)
	{
		this.base(arguments);

		this.setOrientation(orientation);
		this.__materials = [];
		this.__image = new Image();

		parameters = parameters || {};

		if (parameters.imageFormat != null) {
			this.setImageFormat(parameters.imageFormat);
		}

		if (parameters.colors) {
			this.__lookupTables = parameters.colors;
		}
		if (parameters.opacity != null) {
			this.__opacity = parameters.opacity;
		}
		if (parameters.linearFilter) {
			this.__textureFilter = THREE.LinearFilter;
		} else {
			this.__textureFilter = THREE.NearestFilter;
		}

		this.__file = file;
		this.update(callback);

		this.__initChangeSliceTrigger();

		this.addListener("changeImageFormat", this.update, this);
	},

	properties : {
		slice : { init : -1, check: "Number", event : "changeSlice"},
		imageFormat : { init : 1, check: "Number", event : "changeImageFormat"},
		ready : { init : false, check: "Boolean", event : "changeReady"},
		orientation : { init : 0, check: "Number", event : "changeOrientation"}
	},

	events : {
		// the "changeSlice" event is fired whenever the image changes
		"changeImage" : "qx.event.type.Event"
	},

	statics : {
		VERTEXSHADER : [
			"varying vec2 vUv;",
			"varying vec3 vPosition;",
			"void main( void ) {",
			"	vUv = uv;",
			"	vPosition = position;",
			"	gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1);",
			"}"
		].join("\n"),

		FRAGMENTSHADERBEGIN : [
			"uniform sampler2D texture;",
			"uniform sampler2D lookupTable;",
			"uniform float lookupTableLength;",
			"uniform float useLookupTable;",
			"uniform float contrast;",
			"uniform float brightness;",
			"uniform float opacity;",
			"uniform float imageType;",
			"uniform float scalarMin;",
			"uniform float scalarMax;",

			"varying vec2 vUv;",
			"void main() {",
				"vec4 rawData = texture2D( texture, vUv );",
				"vec4 rawBytes = floor(rawData*vec4(255.0)+vec4(0.5));",
				"float valueJPG=rawData[0];"
		].join("\n"),

		FRAGMENTSHADERCHAR : [
				"float color = rawBytes[0] - 256.0 * step ( 128.0, rawBytes[0] );"
		].join("\n"),

		FRAGMENTSHADERUCHAR : [
				"float color = rawBytes[0];"
		].join("\n"),

		FRAGMENTSHADERSHORT : [
				"float color = rawBytes[0]+ 256.0 * rawBytes[3] - 65536.0 * step ( 128.0, rawBytes[3] );"
		].join("\n"),

		FRAGMENTSHADERUSHORT : [
				"float color = rawBytes[0] + 256.0 * rawBytes[3];"
		].join("\n"),

		FRAGMENTSHADERFLOAT : [
			// just discard rawBytes if the type is not float, otherwise it might affect JPG results...
				"rawBytes=rawBytes* (1.0 - imageType);",
				"float Sign = 1.0 - step(128.0,rawBytes[3])*2.0 ;",
				"float Exponent = 2.0 * mod(rawBytes[3],128.0) + step(128.0,rawBytes[2]) - 127.0;",
				"float Mantissa = mod(rawBytes[2],128.0)*65536.0 + rawBytes[1]*256.0 +rawBytes[0]+ 8388608.0;",
				"float color = Sign * Mantissa * pow(2.0,Exponent - 23.0);"
		].join("\n"),

		FRAGMENTSHADEREND : [
				"float rescaledValuePNG = ( color - scalarMin ) / ( scalarMax - scalarMin );",
				"float rescaledPixelValue= (1.0 - imageType )*  rescaledValuePNG + imageType * valueJPG;",
				"float correctedPixelValue=(rescaledPixelValue+brightness)*contrast;",
				"vec4 correctedColor=vec4(correctedPixelValue);",
				"correctedColor[3]=opacity;",

				"float unscaledValueJPG=( scalarMax - scalarMin ) * valueJPG + scalarMin;",
				"float pixelValue=mix(color, unscaledValueJPG, imageType);",
				"float clampedValue=clamp(pixelValue/ lookupTableLength, 0.0, 1.0);",
				"vec2 colorIndex=vec2(clampedValue,0.0);",
				"vec4 colorFromLookupTable = texture2D( lookupTable,colorIndex  );",
				"colorFromLookupTable[3] *= opacity;",
				"gl_FragColor=mix (correctedColor, colorFromLookupTable, useLookupTable);",
			"}"
		].join("\n"),

		FRAGMENTSHADERENDMULTICHANNEL : [
			"uniform sampler2D texture;",
			"uniform sampler2D lookupTable;",
			"uniform float lookupTableLength;",
			"uniform float useLookupTable;",
			"uniform float contrast;",
			"uniform float brightness;",
			"uniform float opacity;",
			"uniform float imageType;",
			"uniform float scalarMin;",
			"uniform float scalarMax;",

			"varying vec2 vUv;",
			"void main() {",
				"gl_FragColor=(texture2D( texture, vUv )+brightness)*contrast;",
				"gl_FragColor[3]=opacity;",
			"}"
		].join("\n")
	},

	members : {
		__textureFilter : null,
		__availableImageFormat : 1,

		__file : null,

		__path : null,
		__offset : null,
		__prefix : null,
		__image : null,

		__timestamp : null,
		__fileFormatBox : null,

		__extent : null,
		__origin : null,
		__spacing : null,
		__dimensions: null,

		__numberOfScalarComponents : null,
		__scalarTypeString : null,
		__scalarType : null,
		__scalarSize : null,
		__scalarMin : null,
		__scalarMax : null,

		//THREE.js objects
		__scene : null,
		__camera : null,
		__renderer : null,
		__controls : null,

		__lookupTables : null,

		__materials : null,

		__brightness : 0,
		__contrast : 1,
		__opacity : 1,

		getFileName : function () {
			return this.__file;
		},

		getDimensions : function () {
			return this.__dimensions;
		},

		getExtent : function () {
			return this.__extent;
		},

		getOrigin : function () {
			return this.__origin;
		},

		getSpacing : function () {
			return this.__spacing;
		},

		get2DSpacing : function () {
			var spacing=this.__spacing;
			switch (this.getOrientation())
			{
				default:
				case 0 :
					return [spacing[0], spacing[1]];
				case 1 :
					return [spacing[2], spacing[1]];
				case 2 :
					return [spacing[0], spacing[2]];
			}
		},

		getScalarType : function () {
			return this.__scalarType;
		},

		getScalarTypeAsString : function () {
			return this.__scalarTypeString;
		},

		getScalarSize : function () {
			return this.__scalarSize;
		},

		getScalarBounds : function () {
			return [this.__scalarMin, this.__scalarMax];
		},

		update : function (callback) {
			var _this=this;
			function getAnswer(response) {
				_this.openXMLURL(desk.FileSystem.getFileURL(response.outputDirectory) + "volume.xml", callback);
			}

			var parameterMap={
				action : "slice_volume",
				input_volume : this.__file,
				output_directory : "cache/",
				format : this.getImageFormat(),
				slice_orientation : this.getOrientation()};
			desk.Actions.getInstance().launchAction(parameterMap, getAnswer, this);
		},

		getBrightness : function () {
			return this.__brightness;
		},

		getContrast : function () {
			return this.__contrast;
		},

		setBrightnessAndContrast : function (brightness, contrast)
		{
			this.__brightness = brightness;
			this.__contrast = contrast;
			var materials = this.__materials;
			for (var i = 0; i < materials.length; i++) {
				var material = materials[i];
				material.uniforms.brightness.value = brightness;
				material.uniforms.contrast.value = contrast;
			}
			this.fireEvent("changeImage");
		},

		setOpacity : function (opacity)
		{
			var materials = this.__materials;
			for (var i = 0; i < materials.length; i++) {
				materials[i].uniforms.opacity.value = opacity;
			}
			this.fireEvent("changeImage");
		},

		getSlicesIdOffset : function () {
			return this.__offset;
		},

		__setLookupTablesToMaterial : function ( luts , material ) {
			var lookupTable = material.uniforms.lookupTable.value;
			var numberOfColors = luts[0].length;
			material.uniforms.lookupTableLength.value = numberOfColors;
			material.uniforms.useLookupTable.value = 1;
			lookupTable.needsUpdate = true;
			var image = lookupTable.image;
			if (image.width != numberOfColors) {
				image.data = new Uint8Array(numberOfColors*4);
				image.width = numberOfColors;
			}
			var data = image.data;
			var lutR = luts[0];
			var lutG = luts[1];
			var lutB = luts[2];
			var lutAlpha = luts[3];
			var p=0;
			if (lutAlpha) {
				for (var j=0;j<numberOfColors;j++) {
					data[p++] = lutR[j];
					data[p++] = lutG[j];
					data[p++] = lutB[j];
					data[p++] = lutAlpha[j];
				}
			} else {
				for (var j = 0; j < numberOfColors; j++) {
					data[p++] = lutR[j];
					data[p++] = lutG[j];
					data[p++] = lutB[j];
					data[p++] = 255;
				}
			}
		},

		setLookupTables : function (luts) {
			if (!luts) {
				this.removeLookupTables();
				return;
			}
			this.__lookupTables = luts;

			var materials = this.__materials;
			for (var i = 0; i < materials.length; i++) {
				this.__setLookupTablesToMaterial ( luts , materials[i] );
			}
			this.fireEvent("changeImage");
		},

		getLookupTables : function () {
			return this.__lookupTables;
		},

		removeLookupTables : function () {
			this.__lookupTables = null;

			var materials = this.__materials;
			for (var i = 0; i < materials.length; i++) {
				materials[i].uniforms.useLookupTable.value = 0;
			}
			this.fireEvent("changeImage");
		},

		updateMaterial : function (material) {
			function addMembers(source, dest) {
				for (var attr in source) {
					if (source.hasOwnProperty(attr)) dest[attr] = source[attr];
				}
			}
			material.uniforms = {};
			addMembers(material.baseShader.baseUniforms, material.uniforms);
			var extraUniforms = material.baseShader.extraUniforms;
			material.fragmentShader = "";
			for (var i=0;i!=extraUniforms.length;i++) {
				var name=extraUniforms[i].name;
				material.fragmentShader+="\n uniform float "+name+";";
				material.uniforms[name]=extraUniforms[i];
			}

			material.fragmentShader+="\n"+material.baseShader.baseShaderBegin;
			var extraShaders=material.baseShader.extraShaders;
			for (i=0;i!=extraShaders.length;i++) {
				material.fragmentShader+="\n"+extraShaders[i];
			}
			material.fragmentShader+="\n"+material.baseShader.baseShaderEnd;
			material.needsUpdate=true;
		},

		__dummyLut : new Uint8Array(8),// [255, 0, 0, 255, 0, 0, 255, 255],

		getMaterial :function () {
			var texture = new THREE.Texture(this.__image);
			texture.needsUpdate = true;
			texture.generateMipmaps = false;
			var filter = this.__textureFilter;
			texture.magFilter = filter;
			texture.minFilter = filter;

			var lookupTable = new THREE.DataTexture(this.__dummyLut, 2, 1, THREE.RGBAFormat);
			lookupTable.generateMipmaps = false;
			lookupTable.magFilter = filter;
			lookupTable.minFilter = filter;
			lookupTable.needsUpdate = true;

			var middleShader;
			switch (this.__scalarType)
			{
			case 2 :
			case 15:
				//char / signed char
				middleShader = desk.VolumeSlice.FRAGMENTSHADERCHAR;
				break;
			case 3:
				middleShader = desk.VolumeSlice.FRAGMENTSHADERUCHAR;
				break;
			case 4:
				middleShader = desk.VolumeSlice.FRAGMENTSHADERSHORT;
				break;
			case 5:
				middleShader = desk.VolumeSlice.FRAGMENTSHADERUSHORT;
				break;
			default:
				middleShader = desk.VolumeSlice.FRAGMENTSHADERFLOAT;
				break;
			}

			var shader;
			if (this.__numberOfScalarComponents == 1) {
				shader = [desk.VolumeSlice.FRAGMENTSHADERBEGIN,
						middleShader,
						desk.VolumeSlice.FRAGMENTSHADEREND].join("\n");
			} else {
				shader = desk.VolumeSlice.FRAGMENTSHADERENDMULTICHANNEL;
			}

			var baseUniforms = {
					texture : {type : "t", slot: 0, value: texture },
					lookupTable : {type : "t", slot: 1, value: lookupTable },
					lookupTableLength : {type: "f", value: 2 },
					useLookupTable : {type: "f", value: 0 },
					contrast : {type: "f", value: this.__contrast },
					brightness : {type: "f", value: this.__brightness },
					opacity : {type: "f", value: this.__opacity},
					scalarMin : {type: "f", value: this.__scalarMin},
					scalarMax : {type: "f", value: this.__scalarMax},
					imageType : {type: "f", value: this.__availableImageFormat}
				};

			var baseShaderBegin = [desk.VolumeSlice.FRAGMENTSHADERBEGIN,
						middleShader].join("\n");

			var baseShaderEnd = desk.VolumeSlice.FRAGMENTSHADEREND;

			var material = new THREE.ShaderMaterial({
				uniforms: baseUniforms,
				vertexShader: desk.VolumeSlice.VERTEXSHADER,
				fragmentShader: shader,
				transparent : true
			});

			material.baseShader = {
				baseUniforms : baseUniforms,
				baseShaderBegin : baseShaderBegin,
				baseShaderEnd : baseShaderEnd,
				extraUniforms : [],
				extraShaders : []
			};

			var luts = this.getLookupTables();
			if (luts) {
				this.__setLookupTablesToMaterial (luts , material);
			}

			this.__materials.push(material);
//			material.baseShader.extraShaders.push("valueJPG=0.5;\n valueJPG=0.5;");
//			material.baseShader.extraShaders.push("if (color < thresholdlow) \n color=0.0;");
//			var thresholdValue=200.0;
//			material.baseShader.extraUniforms.push({name : "thresholdlow", type: "f", value: thresholdValue });
//			this.updateMaterial(material);
			return material;
		},

		getCornersCoordinates : function () {
			switch (this.getOrientation())
			{
			// XY Z
			case 0 :
			default:
				var z=this.__origin[2]+(this.getSlice()+this.__extent[4])*this.__spacing[2];
				var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
				var xmax=this.__origin[0]+(this.__extent[1]+1)*this.__spacing[0];
				var ymin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
				var ymax=this.__origin[1]+(this.__extent[3]+1)*this.__spacing[1];
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
			// ZY X
			case 1 :
				var x=this.__origin[0]+(this.getSlice()+this.__extent[0])*this.__spacing[0];
				ymin=this.__origin[2]+this.__extent[4]*this.__spacing[2];
				ymax=this.__origin[2]+(this.__extent[5]+1)*this.__spacing[2];
				var zmin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
				var zmax=this.__origin[1]+(this.__extent[3]+1)*this.__spacing[1];
				coordinates=[];
				coordinates[0]=x;
				coordinates[1]=zmax;
				coordinates[2]=ymin;
				coordinates[3]=x;
				coordinates[4]=zmax;
				coordinates[5]=ymax;
				coordinates[6]=x;
				coordinates[7]=zmin;
				coordinates[8]=ymax;
				coordinates[9]=x;
				coordinates[10]=zmin;
				coordinates[11]=ymin;
				return (coordinates);
			// XZ Y
			case 2 :
				var y=this.__origin[1]+(this.getSlice()+this.__extent[2])*this.__spacing[1];
				xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
				xmax=this.__origin[0]+(this.__extent[1]+1)*this.__spacing[0];
				zmin=this.__origin[2]+this.__extent[4]*this.__spacing[2];
				zmax=this.__origin[2]+(this.__extent[5]+1)*this.__spacing[2];
				coordinates=[];
				coordinates[0]=xmin;
				coordinates[1]=y;
				coordinates[2]=zmax;
				coordinates[3]=xmax;
				coordinates[4]=y;
				coordinates[5]=zmax;
				coordinates[6]=xmax;
				coordinates[7]=y;
				coordinates[8]=zmin;
				coordinates[9]=xmin;
				coordinates[10]=y;
				coordinates[11]=zmin;
				return (coordinates);
			}
		},

		getBoundingBoxDiagonalLength : function () {
			var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
			var xmax=this.__origin[0]+(this.__extent[1]+1)*this.__spacing[0];
			var ymin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
			var ymax=this.__origin[1]+(this.__extent[3]+1)*this.__spacing[1];
			var zmin=this.__origin[2]+this.__extent[4]*this.__spacing[2];
			var zmax=this.__origin[2]+(this.__extent[5]+1)*this.__spacing[2];
			return Math.sqrt((xmax-xmin)*(xmax-xmin)+
								(ymax-ymin)*(ymax-ymin)+
								(zmax-zmin)*(zmax-zmin));
		},

		get2DDimensions: function () {
			var dims=[];
			switch(this.getOrientation())
			{
				// ZY X
				case 1 :
					dims[0]=this.__dimensions[2];
					dims[1]=this.__dimensions[1];
					break;
				// XZ Y
				case 2 :
					dims[0]=this.__dimensions[0];
					dims[1]=this.__dimensions[2];
					break;
				// XY Z
				default :
					dims[0]=this.__dimensions[0];
					dims[1]=this.__dimensions[1];
			}
			return (dims);
		},

		get2DCornersCoordinates : function () {
			var xmin=this.__origin[0]+this.__extent[0]*this.__spacing[0];
			var xmax=this.__origin[0]+(this.__extent[1]+1)*this.__spacing[0];
			var ymin=this.__origin[1]+this.__extent[2]*this.__spacing[1];
			var ymax=this.__origin[1]+(this.__extent[3]+1)*this.__spacing[1];
			var zmin=this.__origin[2]+this.__extent[4]*this.__spacing[2];
			var zmax=this.__origin[2]+(this.__extent[5]+1)*this.__spacing[2];
			var coordinates=[];

			switch(this.getOrientation())
			{
				// ZY X
				case 1 :
					coordinates[0]=zmin;
					coordinates[1]=ymax;
					coordinates[2]=zmax;
					coordinates[3]=ymax;
					coordinates[4]=zmax;
					coordinates[5]=ymin;
					coordinates[6]=zmin;
					coordinates[7]=ymin;
					break;
				// XZ Y
				case 2 :
					coordinates[0]=xmin;
					coordinates[1]=zmax;
					coordinates[2]=xmax;
					coordinates[3]=zmax;
					coordinates[4]=xmax;
					coordinates[5]=zmin;
					coordinates[6]=xmin;
					coordinates[7]=zmin;
					break;
				// XY Z
				default :
					coordinates[0]=xmin;
					coordinates[1]=ymax;
					coordinates[2]=xmax;
					coordinates[3]=ymax;
					coordinates[4]=xmax;
					coordinates[5]=ymin;
					coordinates[6]=xmin;
					coordinates[7]=ymin;
			}
			return (coordinates);
		},

		getNumberOfSlices : function () {
			switch(this.getOrientation())
			{
				// ZY X
				case 1 :
					return this.__dimensions[0];
				// XZ Y
				case 2 :
					return this.__dimensions[1];
				// XY Z
				default :
					return this.__dimensions[2];
			}
		},

		openXMLURL : function (xmlURL, callback) {
			var req = new qx.io.request.Xhr(xmlURL+"?nocache=" + Math.random());
			req.setAsync(true);

			req.addListener("success", function(e) {
				this.__parseXMLresponse(e.getTarget().getResponse(), xmlURL);
				if (typeof callback === 'function') {
					callback();
				}
				req.dispose();
			}, this);

			req.send();
		},

		__parseXMLresponse : function (xmlDoc, xmlURL) {
			this.__availableImageFormat = this.getImageFormat();
			var volume = xmlDoc.getElementsByTagName("volume")[0];
			if (!volume)
				return;

			// parse extent, dimensions, origin, spacing
			var XMLextent = volume.getElementsByTagName("extent")[0];
			this.__extent = new Array(parseInt(XMLextent.getAttribute("x1"), 10),
							parseInt(XMLextent.getAttribute("x2"), 10),
							parseInt(XMLextent.getAttribute("y1"), 10),
							parseInt(XMLextent.getAttribute("y2"), 10),
							parseInt(XMLextent.getAttribute("z1"), 10),
							parseInt(XMLextent.getAttribute("z2"), 10));

			var XMLdimensions = volume.getElementsByTagName("dimensions")[0];

			this.__dimensions = new Array(parseInt(XMLdimensions.getAttribute("x"), 10),
							parseInt(XMLdimensions.getAttribute("y"), 10),
							parseInt(XMLdimensions.getAttribute("z"), 10));

			var XMLspacing = volume.getElementsByTagName("spacing")[0];
			this.__spacing = new Array(parseFloat(XMLspacing.getAttribute("x")),
							parseFloat(XMLspacing.getAttribute("y")),
							parseFloat(XMLspacing.getAttribute("z")));

			var XMLorigin = volume.getElementsByTagName("origin")[0];
			this.__origin = new Array(parseFloat(XMLorigin.getAttribute("x")),
							parseFloat(XMLorigin.getAttribute("y")),
							parseFloat(XMLorigin.getAttribute("z")));

			var XMLscalars = volume.getElementsByTagName("scalars")[0];
			this.__numberOfScalarComponents = parseInt(XMLscalars.getAttribute("numberOfScalarComponents"),10);
			this.__scalarType = parseInt(XMLscalars.getAttribute("type"),10);
			this.__scalarSize = parseInt(XMLscalars.getAttribute("size"),10);
			this.__scalarMin = parseFloat(XMLscalars.getAttribute("min"),10);
			this.__scalarMax = parseFloat(XMLscalars.getAttribute("max"),10);
			this.__scalarTypeString = XMLscalars.childNodes[0].nodeValue;

			var slices = volume.getElementsByTagName("slicesprefix")[0];
			this.__offset = parseInt(slices.getAttribute("offset"), 10);
			this.__timestamp = slices.getAttribute("timestamp");
			if (this.__timestamp == null)
				this.__timestamp = Math.random();
			this.__prefix = slices.childNodes[0].nodeValue;

			this.__path = desk.FileSystem.getFileDirectory(xmlURL);

			// feed shader with constants
			var materials = this.__materials;
			for (var i = 0; i < materials.length; i++){
				materials[i].uniforms.imageType.value = this.__availableImageFormat;
			}

			if (this.isReady()) {
				this.__updateTriggered = true;
				this.__updateImage();
			}
			else {
				this.setReady(true);
			}
		},

		__updateTriggered : true,
		__updateInProgress : false,

		__initChangeSliceTrigger : function () {
			this.addListener("changeSlice", function(){
				this.__updateTriggered=true;
				this.__updateImage();
			},this);

			var _this=this;

			this.__image.onload=function(){
				clearTimeout(this.__timeOut);
				_this.__updateInProgress = false;
				var materials=_this.__materials;
				for (var i = 0; i < materials.length; i++){
					materials[i].uniforms.texture.value.needsUpdate = true;
				}
				_this.fireEvent("changeImage");
			};

			this.__image.onerror=function(){
				_this.__updateTriggered=true;
				_this.__updateInProgress=false;
				_this.__updateImage();
			};

			this.__image.onabort=function(){
				_this.__updateTriggered=true;
				_this.__updateInProgress=false;
				_this.__updateImage();
				};
		},

		__timeOut : null,

		__updateImage : function () {
			if (this.__updateInProgress) {
				this.__updateTriggered=true;
				return;
			}
			if (this.__updateTriggered) {
				this.__timeOut=setTimeout(timeOut,5000);
				this.__reallyUpdateImage();
			}

			var _this=this;
			function timeOut () {
				_this.__updateInProgress=false;
				_this.__updateImage();
				
			}
		},

		__reallyUpdateImage : function() {
			var fileSuffix;
			if (this.__availableImageFormat === 0) {
				fileSuffix=".png";
			}
			else {
				fileSuffix=".jpg";
			}

			var orientationString;
			switch(this.getOrientation())
			{
				// ZY X
				case 1 :
					orientationString="ZY";
					break;
				// XZ Y
				case 2 :
					orientationString="XZ";
					break;
				// XY Z
				default :
					orientationString="XY";
					break;
				}
			this.__updateInProgress=true;
			this.__updateTriggered=false;
			this.__image.src = this.__path + this.__prefix + orientationString +
        (this.__offset+this.getSlice()) + fileSuffix + "?nocache=" + this.__timestamp;
		}
	}
});

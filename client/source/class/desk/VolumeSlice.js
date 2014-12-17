/**
* @ignore(THREE.*)
* @ignore(Uint8Array)
* @ignore (_.*)
* @lint ignoreDeprecated(alert)
*/

/*
 3 possible orientations : 
	0 : XY Z
	1 : ZY X
	2 : XZ Y
*/

qx.Class.define("desk.VolumeSlice", 
{
	extend : qx.core.Object,

	/**
	 * Constructor
	 * @param file {String} volume to slice
	 * @param orientation {Number} orienation, equals to 0, 1 or 2
	 * @param opts {Object} optional additional options
	 * @param callback {Function} callback when slicing is finished
	 * @param context {Objext} optional context for the callback
	 */
	construct : function(file, orientation, opts, callback, context) {
		this.base(arguments);

		if (typeof(opts) == "function") {
			context = callback;
			callback = opts;
			opts = {};
		}

		this.setOrientation(orientation);
		this.__materials = [];

		this.__opts = opts = opts || {};
		if (opts.format != null) {
			this.setImageFormat(opts.format);
		}
		this.__lookupTables = opts.colors || null;
		if (opts.opacity != null) {
			this.__opacity = opts.opacity;
		}
		this.__convert_to_uchar = opts.convert_to_uchar || false;
		this.__textureFilter = opts.linearFilter ? THREE.LinearFilter : THREE.NearestFilter;
		this.__file = file;

		this.__initImageLoader();

		this.update(callback, context);
		this.addListener("changeImageFormat", this.update, this);
	},

	properties : {
		/**
		 * current slice index
		 */
		slice : { init : -1, check: "Number", event : "changeSlice"},

		/**
		 * current orientation
		 */
		orientation : { init : 0, check: "Number", event : "changeOrientation"},

		/**
		 * current Image format
		 */
		imageFormat : { init : 1, check: "Number", event : "changeImageFormat"}
	},

	events : {
		/**
		 * fired whenever the image changes
		 */
		"changeImage" : "qx.event.type.Event"
	},

	statics : {
		COLORS : ["red", "green", "blue"],

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
		].join("\n"),

		FRAGMENTSHADERFINISH : "\n }",

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
		].join("\n"),

		// indices of x, y and z according to orientation
		indices : {
			x: [0, 2, 0], y : [1, 1, 2], z: [2, 0, 1]
		}
	},

	members : {
		__opts : null,
		__orientationNames : ['XY', 'ZY', 'XZ'],

		__textureFilter : null,
		__availableImageFormat : 1,

		__file : null,

		__path : null,
		__offset : null,
		__prefix : null,
		__image : null,

		__timestamp : null,

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

		__lookupTables : null,

		__materials : null,

		__brightness : 0,
		__contrast : 1,
		__opacity : 1,

		__convert_to_uchar : null,

		__ready : false,

		/**
		 * informs whether the slice is ready (i.e. loaded);
		 * @return {Boolean} ready/not ready
		 */
		isReady : function () {
			return this.__ready;
		},

		/**
		 * returns the loaded file
		 * @return {String} the loaded file
		 */
		getFileName : function () {
			return this.__file;
		},

		
		/**
		 * returns the volume dimensions
		 * @return {Array} array of 3D dimensions
		 */
		getDimensions : function () {
			return this.__dimensions;
		},

		/**
		 * returns the volume extent
		 * @return {Array} array of 3D extent
		 */
		getExtent : function () {
			return this.__extent;
		},

		/**
		 * returns the volume origin
		 * @return {Array} array of origin coordinates
		 */
		getOrigin : function () {
			return this.__origin;
		},

		/**
		 * returns the volume spacing
		 * @return {Array} array of spacings
		 */
		getSpacing : function () {
			return this.__spacing;
		},

		/**
		 * returns the volume 2D spacing i.e. the spacing in the projected view
		 * @return {Array} array of spacings
		 */
		 get2DSpacing : function () {
			var o = this.getOrientation();
			return [this.__spacing[desk.VolumeSlice.indices.x[o]],
				this.__spacing[desk.VolumeSlice.indices.y[o]]];
		},

		/**
		 * returns the volume scalar type
		 * @return {Int} scalar type (according to VTK definition)
		 */
		getScalarType : function () {
			return this.__scalarType;
		},

		/**
		 * returns the volume scalar type as a string
		 * @return {String} scalar type (according to VTK definition)
		 */
		getScalarTypeAsString : function () {
			return this.__scalarTypeString;
		},

		/**
		 * returns the volume scalar size (in bytes)
		 * @return {Int} scalar size
		 */
		getScalarSize : function () {
			return this.__scalarSize;
		},

		/**
		 * returns the volume scalar bounds [min, max]
		 * @return {Array} bounds
		 */
		getScalarBounds : function () {
			return [this.__scalarMin, this.__scalarMax];
		},

		/**
		 * reloads the volume
		 * @param callback {Function} callback when done
		 * @param context {Object} optional callback context
		 */
		update : function (callback, context) {
            var params = {
			    input_volume : this.__file,
			    slice_orientation : this.getOrientation()
			};

			_.extend(params, this.__opts.sliceWith || {});

			if (this.__convert_to_uchar) {
				params.convert_to_uchar = "1";
			}

			if ((desk.Actions.getInstance().getAction("vol_slice") != null)
				&& (desk.FileSystem.getFileExtension(this.__file) == "vol")) {
				params.action = "vol_slice";
			} else {
				params.action = "slice_volume";
			    params.format = this.getImageFormat();
			}
		    desk.Actions.getInstance().launchAction(params,
				function (response) {
					if (response.error) {
						callback("Error while slicing volume : " + response.error);
						return;
					}
					this.openXMLURL(desk.FileSystem.getFileURL(response.outputDirectory) + "volume.xml",
						callback, context);
			}, this);
		},

		/**
		 * returns current brightness
		 * @return {Float} current brightness
		 */
		getBrightness : function () {
			return this.__brightness;
		},

		/**
		 * returns current contrast
		 * @return {Float} current contrast
		 */
		getContrast : function () {
			return this.__contrast;
		},

		/**
		 * sets brightness and contrast for all generated materials
		 * @param brightness {Number} brightness
		 * @param contrast {Number} contrast
		 */
		setBrightnessAndContrast : function (brightness, contrast) {
			this.__brightness = brightness;
			this.__contrast = contrast;
			this.__materials.forEach(function (material) {
				material.uniforms.brightness.value = brightness;
				material.uniforms.contrast.value = contrast;
			});
			this.fireEvent("changeImage");
		},

		/**
		 * sets opacity for all generated materials
		 * @param opacity {Number} opacity in the [0, 1] range
		 */
		 setOpacity : function (opacity) {
			this.__materials.forEach(function (material) {
				material.uniforms.opacity.value = opacity;
			});
			this.fireEvent("changeImage");
		},

		/**
		 * gets the slices file names offset
		 * @return {Int} offset
		 */
		getSlicesIdOffset : function () {
			return this.__offset;
		},

		/**
		 * attach lookup tables to material
		 * @param luts {Array} array of luts
		 * @param material {THREE.Material} material
		 */
		 __setLookupTablesToMaterial : function ( luts , material ) {
			var lut = material.uniforms.lookupTable.value;
			var numberOfColors = luts[0].length;
			material.uniforms.lookupTableLength.value = numberOfColors;
			material.uniforms.useLookupTable.value = 1;
			lut.needsUpdate = true;
			var image = lut.image;
			if (image.width != numberOfColors) {
				image.data = new Uint8Array(numberOfColors * 4);
				image.width = numberOfColors;
			}

			for (var j = 0, p = 0; j < numberOfColors; j++) {
				for (var k = 0; k < 4; k++) {
					image.data[p++] = luts[k] ? luts[k][j] : 255;
				}
			}
		},

		/**
		 * set lookup tables
		 * @param luts {Array} array of luts
		 */
		setLookupTables : function (luts) {
			if (!luts) {
				this.removeLookupTables();
				return;
			}
			this.__lookupTables = luts;

			this.__materials.forEach(function (material) {
				this.__setLookupTablesToMaterial ( luts , material );
			}, this);
			this.fireEvent("changeImage");
		},

		/**
		 * get lookup tables
		 * @return {Array} array of luts
		 */
		getLookupTables : function () {
			return this.__lookupTables;
		},

		/**
		 * remove all lookup tables
		 */
		removeLookupTables : function () {
			this.__lookupTables = null;

			this.__materials.forEach(function (material) {
				material.uniforms.useLookupTable.value = 0;
			});
			this.fireEvent("changeImage");
		},

		/**
		 * updates a material
		 * @param material {THREE.Material} the material to update
		 */
		updateMaterial : function (material) {
			material.uniforms = {};
			Object.keys(material.baseShader.baseUniforms).forEach(function (key) {
				material.uniforms[key] = material.baseShader.baseUniforms[key];
			});

			material.fragmentShader = "";
			material.baseShader.extraUniforms.forEach(function (uniform) {
				material.fragmentShader += "\n uniform float " + uniform.name + ";";
				material.uniforms[uniform.name] = uniform;
			});

			material.fragmentShader += "\n" + material.baseShader.baseShaderBegin;
			material.baseShader.extraShaders.forEach(function (shader) {
				material.fragmentShader += "\n" + shader;
			});

			material.fragmentShader += "\n" + material.baseShader.baseShaderEnd;
			material.needsUpdate = true;
		},

		__dummyLut : new Uint8Array(8),// [255, 0, 0, 255, 0, 0, 255, 255],

		/**
		 * returns a three.js material fit for rendering
		 * @return {THREE.ShaderMaterial} material
		 */
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
			switch (this.__scalarType) {
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
						desk.VolumeSlice.FRAGMENTSHADEREND,
						desk.VolumeSlice.FRAGMENTSHADERFINISH].join("\n");
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
				middleShader,
				desk.VolumeSlice.FRAGMENTSHADEREND].join("\n");

			var baseShaderEnd = desk.VolumeSlice.FRAGMENTSHADERFINISH;

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

			if (this.__lookupTables) {
				this.__setLookupTablesToMaterial (this.__lookupTables , material);
			}

			this.__materials.push(material);
//			material.baseShader.extraShaders.push("valueJPG=0.5;\n valueJPG=0.5;");
//			material.baseShader.extraShaders.push("if (color < thresholdlow) \n color=0.0;");
//			var thresholdValue=200.0;
//			material.baseShader.extraUniforms.push({name : "thresholdlow", type: "f", value: thresholdValue });
//			this.updateMaterial(material);
			material.addEventListener('dispose', function () {
				this.__materials = _.without(this.__materials, material);
			}, this);
			return material;
		},

		/**
		 * returns the volume bounding box in the form [xmin, xmax, ymin, ymax, zmin, zmax]
		 * @return {Array} array of bounds
		 */
		getBounds : function () {
			return [this.__origin[0] + this.__extent[0] * this.__spacing[0],
				this.__origin[0] + (this.__extent[1] + 1) * this.__spacing[0],
				this.__origin[1] + this.__extent[2] * this.__spacing[1],
				this.__origin[1] + (this.__extent[3] + 1) * this.__spacing[1],
				this.__origin[2] + this.__extent[4] * this.__spacing[2],
				this.__origin[2] + (this.__extent[5] + 1) * this.__spacing[2]];
		},

		/**
		 * returns the slice 3D coordinates the form [x0, y0, z0, ... , x3, y3, z3]
		 * @param slice {Integer} optional slice index, current slice is used if not provided
		 * @return {Array} array of coordinates
		 */
		getCornersCoordinates : function (slice) {
			if (slice === undefined) {
				slice = this.getSlice();
			}

			var bounds = this.getBounds(),
				coords = [],
				indices = desk.VolumeSlice.indices,
				orientation = this.getOrientation();

			var xi = indices.x[orientation];
			var yi = indices.y[orientation];
			var zi = indices.z[orientation];

			for (var i = 0; i < 4; i++) {
				coords[3 * i + xi] =  this.__origin[xi] +
					this.__extent[2 * xi + (i % 2)] * this.__spacing[xi];

				coords[3 * i + yi] =  this.__origin[yi] +
					this.__extent[2 * yi + (i > 1 ? 1 : 0)] * this.__spacing[yi];

				coords[3 * i + zi] =  this.__origin[zi] +
					(slice + this.__extent[2 * zi]) * this.__spacing[zi];
			}

			return coords;
		},

		/**
		 * returns the volume bounding box diagonal length
		 * @return {Number} diagonal length
		 */
		 getBoundingBoxDiagonalLength : function () {
			var bounds = this.getBounds();
			return Math.sqrt(Math.pow(bounds[1] - bounds[0], 2) +
							Math.pow(bounds[3] - bounds[2], 2) +
							Math.pow(bounds[5] - bounds[4], 2));
		},

		/**
		 * returns the index of the z axis in the orientation
		 * @return {Int} index of the z axis
		 */
		getZIndex : function () {
			return desk.VolumeSlice.indices.z[this.getOrientation()];
		},

		/**
		 * returns the dimensions of the slice in the form [dimx, dimy]
		 * @return {Array} array of dimensions
		 */
		 get2DDimensions: function () {
			var o = this.getOrientation();
			return [this.__dimensions[desk.VolumeSlice.indices.x[o]],
				this.__dimensions[desk.VolumeSlice.indices.y[o]]];
		},

		/**
		 * returns the slice 2D coordinates the form [x0, y0, ... , x3, y3]
		 * @return {Array} array of coordinates
		 */
		 get2DCornersCoordinates : function () {
			var bounds = this.getBounds();
			var xi = 2 * desk.VolumeSlice.indices.x[this.getOrientation()];
			var yi = 2 * desk.VolumeSlice.indices.y[this.getOrientation()];

			return [bounds[xi], bounds[yi],
					bounds[xi + 1], bounds[yi],
					bounds[xi], bounds[yi + 1],
					bounds[xi + 1], bounds[yi + 1]];
		},

		/**
		 * returns the 2D origin [x, y]
		 * @return {Array} array of coordinates
		 */
		 get2DOrigin : function () {
			 return this.get2DCornersCoordinates().slice(0,2);
		},

		/**
		 * returns the total number of slices
		 * @return {Number} number of slices
		 */
		 getNumberOfSlices : function () {
			return this.__dimensions[this.getZIndex()];
		},

		/**
		 * loads slices pointed by an xml file
		 * @param xmlURL {String} file url
		 * @param callback {Function} callback when done
		 * @param context {Object} optional callback context
		 */
		openXMLURL : function (xmlURL, callback, context) {
			var req = new qx.io.request.Xhr(xmlURL + "?nocache=" + Math.random());
			req.setAsync(true);

			req.addListener("success", function(e) {
				var error;
				try {
					this.__parseXMLresponse(e.getTarget().getResponse(), xmlURL);
					req.dispose();
				} catch (err) {
					error = err;
				}
				if (typeof callback === 'function') {
					callback.call(context, error);
				}
			}, this);
			req.addListener("fail", function (e) {
				callback.apply(context, req.getStatusText())
			});
			req.send();
		},

		/**
		 * callback when the volume xml file is loaded
		 * @param xmlDoc {Element} xml content
		 * @param xmlURL {Strig} xml file url
		 */
		__parseXMLresponse : function (xmlDoc, xmlURL) {
			this.__availableImageFormat = this.getImageFormat();
			var volume = xmlDoc.getElementsByTagName("volume")[0];
			if (!volume)
				return;

			// parse extent, dimensions, origin, spacing
			this.__extent = ["x1", "x2", "y1", "y2", "z1", "z2"].map(function (field) {
				return parseInt(volume.getElementsByTagName("extent")[0].getAttribute(field), 10);
			});

			this.__dimensions = ["x", "y", "z"].map(function (field) {
				return parseInt(volume.getElementsByTagName("dimensions")[0].getAttribute(field), 10);
			});

			this.__spacing = ["x", "y", "z"].map(function (field) {
				return parseFloat(volume.getElementsByTagName("spacing")[0].getAttribute(field));
			});

			this.__origin = ["x", "y", "z"].map(function (field) {
				return parseFloat(volume.getElementsByTagName("origin")[0].getAttribute(field));
			});

			var XMLscalars = volume.getElementsByTagName("scalars")[0];
			this.__numberOfScalarComponents = parseInt(XMLscalars.getAttribute(	"numberOfScalarComponents"),10);
			this.__scalarType = parseInt(XMLscalars.getAttribute("type"),10);
			this.__scalarSize = parseInt(XMLscalars.getAttribute("size"),10);
			this.__scalarMin = parseFloat(XMLscalars.getAttribute("min"),10);
			this.__scalarMax = parseFloat(XMLscalars.getAttribute("max"),10);
			this.__scalarTypeString = XMLscalars.childNodes[0].nodeValue;

			var slices = volume.getElementsByTagName("slicesprefix")[0];
			this.__offset = parseInt(slices.getAttribute("offset"), 10);
			this.__timestamp = slices.getAttribute("timestamp") || Math.random();
			this.__prefix = slices.childNodes[0].nodeValue;

			this.__path = desk.FileSystem.getFileDirectory(xmlURL);

			// feed shader with constants
			this.__materials.forEach(function (material) {
				material.uniforms.imageType.value = this.__availableImageFormat;
			}, this);

			if (this.__ready) {
				this.__updateImage();
			}
			this.__ready = true;
		},

		__timeout : null,

		/**
		 * changes the image url, sets timeouts
		 */
		__updateImage : function () {
			clearTimeout(this.__timeout);
			this.__timeout = setTimeout(this.__updateImage.bind(this), 5000);
			this.__image.src = this.getSliceURL(this.getSlice()) + "?nocache=" + this.__timestamp;
		},

		/**
		 * Setups image loading
		 */
		__initImageLoader : function () {
			this.__image = new Image();

			this.__image.onload = function() {
				clearTimeout(this.__timeout);
				this.__materials.forEach(function (material) {
					material.uniforms.texture.value.needsUpdate = true;
				});
				this.fireEvent("changeImage");
			}.bind(this);

			this.__image.onerror = this.__image.onabort = this.__updateImage.bind(this);
			this.addListener("changeSlice", this.__updateImage, this);
		},

		/**
		 * returns the full file name for a given slice
		 * @param slice {Number} slice number
		 * @return {String} full file name
		 */
		getSliceURL : function (slice) {
			return this.__path + this.__prefix +
				this.__orientationNames[this.getOrientation()] +
				(this.__offset + slice) +
				(this.__availableImageFormat ? '.jpg' : '.png');
		}
	}
});

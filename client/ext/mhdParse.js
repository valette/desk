/**
 * @author Sebastien Valette
 */

var typesAsString = {
  MET_CHAR : "char",
  MET_UCHAR : "unsigned char", 
  MET_SHORT : "short",
  MET_USHORT : "unsigned short",
  MET_INT : "int",
  MET_UINT : "unsigned int", 
  MET_LONG : "long",
  MET_ULONG : "unsigned long",
  MET_FLOAT : "float",
  MET_DOUBLE : "double"
};

var types = {
  MET_CHAR : 2,
  MET_UCHAR : 3, 
  MET_SHORT : 4,
  MET_USHORT : 5,
  MET_INT : 6,
  MET_UINT : 7, 
  MET_LONG : 8,
  MET_ULONG : 9,
  MET_FLOAT : 10,
  MET_DOUBLE : 11
};

MHD = {
    parse : function (content) {
        function text(value) {return value;}
        
        function bool(value) {return value.toLowerCase() === "true";}
        
        function int(value) {return parseInt(value, 10);}
        
        function vec(value) {
           return value.split(" ").map(function(value) {
               return parseFloat(value); 
            });
        }
        
        var keys = {
            ObjectType  : text,
            NDims : int,
            BinaryData : bool,
            BinaryDataByteOrderMSB : bool,
            CompressedData : bool,
            CompressedDataSize : int, 
            TransformMatrix : vec,
            Offset : vec,
            CenterOfRotation : vec,
            ElementSpacing  : vec,
            DimSize : vec,
            AnatomicalOrientation  : text,
            ElementType : text,
            ElementDataFile : text,
            ElementByteOrderMSB : bool,
            ElementNumberOfChannels : int
        };

        var mhd = {
			Offset : [0, 0, 0],
			ElementSpacing : [1, 1, 1],
			ElementNumberOfChannels : 1
		};
        content.split("\n").forEach(function (line) {
            var index = line.indexOf("=");
            if (index < 0) return;

            var key = line.substr(0, index).trim();
            var parser = keys[key];
            if (parser) {
                mhd[key] = parser(line.substr(index + 1).trim());
            } else {
                console.warn("key " + key + " unknown");
            }
        });
        mhd.scalarType = types[mhd.ElementType];
        mhd.scalarTypeAsString = typesAsString[mhd.ElementType];
        return mhd;
    }
};

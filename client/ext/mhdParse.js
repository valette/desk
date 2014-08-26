/**
 * @author Sebastien Valette
 */
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
            ElementDataFile : text
        };

        var mhd = {};
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
        return mhd;
    }
};

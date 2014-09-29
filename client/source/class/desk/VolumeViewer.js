/**
 * A Standalone volume viewer. It it simply a desk.MPRContainer embeded in a window
*/
qx.Class.define("desk.VolumeViewer", 
{
	extend : desk.MPRContainer,
	include : desk.WindowMixin,

    construct : function(file, parameters, callback) {
        this.base(arguments, file, parameters, callback);
	}
});

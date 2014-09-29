/**
 * A Standalone mesh viewer. It it simply a desk.SceneContainer embeded in a window
*/
qx.Class.define("desk.MeshViewer", 
{
	extend : desk.SceneContainer,
	include : desk.WindowMixin,

	construct : function(file, parameters, callback, context) {
        this.base(arguments, file, parameters, callback);
	}
});

var exec = require('child_process').exec,
	libPath=require('path');

var vtkSurfacePath="/home/valette/git/vtkSurface/bin/";
var ctmConvPath="/home/valette/prog/openCTM/trunk/tools/";

var ctmConvCommand=ctmConvPath+"ctmconv";
var ctmVConvEnv={LD_LIBRARY_PATH : ctmConvPath};

exports.execute=function (parameters, callback) {
	var dataRoot=parameters.dataRoot;
	var inputMesh=dataRoot+parameters.input_mesh;
	var outputDirectory=dataRoot+parameters.output_directory;

	var execOptions={cwd :outputDirectory, env: ctmVConvEnv};
	var plyMesh="mesh.ply";

	switch (libPath.extname(inputMesh))
	{
	case ".vtk":
		exec(vtkSurfacePath+"vtk2ply "+inputMesh, execOptions, ctmConv);
		break;
	case ".stl":
		exec(vtkSurfacePath+"stl2ply "+inputMesh, execOptions, ctmConv);
		break;
	default:
		plyMesh=inputMesh;
		ctmConv(null);
	}

	function ctmConv(error) {
		exec(ctmConvCommand+" "+plyMesh+" mesh.ctm", execOptions, function (error) {
			callback(null, "OK ");
		});
	}
}

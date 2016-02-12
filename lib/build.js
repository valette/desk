var fs       = require('fs'),
	os       = require('os'),
	path     = require('path'),
	execSync = require('child_process').execSync;

require('shelljs/global');

var vtkVersion;

execSync("cmake .", {cwd : __dirname + "/cmake"})
	.toString('utf8')
	.split("\n")
	.forEach(function (line) {
		if (line.indexOf('VTKVERSION') > 0) {
			vtkVersion = parseInt(line.split(" ")[2]);
		}
	});

["ACVD", "OpenCTM"].forEach(function (lib) {
	try {
		var directory = path.join(__dirname, lib);

		rm('-rf', directory);

		var gitCLI = 'git clone https://github.com/valette/' + lib;

		if ((lib === 'ACVD') && (vtkVersion === 5)) {
			gitCLI += " -b vtk5";
		}

		execSync(gitCLI, {cwd : __dirname, stdio: 'inherit'});

		execSync('cmake . -DCMAKE_BUILD_TYPE=Release', 
			{cwd : directory, stdio: 'inherit'});

		execSync('make -j ' + os.cpus().length,
			{cwd : directory, stdio: 'inherit'});
	} catch (e) {
		console.log("Error : ");
		console.log(e);
	}
});

var actions = {
	"include" : [
		"../ACVD/bin/ACVD.json",
		"../OpenCTM/OpenCTM.json"
    ]
}

fs.writeFileSync(path.join(__dirname, 'includes', 'includes.json'), JSON.stringify(actions));

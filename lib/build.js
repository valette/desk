var argv     = require('yargs').argv,
	fs       = require('fs'),
	os       = require('os'),
	path     = require('path'),
	execSync = require('child_process').execSync;

require('shelljs/global');

["ACVD", "OpenCTM"].forEach(function (lib) {
	try {
		var directory = path.join(__dirname, lib);

		rm('-rf', directory);

		var gitCLI = 'git clone https://github.com/valette/' + lib;

		if ((lib === 'ACVD') && (argv.vtk6)) {
			gitCLI += " -b vtk6";
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


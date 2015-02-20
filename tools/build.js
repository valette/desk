var fs       = require('fs'),
	os       = require('os'),
	path     = require('path'),
	execSync = require('child_process').execSync;

require('shelljs/global');

var binPath = path.join(__dirname, '..', 'lib');

["ACVD", "OpenCTM"].forEach(function (lib) {
	var directory = path.join(binPath, lib);

	rm('-rf', directory);

	execSync('git clone https://github.com/valette/' + lib + '.git', 
		{cwd : binPath, stdio: 'inherit'});

	execSync('cmake . -DCMAKE_BUILD_TYPE=Release', 
		{cwd : directory, stdio: 'inherit'});

	execSync('make -j ' + os.cpus().length,
		{cwd : directory, stdio: 'inherit'});
});


var actions = {
	"include" : [
		"../ACVD/bin/ACVD.json",
		"../OpenCTM/OpenCTM.json"
    ]
}

fs.writeFileSync(path.join(binPath, 'includes', 'includes.json'), JSON.stringify(actions));


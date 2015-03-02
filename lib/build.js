var fs       = require('fs'),
	os       = require('os'),
	path     = require('path'),
	execSync = require('child_process').execSync;

require('shelljs/global');

["ACVD", "OpenCTM"].forEach(function (lib) {
	var directory = path.join(__dirname, lib);

	rm('-rf', directory);

	execSync('git clone https://github.com/valette/' + lib + '.git', 
		{cwd : __dirname, stdio: 'inherit'});

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

fs.writeFileSync(path.join(__dirname, 'includes', 'includes.json'), JSON.stringify(actions));


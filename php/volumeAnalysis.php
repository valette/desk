<?php
	$cache_path="visu_cache";
//	system("killall VolumeAnalysis");

	if (isset($GLOBALS["HTTP_RAW_POST_DATA"]))
	{
		// Get the data

		$file=mysql_real_escape_string($GLOBALS['HTTP_RAW_POST_DATA']);
		if (strpos ( $file , "..")==false)
		{
			$newdir="$file.analysis";
			$fileSHA= sha1 ( $newdir);
			$analysisdir="$cache_path/$fileSHA";

			$filemtime=filemtime ( "$file" );
			$analysismtime=filemtime ( "$analysisdir" );

			echo "$fileSHA\n";

			if ($filemtime>$analysismtime)
			{
				system("mkdir $analysisdir");
//				system("/home/visu/src/vtkSurfaceBuild/bin/VolumeAnalysis $file -o $analysisdir/ -s 1");
				system("/home/visu/src/vtkSurfaceBuild/bin/VolumeAnalysis $file -o $analysisdir/");
				system("touch $analysisdir");
			}
		}
	}
?>

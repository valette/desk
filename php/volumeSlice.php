<?php
	$cache_path="visu_cache";

	if (isset($GLOBALS["HTTP_RAW_POST_DATA"]))
	{
		// Get the data
//		system("rm -rf data/seeds.mhd.slices");
//		system("rm -rf data/image.mhd.slices");
//		system("rm -rf data/results/*.slices");

		$file=mysql_real_escape_string($GLOBALS['HTTP_RAW_POST_DATA']);
		if (strpos ( $file , "..")==false)
		{
			$newdir="$file.slices";
			$fileSHA= sha1 ( $newdir);
			$slicesdir="$cache_path/$fileSHA";

			$filemtime=filemtime ( "$file" );
			$slicesmtime=filemtime ( "$slicesdir" );

			echo "$fileSHA\n";

			if ($filemtime>$slicesmtime)
			{
				system("mkdir $slicesdir");
				system("/home/visu/src/vtkSurfaceBuild/bin/VolumeSlice $file -o $slicesdir/");
				system("/home/visu/src/vtkSurfaceBuild/bin/VolumeSlice $file -f 1 -o $slicesdir/");
				system("touch $slicesdir");
			}
		}
	}
?>

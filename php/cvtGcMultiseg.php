<?php
	if (isset($GLOBALS["HTTP_RAW_POST_DATA"]))
	{
		system("killall cvtgcmultiseg2");
		// Get the data
	    $sliceName = $GLOBALS['HTTP_RAW_POST_DATA'];
		// Send segmentation commands
		// system("/home/visu/src/gcBuild/cvtgcmultiseg2 $sliceName /home/visu/data/gc/seeds/seeds.xml /var/www/html/visu/colors3.xml -t image");
		system("/home/visu/src/gcBuild/cvtgcmultiseg2 /home/visu/data/gc/image.mhd /home/visu/data/gc/seeds/seeds.xml /var/www/html/visu/colors3.xml -cf /home/visu/data/gc/clustering/image-clustering-index.mhd -t image -o /home/visu/data/gc/results");
		system("/home/visu/src/vtkSurfaceBuild/bin/VolumeSlice /home/visu/data/gc/results/image-cvtgcmultiseg.mhd -o /home/visu/data/gc/results/png/ -mhdcolors");
		// $lastLine = system("/var/www/html/visu/segmente.sh", $returnVal);
		// echo "returnVal : " . $returnVal;
		// echo "   ";
		// echo "lastLine : " . $lastLine;
	}
?>
<?php
	if (isset($GLOBALS["HTTP_RAW_POST_DATA"]))
	{
		// Get the data
	    $sliceName = $GLOBALS['HTTP_RAW_POST_DATA'];
		
		// Erase image
		system("rm -f /var/www/html/visu/data/seeds/$sliceName");
	}
?>
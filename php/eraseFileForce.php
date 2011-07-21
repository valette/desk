<?php
	if (isset($GLOBALS["HTTP_RAW_POST_DATA"]))
	{
		// Get the data
	    $adress = mysql_real_escape_string($GLOBALS['HTTP_RAW_POST_DATA']);
		
		// Erase image
		system("rm -f data/$adress");
	}
?>

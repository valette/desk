<?php

	if (isset($GLOBALS["HTTP_RAW_POST_DATA"]))
	{
		// Get the data
	    $xmlData = $GLOBALS['HTTP_RAW_POST_DATA'];
	 
	    // Save file.  This example uses a hard coded filename for testing,
	    // but a real application can specify filename in POST variable
	    $fp = fopen( 'data/seeds/seedsXML.xml', 'wb' );
		fwrite( $fp, $xmlData);
	    fclose( $fp );
	}
	
	?>
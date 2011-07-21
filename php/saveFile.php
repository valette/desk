<?php

	/* if (isset($_POST))
	{
		echo '<br/>' . 'print_r($_POST)' . '<br/>';
		// echo '<br/>' . $_POST . '<br/>';
		// print $_POST;
		print_r($_POST);
		foreach($_POST as $cle => $element)
				print_r($element);
		foreach($_POST as $element)
				print_r($element);
		echo '<br/>';
				
		echo '<br/>' . 'print_r($GLOBALS)' . '<br/>';
		print_r($GLOBALS);
		echo '<br/>';
		
		echo '<br/>' . 'print_r($_SERVER)' . '<br/>';
		print_r($_SERVER);
		echo '<br/>';
	} */
	if (isset($GLOBALS["HTTP_RAW_POST_DATA"]))
	{
		// Get the data
	    $imageData = $GLOBALS['HTTP_RAW_POST_DATA'];
		
		// Get the name
		$sliceName = substr($imageData, 0, strpos($imageData, "!"));
		
	    // Remove the headers (data:,) part. 
	    // A real application should use them according to needs such as to check image type
	    $filteredData = substr($imageData, strpos($imageData, ",")+1);
	 
	    // Need to decode before saving since the data we received is already base64 encoded
	    $unencodedData = base64_decode($filteredData);
	 
	    // Save file.  This example uses a hard coded filename for testing,
	    // but a real application can specify filename in POST variable
	    $fp = fopen( $sliceName, 'wb' );
		fwrite( $fp, $unencodedData);
	    fclose( $fp );
	}
	
	?>

<?php
	$lastLine = system("/var/www/html/visu/sleep.sh", $returnVal);
	echo "lastLine : " . $lastLine;
?>

<?php
	echo "returnVal : " . $returnVal;
?>
<?php
$file=$_GET['fileName'];

$DATA_ROOT_FROM_PHP=realpath ( "data" );
$CACHE_ROOT_FROM_PHP=realpath ( "cache");
$ACTIONS_ROOT_FROM_PHP=realpath ( "actions");

$realFile=realpath ($file);

$begining=substr($realFile, 0, strlen($DATA_ROOT_FROM_PHP));
if ($begining!=$DATA_ROOT_FROM_PHP)
{
	$begining=substr($realFile, 0, strlen($CACHE_ROOT_FROM_PHP));
	if ($begining!=$CACHE_ROOT_FROM_PHP)
	{
		$begining=substr($realFile, 0, strlen($ACTIONS_ROOT_FROM_PHP));
		if ($begining!=$ACTIONS_ROOT_FROM_PHP)
		{
			die ("bad directory : $realFile\n".
			"begins with \"$begining\"\n".
			"must begin with \"$DATA_ROOT_FROM_PHP\"");
		}
	}
}

//set the value of the fields in Opened dailog box

header("Pragma: public");
header("Expires: 0");
header("Cache-Control: must-revalidate, post-check=0, pre-check=0"); 
header("Content-Type: application/force-download");
header("Content-Type: application/octet-stream");
header("Content-Type: application/download");

$pos=strrpos ( $file , "/");
if ($pos!=false)
	$file=substr($file, $pos+1);
header('Content-Disposition: attachment; filename="'. $file .'"');
header("Content-Transfer-Encoding: binary ");

// echo the content to the client browser
readfile($_GET['fileName']);
 
?>

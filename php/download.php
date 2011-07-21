<?php
$file=mysql_real_escape_string($_GET['fileName']);

if (substr_compare($file,"data/",0,5)!=0)
	die();

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

<?php
$dir=mysql_real_escape_string($_POST["dir"]);

// try to open the file
if (is_dir($dir)) {
	// try to open the directory
	if ($dh = opendir($dir)) {
		$count="0";
		while (($file = readdir($dh)) !== false) {
		//iterate on each file
			if (($file!=".")&&($file!=".."))
			{
				if ($count!="0")
					echo "\n";
				$count++;
				// print file name
				echo "$file ";

				$completefile="$dir/$file";

				// print file type
				if (is_dir ( $completefile))
					echo "dir";
				else 
					echo "file";

				// print file modification time
				$mtime=filemtime ( $completefile );
				echo " $mtime";

				// print file size
			 	$fileSize=filesize ( $completefile );
			 	echo " $fileSize";
			}
		}
		closedir($dh);
	}
}
?>

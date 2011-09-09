<?php

$DATA_ROOT_FROM_PHP="data/";
$CACHE_ROOT_FROM_PHP="cache/";
$ACTIONS_ROOT_FROM_PHP="actions/";
$DIR_TO_PHP="/var/www/html/visu/desk/php/";

$parametersFileName="action.par";

$flog = fopen("actions.log", 'a');
$logHeader=$_SERVER['REMOTE_ADDR']." ".date("D M j G:i:s");
$startTime=time();

$inputFilesLastMtime=0;

function readParameters($file) {
	$parameters=array();
	$content = file_get_contents($file);
	$parametersLines=explode("\n",$content);
	foreach ($parametersLines as $line)
	{
		$parameter=explode("=",$line);
		$parameters[''.$parameter[0]]=$parameter[1];
	}
	return ($parameters);
}

function validatePath($file) {
$DATA_ROOT_FROM_PHP="data";
$CACHE_ROOT_FROM_PHP="cache";
$ACTIONS_ROOT_FROM_PHP="action";

	if ($file!="cache/")
	{
		$fileMTime=filemtime($file);
		fwrite($GLOBALS["flog"], "$file : mtime=$fileMTime\n");

		if ($GLOBALS["inputFilesLastMtime"]<$fileMTime)
			$GLOBALS["inputFilesLastMtime"]=$fileMTime;
	}

	$begining=substr($file, 0, strlen($DATA_ROOT_FROM_PHP));
	if ($begining==$DATA_ROOT_FROM_PHP)
		return("data");
	else
	{
		$begining=substr($file, 0, strlen($CACHE_ROOT_FROM_PHP));
		if ($begining==$CACHE_ROOT_FROM_PHP)
			return("cache");
		else
		{
			$begining=substr($file, 0, strlen($ACTIONS_ROOT_FROM_PHP));
			if ($begining==$ACTIONS_ROOT_FROM_PHP)
				return("action");
			else
			{
				die ("bad directory : $file\n".
				"begins with \"$begining\"\n".
				"must begin with \"$DATA_ROOT_FROM_PHP\"");
			}
		}
	}

}

$parametersList=array();

$actions = simplexml_load_file("../actions.xml")
	or die("Fichier introuvable. L'analyse a ete suspendue");

$actionToPerform=mysql_real_escape_string($_POST["action"])
	or die ("no action asked!");

//echo "action : $actionToPerform\n";

foreach ($actions->children() as $action)
{
	if ($action->getName()=="action")
	{
		$currentActionName=$action["name"]
			or die ("no name given for one action in xml file");

		if ($actionToPerform==$currentActionName)
		{
			$parametersList["action"]="$actionToPerform";
			$command=$action["executable"]
				or die("no executable provided for action \"$actionToPerform\"");
			// action was found in xml file, let's parse the parameters
			foreach ($action->children() as $parameter)
			{
				if ($parameter->getName()=="parameter")
				{
					$parameterName=$parameter["name"];
//					echo $parameterName,"\n";
					$parameterType=$parameter["type"];

					$try=$_POST[''.$parameterName];
					if ($parameterType=="xmlcontent")
						$parameterValue=$try;
					else
						$parameterValue=mysql_real_escape_string($try);

					if (($parameter["required"]=="true") && ($parameterValue==null))
					{
						die ("parameter $parameterName is required for the server\n".
							$try);
					}

					if ($parameterValue!=null) 
					{
						$prependPHP_DIR=false;
						switch ($parameterType)
						{
							case "string":
								if (strpos($parameterValue," ")
									||strpos($parameterValue,"/")
									||strpos($parameterValue,";"))
									die ("$parameterName : string \"$parameterValue\" should contain no special characters!");
								break;
							case "xmlcontent":
								if (!simplexml_load_string($parameterValue))
									die ("xml content badly formated : \n".$parameterValue);
								break;
							case "file":
								validatePath($parameterValue);
								if (!is_file($parameterValue))
									die ("$parameterName : file \"$parameterValue\" does not exist");
								$prependPHP_DIR=true;
								break;
							case "directory":
								validatePath($parameterValue);
								if (!is_dir($parameterValue))
									die ("$parameterName : directory \"$parameterValue\" does not exist");
								$prependPHP_DIR=true;
								break;
							case "int":
								if (!ctype_digit("$parameterValue"))
									die ("$parameterName : value \"$parameterValue\" is not an integer value");
								$value=floatVal($parameterValue);
								$min=$parameter["min"];
								if ($min!="")
								{
									$min=floatVal($min);
									if ($min>$value)
										die ("$parameterName : value $parameterValue should be bigger than $min");
								}
								$max=$parameter["max"];
								if ($max!="")
								{
									$max=floatVal($max);
									if ($max<$value)
										die ("$parameterName : value $parameterValue should be smaller than $max");
								}
								break;
							case "float":
								if (!is_numeric($parameterValue))
									die ("$parameterName : value \"$parameterValue\" is not a number");
								$value=floatVal($parameterValue);
								$min=$parameter["min"];
								if ($min!="")
								{
									$min=floatVal($min);
									if ($min>$value)
										die ("$parameterName : value $parameterValue should be bigger than $min");
								}
								$max=$parameter["max"];
								if ($max!="")
								{
									$max=floatVal($max);
									if ($max<$value)
										die ("$parameterName : value $parameterValue should be smaller than $max");
								}
								break;
							default :
								die ("no handler for type $parameterType");
						}

						$parametersList[''.$parameterName] = "$parameterValue";

						$prefix=$parameter["prefix"];
						if ($prefix!="")
							$command.=" ".$prefix;
						else
							$command.=" ";

						if ($prependPHP_DIR)
							$parameterValue="$DIR_TO_PHP$parameterValue";

						$command.=$parameterValue;

						$suffix=$parameter["suffix"];
						if ($suffix!="")
							$command.=$suffix;
					}
				}
				else
				{
					if ($parameter->getName()=="anchor")
					{
						$command.=" ".$parameter["text"];
					}
				}
			}
			$cached=false;
			$voidAction=false;
			$newAction=false;

			if ($action["void"]=="true")
				$voidAction=true;
			else
			{
				$try=$_POST['output_directory'];
				if ($try)
				{
					// output directory is provided
					$outputDirectory=mysql_real_escape_string($try);
				}
				else
				{
					// read actions counter if it exists
					$actionsCountFile = $ACTIONS_ROOT_FROM_PHP."counter.txt";
					$actionId=0;
					if (is_file ( $actionsCountFile ))
					{
						$content = file_get_contents($actionsCountFile);
						$actionId=intval($content);
					}

					$failsafecounter=0;
					while (1)
					{
						$actionId++;
						// generate new output directory
				//		$outputDirectory="$ACTIONS_ROOT_FROM_PHP".str_pad((string) $actionId,8,"0",STR_PAD_LEFT);
						$outputDirectory="$ACTIONS_ROOT_FROM_PHP".$actionId;
						if (is_dir($outputDirectory))
						{
							echo ("Output directory $outputDirectory already exists. Check counter.txt");
						}
						else
						{
							mkdir ($outputDirectory);
							break;
						}
						$failsafecounter++;
						if ($failsafecounter==1000)
							die ("too many errors!");
					}
					// write actions counts to counter.txt
					$newAction=true;
					$fp = fopen($actionsCountFile, 'w');
					fwrite($fp,$actionId );
					fclose($fp);
					
				}
			}

			if ($voidAction==false)
			{
				switch (validatePath($outputDirectory))
				{
					case "cache":
						$outputDirectory="$CACHE_ROOT_FROM_PHP".sha1($command);
						if (!is_dir($outputDirectory))
						{
							system("mkdir $outputDirectory");
							$newAction=true;
						}
						break;
					default:
				}
				$parametersList["output_directory"]=$outputDirectory;
				echo "$outputDirectory\n";
				chdir ($outputDirectory);
				fwrite($flog, "$logHeader : cd $outputDirectory\n");

				$commandHash=sha1($command);
				if (($newAction==false)&&($_POST['force_update']!='true'))
				{
					$oldParameters=readParameters("$parametersFileName");
					$outputMtime=filemtime('.');
					if (($inputFilesLastMtime<= $outputMtime)&&
							($oldParameters['hash']==$commandHash))
					{
						$cached=true;
						fwrite($flog, "$logHeader : cached because input files were not modified\n");
						fwrite($flog, "$logHeader : directoryMtime : $outputMtime, inputFilesLastMtime : $inputFilesLastMtime\n");
					}
				}
				$parametersList['hash']=$commandHash;
			}
			fwrite($flog, "$logHeader : $command\n");

			echo "command : $command\n";

			if ($cached==false)
			{
				echo ("Output : \n");
				system("$command | tee action.log");
				$duration=time()-$startTime;
				if ($voidAction==false)
				{
					touch ('.');
					clearstatcache();
					$omtime=filemtime('.');
					fwrite($flog, "$logHeader : output directory mtime : $omtime\n");
					$fp = fopen($parametersFileName, 'w+') or die("Could not open $parametersFileName");
					$parametersList2=array();
					foreach ($parametersList as $parameter => $value)
						$parametersList2[]="$parameter=$value";

					fwrite($fp, implode("\n", $parametersList2));
					fclose($fp);
					echo "\n".$omtime;
				}
				echo "\nOK ($duration s.)";
			}
			else
			{
				echo ("Cached output : \n");
				readfile ("action.log");
				clearstatcache();
				$omtime=filemtime('.');
				echo "\n".$omtime;
				echo "\nCACHED";
			}
			fwrite($flog, "******************************************************\n");
			fclose($flog);		}
	}
}
?>


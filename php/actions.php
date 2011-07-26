<?php

$DATA_ROOT_FROM_PHP="data/";
$DIR_TO_PHP="/var/www/html/visu/desk/php/";


function myErrorHandler($errno, $errstr, $errfile, $errline) {
	die ("\n error while processing\n");
}
//set_error_handler("myErrorHandler");

function validatePath($file) {
	$begining=substr($file, 0, strlen($DATA_ROOT_FROM_PHP));
	if ($begining!=$DATA_ROOT_FROM_PHP)
		die ("bad directory : $file\n".
				"begins with \"$begining\"\n".
				"must begin with \"$DATA_ROOT_FROM_PHP\"");
}

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
			$command=$action["executable"]
				or die("no executable provided for action \"$actionToPerform\"");
			// action was found in xml file, let's parse the parameters

			// first add mandatory output directory parameter
			$outputPirectoryParameter = $action->addChild('parameter');
			$outputPirectoryParameter->addAttribute('name', "output_directory");
			$outputPirectoryParameter->addAttribute('type', "directory");
			$outputPirectoryParameter->addAttribute('required', "true");
			$outputDirectory="";

			foreach ($action->children() as $parameter)
			{
				if ($parameter->getName()=="parameter")
				{
					$parameterName=$parameter["name"];
//					echo $parameterName,"\n";
					$parameterType=$parameter["type"];
					if ($parameter["required"]=="true")
					{
						$try=$_POST[''.$parameterName];
						$parameterValue=mysql_real_escape_string($try)
							or die ("parameter $parameterName is required for the server\n".
							$try);
					}

					switch ($parameterType)
					{
						case "file":
							validatePath($parameterValue);
							if (!is_file($parameterValue))
								die ("$parameterName : file \"$parameterValue\" does not exist");
							$parameterValue="$DIR_TO_PHP$parameterValue";
							break;
						case "directory":
							validatePath($parameterValue);
							if (!is_dir($parameterValue))
								die ("$parameterName : directory \"$parameterValue\" does not exist");
							$parameterValue="$DIR_TO_PHP$parameterValue";
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
					$prefix=$parameter["prefix"];
					if ($prefix!="")
						$command.=" ".$prefix;

					if ($parameterName=="output_directory")
						$outputDirectory=$parameterValue;
					else
						$command.=" ".$parameterValue;
				}
				else
				{
					if ($parameter->getName()=="anchor")
					{
						$command.=" ".$parameter["text"];
					}
				}
			}

			echo "chdir :$outputDirectory\n";
			chdir ($outputDirectory);
			echo "command : $command\n";
			system("$command");
		}
	}
}
?>


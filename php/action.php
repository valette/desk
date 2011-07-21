<?php
$actions = simplexml_load_file("desk/actions.xml") or die("
Fichier introuvable. L'analyse a ete suspendue");

$tabulation="&nbsp;&nbsp;&nbsp;";

$actionToPerform=mysql_real_escape_string($_POST["action"]);
echo "action : $actionToPerform\n";
$nvertices=mysql_real_escape_string($_POST["number_of_desired_vertices"]);
echo "nvertices : $nvertices\n";
/*
foreach ($actions->children() as $action)
{
	foreach($action->attributes() as $a => $b)
	{
		if ($a=="name")
			echo "action : ",$b,"<br/>";
	}
	foreach ($action->children() as $parameter)
	{
		echo "$tabulation parameter: " . $parameter . "<br/>";
		foreach($parameter->attributes() as $a => $b)
		{
			echo "$tabulation $tabulation",$a,'=',$b,"<br>";
		}
	}
	echo "<br/>";
}
*/
?>


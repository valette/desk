
function trimAll(sString) 
{ 
	while (sString.substring(0,1) == ' ') 
	{ 
	sString = sString.substring(1, sString.length); 
	} 
	while (sString.substring(sString.length-1, sString.length) == ' ') 
	{ 
	sString = sString.substring(0,sString.length-1); 
	} 
return sString; 
}

function createDefaultMaterial(pack, viewInfo, color) {

var material=o3djs.material.createBasicMaterial(pack, viewInfo, color);
// change lighting parameters
//color = emissive + lightColor * (ambient * diffuse + diffuse * lighting + specular * lightingSpecular * specularFactor) 
//  lightPositionParam.value = [1000, 2000, 3000];
	material.getParam('emissive').value = [0.1, 0.1, 0.1 , 0.08];
	material.getParam('ambient').value = [0.1, 0.1, 0.1, 0.005];
	material.getParam('specular').value = [0.1, 0.1, 0.1, 0.01];
	material.getParam('shininess').value=0.02;
	material.getParam('specularFactor').value = 0.1;
	material.getParam('lightColor').value = [0.8, 0.8, 0.8, 0.5];
	return material;
}

function readXMLFile(xmlDoc,vertexInfo ,positionStream ){

	var readString = (new XMLSerializer()).serializeToString(xmlDoc);
// get points
	var piece=xmlDoc.getElementsByTagName("Piece")[0];
	var numberOfPoints=parseInt(piece.getAttribute("NumberOfPoints"));
	var numberOfPolys=parseInt(piece.getAttribute("NumberOfPolys"));
	var points=piece.getElementsByTagName("Points")[0];

	for (var i=0;i<points.childNodes.length;i++)
	{
		var child=points.childNodes[i];
		if ((child.tagName == "DataArray") && (child.getAttribute("Name")=="Points"))
		{
			var numberOfComponents=parseInt(child.getAttribute("NumberOfComponents"));
			var pointsData;
			// IE supports the text property
			if (window.ActiveXObject) {
				pointsData = child.text;
			}
			// Other browsers use textContent
			else {
				pointsData = child.textContent;
			}
			var reg=new RegExp("[ ,;]+", "g");
			var pointsDataArray=trimAll(pointsData).split(reg)

			var j=0;
			var index=0;
			var index2=0;
			var Coord=[0,0,0];
			for (j=0;j<pointsDataArray.length;j++)
			{
				var value=parseFloat(pointsDataArray[j]);
				if (!isNaN(value))
				{
					Coord[index2]=value;
					index++;
					index2++;
					if (index2==3)
					{
						index2=0;
						positionStream.addElement(Coord[0],Coord[1],Coord[2]);
					}
					
				}
			}
			var wantedSize=numberOfComponents*numberOfPoints;
			if (index!=wantedSize)
			  alert ("Error reading "+file+" : \n Number of read coordinates : "+index+
			  "\n Number of wanted coordinates : "+ wantedSize);
		}
	}

//get triangles
	var polys=piece.getElementsByTagName("Polys")[0];
	for (var i=0;i<polys.childNodes.length;i++)
	{
		var child=polys.childNodes[i];
		if ((child.tagName == "DataArray") && (child.getAttribute("Name")=="connectivity"))
		{
			var connectivityData
			// IE supports the text property
			if (window.ActiveXObject) {
				connectivityData = child.text
			}
			// Other browsers use textContent
			else {
				connectivityData = child.textContent;
			}

			var reg=new RegExp("[ ,;]+", "g");
			var connectivityDataArray=trimAll(connectivityData).split(reg)

			var index=0;
			var index2=0;
			var connect=[0,0,0];
			for (var j=0;j<connectivityDataArray.length;j++)
			{
				var value=parseInt(connectivityDataArray[j]);
				if (!isNaN(value))
				{
					connect[index2]=value;
					index++;
					index2++;
					if (index2==3)
					{
						index2=0;
						vertexInfo.addTriangle(connect[0],connect[1],connect[2]);						
					}
				}
			}
			var wantedSize=3*numberOfPolys;
			if (index!=wantedSize)
			  alert ("Error reading "+file+" : \n Number of read indices : "+index+
			  "\n Number of wanted connectivities : "+ wantedSize);
		}
	}
}

function readVTKFile(filestring,vertexInfo ,positionStream ){
	var reg2=new RegExp("[ \n]+", "gm");
	var data=filestring.split(reg2);
	
	// read point data
	var index=0;
	while (data[index]!="POINTS")
	{
		index++;
	}
	index++;
	var numberOfPoints=data[index];
	index++
	var coord=[0,0,0];
	var index2=0;
	while (1)
	{
		while (isNaN(parseFloat(data[index])))
			index++;
		coord[index2]=parseFloat(data[index]);
		index2++;
		index++;
		if (index2==3)
		{
			index2=0;
			positionStream.addElement(coord[0],coord[1],coord[2]);
			numberOfPoints--;
			if (numberOfPoints==0)
			{
				break;
			}
		}
	}
	while (data[index]!="POLYGONS")
	{
		index++;
	}
	index++
	var connectivity=[0,0,0,0];
	var numberOfPolygons=data[index];
	index++;
	index++;
	index2=0;
	while (1)
	{
		while (isNaN(parseInt(data[index])))
			index++;

		connectivity[index2]=parseInt(data[index]);
		index2++;
		index++;
		if (index2==connectivity[0]+1)
		{
			index2=0;
			vertexInfo.addTriangle(connectivity[1],connectivity[2],connectivity[3]);
			if (connectivity[0]==4)
				vertexInfo.addTriangle(connectivity[1],connectivity[3],connectivity[4]);
			numberOfPolygons--;
			if (numberOfPolygons==0)
			{
				break;
			}
		}
	}
}

function createFromFile(file,pack,color) {
//  state.getStateParam('o3d.CullMode') = o3djs.base.o3d.State.CULL_CCW; 

	var material=createDefaultMaterial(pack, g_viewInfo, color)

	var vertexInfo = o3djs.primitives.createVertexInfo();
	var positionStream = vertexInfo.addStream(
		3, o3djs.base.o3d.Stream.POSITION);
	var normalStream = vertexInfo.addStream(
		3, o3djs.base.o3d.Stream.NORMAL);

	if (window.XMLHttpRequest)
	{// code for IE7+, Firefox, Chrome, Opera, Safari
		var xmlhttp=new XMLHttpRequest();
	}
	else
	{// code for IE6, IE5
		var xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	xmlhttp.open("GET",file,false);
	xmlhttp.send();



	var filename=file.split(".");
	var extension=filename[filename.length-1].toLowerCase();

	switch (extension)
	{
		case "xml":
			var readString=xmlhttp.responseXML;
			readXMLFile(readString,vertexInfo ,positionStream );
			break;
		case "vtk":
			var readString=xmlhttp.responseText;
			readVTKFile(readString,vertexInfo ,positionStream );
			break;
		default:
		alert (extension+"file format not supported yet!");
	}

	var numberOfPoints=positionStream.numElements();
	var numberOfTriangles=vertexInfo.numTriangles();


// compute normals
	for (var i=0;i<numberOfPoints;i++)
		normalStream.addElement(0,0,0);

	for (var i=0;i<numberOfTriangles;i++)
	{
		var triangle=vertexInfo.getTriangle(i);
		var positions = [];
		for (var ii = 0; ii < 3; ++ii)
		{
			positions[ii] = positionStream.getElementVector(triangle[ii]);
		}

		var v0 = o3djs.math.subVector(positions[1],positions[0]);
		var v1 = o3djs.math.subVector(positions[2],positions[1]);
		var normal=o3djs.math.normalize(o3djs.math.cross(v0, v1));
//		var normal=o3djs.math.normalize(o3djs.math.cross(v1, v0));
		for (var iii=0;iii<3;iii++)
		{
			var normal2=normalStream.getElementVector(triangle[iii]);
			normalStream.setElementVector(triangle[iii],
				o3djs.math.addVector(normal,normal2));
		}
	}

	for (var i=0;i<numberOfPoints;i++)
	{
		var normal=normalStream.getElementVector(i);
		normalStream.setElementVector(i,o3djs.math.normalize(normal));
	}
	return vertexInfo.createShape(pack, material);
}

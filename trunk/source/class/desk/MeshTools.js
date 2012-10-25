/*
#ignore(THREE)
*/
qx.Class.define("desk.MeshTools", 
{
	extend : qx.core.Object,
	
	//~ construct : function(meshView, waitForMeshes, volViewer)
	construct : function(params)
	{
		
		// Enable logging in debug variant
		if(qx.core.Environment.get("qx.debug"))
		{
			// support native logging capabilities, e.g. Firebug for Firefox
			qx.log.appender.Native;
			// support additional cross-browser console. Press F7 to toggle visibility
			qx.log.appender.Console;
        }
		
		
		
		var meshView = params.meshView;
		var specMesh = params.specMesh;
		var volViewer = params.volViewer;
		var waitForMeshes = params.waitForMeshes;
		
		
		
		if(typeof volViewer == "object")
		{
			var mainView = true;
			var _this = this;
			volViewer.applyToViewers( function() {
					var sliceView = this;
					var markersObject = new desk.Markers( {sliceView:sliceView, meshView:meshView} );
					sliceView.getMarkersObject = function() {
						return markersObject;
					};
					function getOtherViews()
					{
						var OViewers = [];
						var viewers = volViewer.getViewers();
						var viewersNb = viewers.length;
						var viewer;
						for(var i=0; i<viewersNb; i++)
						{
							viewer = viewers[i];
							if(viewer!=sliceView)
								OViewers.push(viewer);
						}
						return OViewers;
					}
					markersObject.addListener("posMrkrAdded", function(event)
					{
						var sViews = getOtherViews();
						for(var i=0; i<sViews.length; i++)
						{
							sViews[i].getMarkersObject().setNewPosMarker(event.getData());
						}
					});
					markersObject.addListener("posMrkrSelected", function(event)
					{
						var sViews = getOtherViews();
						for(var i=0; i<sViews.length; i++)
						{
							sViews[i].getMarkersObject().selectPosMarker(event.getData());
						}
					});
					if(mainView)
					{
						_this.__markersObject = markersObject;
						mainView = false;
					}
				}
			);
			
			this.__volViewer = volViewer;
		}
		else
		{
			this.__markersObject = new desk.Markers( {meshView:meshView} );
		}
		
		
		
		var _this = this;
		function callExtAnalyser(inMesh)
		{
			if(_this.__extAnalyser==null)
			{
				_this.debug("new THREE.MeshAnalyser(meshes[key]) !");
				var extAnalyserOutput = new THREE.MeshAnalyser(inMesh);
				if(extAnalyserOutput.status==0)
				{
					_this.__extAnalyser = extAnalyserOutput.analyser;
					_this.debug("_this.__extAnalyser : " + _this.__extAnalyser);
					_this.__markExtremes( inMesh );
				}
				else
				{
					_this.debug("Error : " + extAnalyserOutput.status + " -> could not load mesh...");
					_this.__extAnalyser = null;
				}
			}
			else
			{
				_this.debug("_this.__extAnalyser.setMesh(meshes[key])");
				var extAnalyserOutput = _this.__extAnalyser.setMesh(meshes[key]);
				if(extAnalyserOutput.status!=0)
					_this.debug("Error : " + extAnalyserOutput.status + " -> could not load mesh...");
			}
		};
		function getMeshesFromViewer()
		{
			var meshesArray = meshView.getMeshes();
			var meshesArrayLength = meshesArray.length;
			var meshes = {};
			for(var i=0; i<meshesArrayLength; i++)
			{
				if(typeof meshesArray[i]=="object")
					meshes[i] = meshesArray[i];
			}
			_this.__meshes = meshes;
			
			if(typeof specMesh == "object")
			{
				callExtAnalyser( specMesh );
			}
			else
			{
				for(var key in meshes) // Scan the keys in meshes to call a MeshAnalyser setting it with the first mesh 
				{
					callExtAnalyser( meshes[key] );
					break; // exit after using first key i.e. the first mesh
				}
			}
			
		};
		
		if(waitForMeshes==true)
		{
			var updatesTimes = 4; // ...meshesLoaded is launched when ending the loading of every quarter package of the total of mehes to load...
								// ...if there is less than 4 meshes to load, updatesTimes should be the according number of meshes...
			meshView.addListener("meshesLoaded", function(event)
			{
				--updatesTimes;
				if(updatesTimes==0)
					getMeshesFromViewer();
			});
		}
		else
		{
			getMeshesFromViewer();
		}
		
		
		
		return this;
		
	},
	
	events :
	{
	},

	properties :
	{
	},

	members :
	{
		__meshes : null,
		__volViewer : null,
		__extAnalyser : null,
		__markersObject : null,
		
		__markExtremes : function(inMesh)
		{
			this.debug("----------------------> markExtremes() !");
			
			var extAnalyser = this.__extAnalyser;
			extAnalyser.setMesh(inMesh);
			
			var extremes = extAnalyser.findMeshExtremeVertices();
			var minMax = extremes.minMax;
			var vStruct = extremes.vStruct;
			var vertices = vStruct.array;
			var verticesNb = vStruct.numItems;
			var markersObject = this.__markersObject;
			
			var mmKey, nbMMs, i, mrkrId, absVolCoordsZmin, sphere;
			for(var key in minMax)
			{
				mmKey = minMax[key];
				nbMMs = mmKey.length;
				for(i=0; i<nbMMs; i++)
				{
					mrkrId = markersObject.getMrksNb();
					absVolCoordsZmin = {
											x : vertices[ mmKey[i] ],
											y : vertices[ mmKey[i]+1 ],
											z : vertices[ mmKey[i]+2 ]
										};
					
					if(markersObject.getMeshView()!=null)
						sphere = markersObject.setNewMeshMarker({id:mrkrId, coords:absVolCoordsZmin});
					
					//~ this.debug("sphere.position : " + sphere.position);
					//~ this.debug("sphere.position.x : " + sphere.position.x);
					//~ this.debug("sphere.position.y : " + sphere.position.y);
					//~ this.debug("sphere.position.z : " + sphere.position.z);
				}
			}
			
		}
		
	} //// END of   members :
	
}); //// END of   qx.Class.define("desk.MeshTools",

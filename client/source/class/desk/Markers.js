/*
#ignore(THREE)
*/
qx.Class.define("desk.Markers", 
{
	extend : qx.core.Object,
	
	construct : function(inParams)
	{
		
		// Enable logging in debug variant
		if(qx.core.Environment.get("qx.debug"))
		{
			// support native logging capabilities, e.g. Firebug for Firefox
			qx.log.appender.Native;
			// support additional cross-browser console. Press F7 to toggle visibility
			qx.log.appender.Console;
        }
        
		this.__mrkrsList = [];
		
		if(inParams.sliceView!=null)
		{
			this.__sliceView = inParams.sliceView;
			
			this.__createMarkMesh(this.__sliceView);
			this.addListener("changeMarkMode", function(event)
			{
				this.__markMesh.setVisible(event.getData());
			});
			
			this.__sliceView.addListener("viewMouseDown", function(event){ this.onMouseDown(event.getData()); }, this );
			this.__sliceView.addListener("viewMouseMove", function(event){ this.onMouseMove(event.getData()); }, this );
			this.__sliceView.addListener("viewMouseOut", function(event){ this.onMouseOut(event.getData()); }, this );
			this.__sliceView.addListener("changeSlice", function(event){ this.onChangeSlice(event); }, this );
			
		}
		
		if(inParams.meshView!=null)
			this.__meshView = inParams.meshView;
		
		
		return this;
	},
	
	events :
	{
		"posMrkrAdded" : "qx.event.type.Data",
		"posMrkrSelected" : "qx.event.type.Data"
	},

	properties :
	{
		markMode : { init : false, check: "Boolean", event : "changeMarkMode"},
		rndmL : { init : 1, check: "Number"},
		mrksNb : { init : 0, check: "Number"},
		mrksRndrDpth : { init : -1, check: "Number"}
	},

	members :
	{
		__sliceView : null,
		__meshView : null,
		
		__mrkrsList : null,
		__visibleMarkers : null,
		
		__mrks2DZ : 0.001,
		
		getMrksZ : function() {
			var z;
			if(this.__sliceView.getOrientation()==2)
				z = this.__mrks2DZ;
			else
				z = -this.__mrks2DZ;
			
			return z;
		},
		
		getMarkMesh : function() {
			return this.__markMesh;
		},
		
		getMeshView : function() {
			return this.__meshView;
		},
		
		getSliceView : function() {
			return this.__sliceView;
		},
		
		getMrkrsList : function() {
			return this.__mrkrsList;
		},
		
		__createMarkMesh : function(sliceView)
		{
			var scene = sliceView.getScene();
			var rndmL = this.getRndmL();
			var spacing = sliceView.getVolume2DSpacing();
			
			var x = 0;
			var y = 0;
			var xMin = -rndmL*spacing[0];
			var xMax =  rndmL*spacing[0];
			var yMin = -rndmL*spacing[1];
			var yMax =  rndmL*spacing[1];
			
			var markMat = new THREE.LineBasicMaterial({color: 0x41A0FF, lineWidth: 100, opacity:1.0, transparent:true});
			
			this.__markMesh = this.setCross(x, y, xMin, xMax, yMin, yMax, markMat, scene);
			this.__markMesh.setVisible(false);
		},
		
		onMouseDown : function(inEvent)
		{
			if(!inEvent.isRightPressed()&&!inEvent.isMiddlePressed()&&!inEvent.isShiftPressed())
			{
				if(this.isMarkMode())
				{
					var mrkrId = this.getMrksNb();
					var mrkrsList = this.getMrkrsList();
						/* This doesn't allow to use the same int coordinates for two different markers with different coordinates in the scene of the meshes
							var mrkrsNb = mrkrsList.length;
							var alreadyExists = false;
							var curMrkr;
							for(var i=0; i<mrkrsNb; i++)
							{
								curMrkr = mrkrsList[i];
								if(curMrkr.z==onSliceIntPos.z) // if on the given slice
									if((curMrkr.x==onSliceIntPos.x)&&(curMrkr.y==onSliceIntPos.y)) // if on the given 2D coordinates
										alreadyExists = true;
							}
							if(!alreadyExists)
						*/
					if(mrkrsList[mrkrId]==null)
					{
						var mrkrId = this.getMrksNb();
						var absVolCoords = this.getSliceView().get3DPosition(inEvent);
						this.setNewPosMarker( {id:mrkrId, coords:absVolCoords} );
						// Transmit marker id and on-volume absolute int coordinates of the new marker to the other views
						this.fireDataEvent("posMrkrAdded", {id:mrkrId, coords:absVolCoords});
						if(this.getMeshView()!=null)
							this.setNewMeshMarker({id:mrkrId, coords:absVolCoords});
					}
					else
					{
						this.debug("Do a marker is selected thing");
					}
				}
			}
		},
		
		onMouseMove : function(inEvent)
		{
			if(this.isMarkMode())
			{
				var markMesh = this.getMarkMesh();
				if(!inEvent.isRightPressed()&&!inEvent.isMiddlePressed()&&!inEvent.isShiftPressed())
				{
					var sliceView = this.getSliceView();
					var position = sliceView.getPositionOnSlice(inEvent);
					var onScenePos = this.getOnPixelCoordsFromInts(position.i, position.j);
					markMesh.setVisible(true);
					markMesh.setPosition(onScenePos.x, onScenePos.y, this.getMrksZ());
					this.getSliceView().render();
				}
				else
				{
					markMesh.setVisible(false);
				}
			}
		},
		
		onMouseOut : function(inEvent)
		{
			if(this.isMarkMode())
			{
				this.getMarkMesh().setVisible(false);
				this.getSliceView().render();
			}
		},
		
		onChangeSlice : function(inEvent)
		{
			var mrkrsList  = this.getMrkrsList();
			var mrkrsNb = mrkrsList.length;
			var slice = inEvent.getData();
			var i, marker;
			for(i=0; i<mrkrsNb; i++)
			{
				marker = mrkrsList[i];
				if(slice==marker.z)
				{
					marker.cross.setVisible(true);
				}
				else
				{
					marker.cross.setVisible(false);
				}
			}
		},
		
		getOnPixelCoordsFromInts : function(onSliceX, onSliceY)
		{
			var sliceView = this.getSliceView();
			
			//~ var v = [onSliceX, onSliceY];
			var v = [onSliceX, sliceView.getVolume2DDimensions()[1]-1 - onSliceY]; // needed to work with modifs in sliceView.js corresponding to update of THREE.js to version 51 
			var dimensions = sliceView.getVolume2DDimensions();
			for (var i=0; i<2; i++)
			{
				if (v[i]<0)
					v[i] = 0;
				else if (v[i]>dimensions[i]-1)
					v[i] = dimensions[i] - 1;
			};
			var spacing = sliceView.getVolume2DSpacing();
			var coordinates = sliceView.get2DCornersCoordinates();
			var x = coordinates[0]+(0.5+v[0])*spacing[0];
			var y = coordinates[1]-(0.5+v[1])*spacing[1];
			
			return {x:x, y:y};
		},
		
		setNewPosMarker : function(mrkrParams)
		{
			var sliceView = this.getSliceView();
			
			var mrkrId = mrkrParams.id;
			
			var absVolCoords = mrkrParams.coords;
			var onSliceIntPos = sliceView.projectOnSlice(absVolCoords.i, absVolCoords.j, absVolCoords.k);
				onSliceIntPos.z = sliceView.getSlice();
			var onScenePos = this.getOnPixelCoordsFromInts(onSliceIntPos.x, onSliceIntPos.y);
			
			var scene = sliceView.getScene();
			var rndmL = this.getRndmL();
			var spacing = sliceView.getVolume2DSpacing();
			
			var x = onScenePos.x;
			var y = onScenePos.y;
			var xMin = x - rndmL*spacing[0];
			var xMax = x + rndmL*spacing[0];
			var yMin = y - rndmL*spacing[1];
			var yMax = y + rndmL*spacing[1];
			
			var markMat = new THREE.LineBasicMaterial({color:0x41FF41, lineWidth:100, opacity:1.0, transparent:false});
			
			var newMarker = this.setCross(x, y, xMin, xMax, yMin, yMax, markMat, scene);
			
			sliceView.render();
			
			var mrkrsList = this.getMrkrsList();
			mrkrsList[mrkrId] = {cross:newMarker, x:onSliceIntPos.x, y:onSliceIntPos.y, z:onSliceIntPos.z};
			
			this.setMrksNb(mrkrId+1);
		},
		
		setCross : function(x, y, xMin, xMax, yMin, yMax, material, scene)
		{
			var z = this.getMrksZ();
			
			// Create the horizontal line
			var xGeometry=new THREE.Geometry();
				xGeometry.vertices.push( new THREE.Vector3(xMin, y, z) );
				xGeometry.vertices.push( new THREE.Vector3(xMax, y, z) );
			var xline = new THREE.Line(xGeometry, material);
				xline.renderDepth = this.getMrksRndrDpth();
			scene.add(xline);
			
			// Create the vertical line
			var yGeometry=new THREE.Geometry();
				yGeometry.vertices.push( new THREE.Vector3(x, yMin, z) );
				yGeometry.vertices.push( new THREE.Vector3(x, yMax, z) );
			var yline = new THREE.Line(yGeometry, material);
				yline.renderDepth = this.getMrksRndrDpth();
			scene.add(yline);
			
			var cross = {hl:xline, vl:yline};
			
			cross.setPosition = function(x, y, z)
			{
				xline.position.set(x, y, z);
				yline.position.set(x, y, z);
			};
			cross.setVisible = function(newVis)
			{
				xline.visible = newVis;
				yline.visible = newVis;
			};
			
			return cross;
		},
		
		setNewMeshMarker : function(mrkrParams)
		{
			var meshView = this.getMeshView();
			
			var mrkrId = mrkrParams.id;
			
			var spaceCoords = mrkrParams.coords;
			
			var scene = meshView.getScene();
			
			var pGeometry = new THREE.SphereGeometry(3, 18, 18);
			var pMaterial = new THREE.MeshLambertMaterial({color:0x41FF41, opacity:1.0, transparent:false});
			var sphere = new THREE.Mesh(pGeometry, pMaterial);
			//~ sphere.overdraw = true;
			sphere.translateX(spaceCoords.x);
			sphere.translateY(spaceCoords.y);
			sphere.translateZ(spaceCoords.z);
			
			scene.add(sphere);
		}
		
	} //// END of   members :
	
}); //// END of   qx.Class.define("desk.Markers",

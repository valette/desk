/*
#ignore(THREE)
*/
qx.Class.define("desk.Markers", 
{
	extend : qx.core.Object,
	
	construct : function(sliceView, master)
	{	
		
		// Enable logging in debug variant
		if(qx.core.Environment.get("qx.debug"))
		{
			// support native logging capabilities, e.g. Firebug for Firefox
			qx.log.appender.Native;
			// support additional cross-browser console. Press F7 to toggle visibility
			qx.log.appender.Console;
        }
        
		this.__createMarkMesh(sliceView);
		
		this.addListener("changeMarkMode", function(event)
		{
			this.__markMesh.setVisible(event.getData());
		});
		
		this.addListener("addPosMarker", function(event)
		{
			var struct = event.getData();
			var viewers = master.getViewers();
			var viewersNb = viewers.length;
			var curViewer;
			for(var i=0; i<viewersNb; i++)
			{
				curViewer = viewers[i];
				if(curViewer!=sliceView)
					curViewer.getMarkerObject().reproduceNewPosMarker(struct);
			}
		});
		
		sliceView.addListener("viewMouseDown", function(event){ this.__onMouseDown(event.getData()); }, this );
		sliceView.addListener("viewMouseMove", function(event){ this.__onMouseMove(event.getData()); }, this );
		sliceView.addListener("viewMouseOut", function(event){ this.__onMouseOut(event.getData()); }, this );
		sliceView.addListener("changeSlice", function(event){ this.__onChangeSlice(event); }, this );
		
		this.__mrkrsList = [];
		
		this.__master = master;
		
		this.__sliceView = sliceView;
		
		return this;
	},
	
	events :
	{
		"addPosMarker" : "qx.event.type.Data"
	},

	properties :
	{
		markMode : { init : false, check: "Boolean", event : "changeMarkMode"}
	},

	members :
	{
		__marksButton : null,
		__mrkrsList : null,
		__visibleMarkers :null,
		
		__rndmL : 1,
		__mrksNb : 0,
		__mrksZ : 0.001,
		__mrksRndrDpth : -1,
		
		__master : null,
		__sliceView : null,
		
		getMarkersList : function() {
			return this.__mrkrsList;
		},
		
		__createMarkMesh : function(sliceView)
		{
			var scene = sliceView.getScene();
			var rndmL = this.__rndmL;
			var spacing = sliceView.getVolume2DSpacing();
			
			var x = 0;
			var y = 0;
			var xMin = -rndmL*spacing[0];
			var xMax =  rndmL*spacing[0];
			var yMin = -rndmL*spacing[1];
			var yMax =  rndmL*spacing[1];
			
			var markMat = new THREE.LineBasicMaterial({color: 0x41A0FF, lineWidth: 100, opacity:1.0, transparent:false});
			
			this.__markMesh = this.__createCross(x, y, xMin, xMax, yMin, yMax, markMat, scene);
			this.__markMesh.setVisible(false);
		},
		
		__createNewPosMarker : function(mouseDownEvent, mrkrId)
		{
			
			var position = this.__getMarkPositionFromEvent(mouseDownEvent);
			var onScenePos = {x:position.x, y:position.y, z:this.__mrksZ};
			
			var onSlicePos = this.__getOnVolumeCoordinates(mouseDownEvent);
			
			var mrkrsList = this.__mrkrsList;
			var mrkrsNb = mrkrsList.length;
			var alreadyExists = false;
			var curMrkr;
			for(var i=0; i<mrkrsNb; i++)
			{
				curMrkr = mrkrsList[i];
				if(curMrkr.z==onSlicePos.z) // if on the given slice
					if((curMrkr.x==onSlicePos.x)&&(curMrkr.y==onSlicePos.y)) // if on the given 2D coordinates
						alreadyExists = true;
			}
			if(!alreadyExists)
			{
				this.__setNewPosMarker(onScenePos, onSlicePos, mrkrId);
				
				// Get coordinates on volume according the first orientation (x,y,z)
				var x, y ,z;
				switch(this.__sliceView.getOrientation())
				{
					case 0 :
						x = onSlicePos.x;
						y = onSlicePos.y;
						z = onSlicePos.z;
						break;
					case 1 :
						x = onSlicePos.z;
						y = onSlicePos.y;
						z = onSlicePos.x;
						break;
					case 2 :
						x = onSlicePos.x;
						y = onSlicePos.z;
						z = onSlicePos.y;
						break;
				}
				this.fireDataEvent("addPosMarker", {x:x, y:y, z:z, id:mrkrId});
			}
			else
			{
				this.debug("Do a marker is selected thing");
			}
		},
		
		reproduceNewPosMarker : function(eventData)
		{
			var mrkrId = eventData.id;
			if(this.__mrkrsList[mrkrId]==null)
			{
				var inX = eventData.x;
				var inY = eventData.y;
				var inZ = eventData.z;
				var x, y, z;
				switch(this.__sliceView.getOrientation())
				{
					case 0 :
						x = inX;
						y = inY;
						z = inZ;
						break;
					case 1 :
						x = inZ;
						y = inY;
						z = inX;
						break;
					case 2 :
						x = inX;
						y = inZ;
						z = inY;
						break;
				}
				var onScenePos = this.__returnOnScenePosition(x, y);
				
				var onSlicePos = {x:inX, y:inY, z:z};
				
				this.__setNewPosMarker(onScenePos, onSlicePos, mrkrId);
				
				this.__mrksNb++;
			}
		},
		
		__setNewPosMarker : function(onScenePos, onSlicePos, mrkrId)
		{
			var sliceView = this.__sliceView;
			var scene = sliceView.getScene();
			var rndmL = this.__rndmL;
			var spacing = sliceView.getVolume2DSpacing();
			
			var x = onScenePos.x;
			var y = onScenePos.y;
			var xMin = x - rndmL*spacing[0];
			var xMax = x + rndmL*spacing[0];
			var yMin = y - rndmL*spacing[1];
			var yMax = y + rndmL*spacing[1];
			
			var markMat = new THREE.LineBasicMaterial({color:0x41FF41, lineWidth:100, opacity:1.0, transparent:false});
			
			var newMarker = this.__createCross(x, y, xMin, xMax, yMin, yMax, markMat, scene);
			
			sliceView.render();
			
			this.__mrkrsList[mrkrId] = {cross:newMarker, x:onSlicePos.x, y:onSlicePos.y, z:onSlicePos.z};
		},
		
		__createCross : function(x, y, xMin, xMax, yMin, yMax, material, scene)
		{
			var z = this.__mrksZ;
			
			// Create the horizontal line
			var xGeometry=new THREE.Geometry();
				xGeometry.vertices.push( new THREE.Vector3(xMin, y, z) );
				xGeometry.vertices.push( new THREE.Vector3(xMax, y, z) );
			var xline = new THREE.Line(xGeometry, material);
				xline.renderDepth = this.__mrksRndrDpth;
			scene.add(xline);
			
			// Create the vertical line
			var yGeometry=new THREE.Geometry();
				yGeometry.vertices.push( new THREE.Vector3(x, yMin, z) );
				yGeometry.vertices.push( new THREE.Vector3(x, yMax, z) );
			var yline = new THREE.Line(yGeometry, material);
				yline.renderDepth = this.__mrksRndrDpth;
			scene.add(yline);
			
			var cross = {hl:xline, vl:yline};
			
			cross.setPosition = function(x, y, z)
			{
				cross.hl.position.set(x, y, z);
				cross.vl.position.set(x, y, z);
			};
			cross.setVisible = function(newVis)
			{
				cross.hl.visible = newVis;
				cross.vl.visible = newVis;
			};
			
			return cross;
		},
		
		__getMarkPositionFromEvent : function(inEvent)
		{
			var sliceView = this.__sliceView;
			var position = sliceView.getPositionOnSlice(inEvent);
			
			return this.__returnOnScenePosition(position.i, position.j);
		},
		
		__returnOnScenePosition : function(onSliceX, onSliceY)
		{
			var sliceView = this.__sliceView;
			
			var v = [onSliceX, onSliceY];
			var dimensions = sliceView.getVolume2DDimensions();
			for (var i=0; i<2; i++)
			{
				if (v[i]<0)
					v[i] = 0;
				else if (v[i]>dimensions[i]-1)
					v[i] = dimensions[i] - 1;
			};
			var x,y;
			switch(sliceView.getOrientation())
			{
				case 0 :
					x = v[0];
					y = v[1];
					break;
				case 1 :
					x = v[0];
					y = v[1];
					break;
				case 2 :
					x = v[0];
					y = v[1];
			}
			var spacing = sliceView.getVolume2DSpacing();
			var coordinates = sliceView.get2DCornersCoordinates();
			x = coordinates[0]+(0.5+x)*spacing[0];
			y = coordinates[1]-(0.5+y)*spacing[1];
			
			return {x:x, y:y};
		},
		
		__getOnVolumeCoordinates : function(mouseDownEvent)
		{
			var volCoor = {};
			var sliceView = this.__sliceView;
			var volDims = sliceView.getVolume2DDimensions();
			var onSlicePos = sliceView.getPositionOnSlice(mouseDownEvent);
			var i = onSlicePos.i;
			var j = onSlicePos.j;
			if((0<i)&&(i<volDims[0]-1))
				volCoor.x = i;
			if(i<0)
				volCoor.x = 0;
			if(volDims[0]-1<i)
				volCoor.x = volDims[0]-1;
			if((0<j)&&(j<volDims[1]-1))
				volCoor.y = j;
			if(j<0)
				volCoor.y = 0;
			if(volDims[1]-1<j)
				volCoor.y = volDims[1]-1;
			volCoor.z = sliceView.getSlice();
			
			return volCoor;
		},
		
		__onMouseDown : function(inEvent)
		{
			if(!inEvent.isRightPressed()&&!inEvent.isMiddlePressed()&&!inEvent.isShiftPressed())
				if(this.isMarkMode())
					this.__createNewPosMarker(inEvent, this.__mrksNb++);
		},
		
		__onMouseMove : function(inEvent)
		{
			if(this.isMarkMode())
			{
				var markMesh = this.__markMesh;
				if(!inEvent.isRightPressed()&&!inEvent.isMiddlePressed()&&!inEvent.isShiftPressed())
				{
					var position = this.__getMarkPositionFromEvent(inEvent);
					markMesh.setVisible(true);
					markMesh.setPosition(position.x, position.y, this.__mrksZ);
					this.__sliceView.render();
				}
				else
				{
					markMesh.setVisible(false);
				}
			}
		},
		
		__onMouseOut : function(inEvent)
		{
			if(this.isMarkMode())
			{
				this.__markMesh.setVisible(false);
				this.__sliceView.render();
			}
		},
		
		__onChangeSlice : function(inEvent)
		{
			var mrkrsList  = this.__mrkrsList;
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
		}
	}
	
}); //// END of   qx.Class.define("desk.Markers",

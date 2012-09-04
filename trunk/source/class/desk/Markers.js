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
		
		this.__posMarkers = [];
		
		sliceView.addListener("viewMouseDown", function(event){ this.__onMouseDown(event.getData()); }, this );
		sliceView.addListener("viewMouseMove", function(event){ this.__onMouseMove(event.getData()); }, this );
		sliceView.addListener("viewMouseOut", function(event){ this.__onMouseOut(event.getData()); }, this );
		sliceView.addListener("changeSlice", function(event){ this.__onChangeSlice(event); }, this );
		
		//~ this.addListener("addPosMarker", function(event)
		//~ {
			//~ var struct = event.getData();
			//~ this.debug("struct.x : " + struct.x);
			//~ this.debug("struct.y : " + struct.y);
			//~ this.debug("struct.z : " + struct.z);
		//~ });
		
		this.__master = master;
		this.__sliceView = sliceView;
		
		return this;
	},
	
	events :
	{
		"addPosMarker" : "qx.event.type.Event",
	},

	properties :
	{
		markMode : { init : false, check: "Boolean", event : "changeMarkMode"}
	},

	members :
	{
		__marksButton : null,
		__posMarkers : null,
		__visibleMarkers :null,
		
		__rndmL : 1,
		__mrksNb : -1,
		__mrksZ : 0.01,
		
		__master : null,
		__sliceView : null,
		
		__createMarkMesh : function(sliceView)
		{
			var scene = sliceView.getScene();
			
			var markMat = new THREE.LineBasicMaterial({color: 0x41A0FF, lineWidth: 100, opacity:1.0, transparent:false});
			var rndmL = this.__rndmL;
			var mrksZ = this.__mrksZ;
			var spacing = sliceView.getVolume2DSpacing();
			// Create the horizontal line
			var xGeometry = new THREE.Geometry();
				xGeometry.vertices.push( new THREE.Vector3(-rndmL*spacing[0], 0, mrksZ) );
				xGeometry.vertices.push( new THREE.Vector3(+rndmL*spacing[0], 0, mrksZ) );
			var xline = new THREE.Line(xGeometry, markMat);
				xline.visible = false;
			scene.add(xline);
			// Create the vertical line
			var yGeometry = new THREE.Geometry();
				yGeometry.vertices.push( new THREE.Vector3(0, -rndmL*spacing[1], mrksZ) );
				yGeometry.vertices.push( new THREE.Vector3(0, +rndmL*spacing[1], mrksZ) );
			var yline = new THREE.Line(yGeometry, markMat);
				yline.visible = false;
			scene.add(yline);
			
			this.__markMesh = {hl:xline, vl:yline};
		},
		
		__createNewPosMarker : function(inEvent, inId)
		{
			var sliceView = this.__sliceView;
			var scene = sliceView.getScene();
			
			var markMat = new THREE.LineBasicMaterial({color: 0x41FF41, lineWidth: 100, opacity:1.0, transparent:false});
			var position = this.__setMarkPositionFromEvent(inEvent);
			var x = position.x;
			var y = position.y;
			var z = this.__mrksZ;
			var rndmL = this.__rndmL;
			var spacing = sliceView.getVolume2DSpacing();
			// Create the horizontal line
			var xGeometry=new THREE.Geometry();
				xGeometry.vertices.push( new THREE.Vector3(x - rndmL*spacing[0], y, z) );
				xGeometry.vertices.push( new THREE.Vector3(x + rndmL*spacing[0], y, z) );
			var xline = new THREE.Line(xGeometry, markMat);
			scene.add(xline);
			// Create the vertical line
			var yGeometry=new THREE.Geometry();
				yGeometry.vertices.push( new THREE.Vector3(x, y - rndmL*spacing[1], z) );
				yGeometry.vertices.push( new THREE.Vector3(x, y + rndmL*spacing[1], z) );
			var yline = new THREE.Line(yGeometry, markMat);
			scene.add(yline);
			// Create the line orthogonal to the slice plane
			var zGeometry=new THREE.Geometry();
				zGeometry.vertices.push( new THREE.Vector3(x, y, z - rndmL) );
				zGeometry.vertices.push( new THREE.Vector3(x, y, z + rndmL) );
			var zline = new THREE.Line(zGeometry, markMat);
				zline.visible = false;
			scene.add(zline);
			
			sliceView.render();
			
			var onVolPos = this.__getOnVolumeCoordinates(inEvent, sliceView);
			if(this.__posMarkers[onVolPos.z]==null)
				this.__posMarkers[onVolPos.z] = [];
			this.__posMarkers[onVolPos.z].push({xL:xline, yL:yline, zL:zline, id:inId, x:onVolPos.x, y:onVolPos.y, z:onVolPos.z});
			
			this.fireDataEvent("addPosMarker", {x:onVolPos.x, y:onVolPos.y, z:onVolPos.z});
		},
		
		__setMarkPositionFromEvent : function(inEvent)
		{
			var sliceView = this.__sliceView;
			var position = sliceView.getPositionOnSlice(inEvent);
			
			var v=[position.i, position.j];
			var dimensions = sliceView.getVolume2DDimensions();

			for (var i=0; i<2; i++)
			{
				if (v[i]<0)
					v[i] = 0;
				else if (v[i]>dimensions[i]-1)
					v[i] = dimensions[i] - 1;
			};
			var i,j,k;
			switch (sliceView.getOrientation())
			{
			case 0 :
				i = v[0];
				j = v[1];
				k = sliceView.getSlice();
				break;
			case 1 :
				i = sliceView.getSlice();
				j = v[1];
				k = v[0];
				break;
			case 2 :
				i = v[0];
				j = sliceView.getSlice();
				k = v[1];
				break;
			}
			
			return this.__returnMarkPosition(i, j, k);
		},

		__returnMarkPosition : function(i, j, k)
		{
			var slice,x,y;

			switch (this.__sliceView.getOrientation())
			{
			case 0 :
				x=i;
				y=j;
				slice=k;
				break;
			case 1 :
				x=k;
				y=j;
				slice=i;
				break;
			case 2 :
				x=i;
				y=k;
				slice=j;
			}

			var spacing = this.__sliceView.getVolume2DSpacing();
			var coordinates = this.__sliceView.get2DCornersCoordinates();
			x=coordinates[0]+(0.5+x)*spacing[0];
			y=coordinates[1]-(0.5+y)*spacing[1];
			
			return {x:x, y:y};
		},
		
		__getOnVolumeCoordinates : function(inEvent, sliceView)
		{
			var volCoor = {};
			var volDims = sliceView.getVolume2DDimensions();
			var onSlicePos = sliceView.getPositionOnSlice(inEvent);
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
					var position = this.__setMarkPositionFromEvent(inEvent);
					markMesh.hl.visible = true;
					markMesh.vl.visible = true;
					var rndmL = this.__rndmL;
					var mrksZ = this.__mrksZ;
					markMesh.hl.position.set(position.x, position.y, mrksZ);
					markMesh.vl.position.set(position.x, position.y, mrksZ);
					this.__sliceView.render();
				}
				else
				{
					markMesh.hl.visible = false;
					markMesh.vl.visible = false;
				}
			}
		},
		
		__onMouseOut : function(inEvent)
		{
			if(this.isMarkMode())
			{
				this.__markMesh.hl.visible = false;
				this.__markMesh.vl.visible = false;
				this.__sliceView.render();
			}
		},
		
		__onChangeSlice : function(inEvent)
		{
			var mrkrsLayers = this.__posMarkers;
			var mrkrsLayersNb = mrkrsLayers.length;
			var lyrMarkers, lyrMarkersNb, marker, newVis;
			var slice = inEvent.getData();
			var i,j;
			for(i=0; i<mrkrsLayersNb; i++)
				if(mrkrsLayers[i]!=null)
				{
					if(slice==i)
						newVis = true;
					else
						newVis = false;
					lyrMarkers = mrkrsLayers[i];
					lyrMarkersNb = lyrMarkers.length;
					for(j=0; j<lyrMarkersNb; j++)
					{
						marker = lyrMarkers[j];
						marker.xL.visible = newVis;
						marker.yL.visible = newVis;
					}
				}
		}
	}
	
}); //// END of   qx.Class.define("desk.Markers",

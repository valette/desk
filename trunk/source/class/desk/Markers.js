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
		
		this.__mrkrsList = [];
		
		sliceView.addListener("viewMouseDown", function(event){ this.__onMouseDown(event.getData()); }, this );
		sliceView.addListener("viewMouseMove", function(event){ this.__onMouseMove(event.getData()); }, this );
		sliceView.addListener("viewMouseOut", function(event){ this.__onMouseOut(event.getData()); }, this );
		sliceView.addListener("changeSlice", function(event){ this.__onChangeSlice(event); }, this );
		
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
		__mrksZ : 0.01,
		__mrksRndrDpth : 0,
		
		__master : null,
		__sliceView : null,
		
		getMarkersList : function() {
			return this.__mrkrsList;
		},
		
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
		
		__createNewPosMarker : function(mouseDownEvent, mrkrId)
		{
			
////////////////		VERIFY IF MARKER EXISTS !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
			
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
				if((curMrkr.x==onSlicePos.x)&&(curMrkr.y==onSlicePos.y)&&(curMrkr.z==onSlicePos.z))
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
			
			var markMat = new THREE.LineBasicMaterial({color:0x41FF41, lineWidth:100, opacity:1.0, transparent:false});
			
			var x = onScenePos.x;
			var y = onScenePos.y;
			var z = this.__mrksZ;
			var xMin = x - rndmL*spacing[0];
			var xMax = x + rndmL*spacing[0];
			var yMin = y - rndmL*spacing[1];
			var yMax = y + rndmL*spacing[1];
			
			// Create the horizontal line
			var xGeometry=new THREE.Geometry();
				xGeometry.vertices.push( new THREE.Vector3(xMin, y, z) );
				xGeometry.vertices.push( new THREE.Vector3(xMax, y, z) );
			var xline = new THREE.Line(xGeometry, markMat);
				xline.renderDepth = this.__mrksRndrDpth;
			scene.add(xline);
			
			// Create the vertical line
			var yGeometry=new THREE.Geometry();
				yGeometry.vertices.push( new THREE.Vector3(x, yMin, z) );
				yGeometry.vertices.push( new THREE.Vector3(x, yMax, z) );
			var yline = new THREE.Line(yGeometry, markMat);
				yline.renderDepth = this.__mrksRndrDpth;
			scene.add(yline);
			
			sliceView.render();
			
			this.__mrkrsList[mrkrId] = {xL:xline, yL:yline, x:onSlicePos.x, y:onSlicePos.y, z:onSlicePos.z};
			//~ this.__mrkrsList[mrkrId] = {xL:xline, yL:yline, mB:mrkrBoxMesh, x:onSlicePos.x, y:onSlicePos.y, z:onSlicePos.z};
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
			var mrkrsList  = this.__mrkrsList;
			var mrkrsNb = mrkrsList.length;
			var slice = inEvent.getData();
			var i, marker;
			for(i=0; i<mrkrsNb; i++)
			{
				marker = mrkrsList[i];
				if(slice==marker.z)
				{
					marker.xL.visible = true;
					marker.yL.visible = true;
				}
				else
				{
					marker.xL.visible = false;
					marker.yL.visible = false;
				}
			}
		}
	}
	
}); //// END of   qx.Class.define("desk.Markers",

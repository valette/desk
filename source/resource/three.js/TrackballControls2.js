/**
 * @author Eberhard Graether / http://egraether.com/
 */

HACKSetDirtyVertices = function (geometry) {
geometry.__dirtyVertices = true;
}

THREE.TrackballControls2 = function ( object ) {

	var _this = this,
	STATE = { NONE : -1, ROTATE : 0, ZOOM : 1, PAN : 2 , ROTATE_Z : 3};

	this.object = object;
//	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API

	this.enabled = true;

	this.setSize= function(width, height)
	{
		this.screen = { width: width, height: height, offsetLeft: 0, offsetTop: 0 };
		this.radius = ( this.screen.width + this.screen.height ) / 4;
	}

	this.setSize();

	this.rotateSpeed = 3;
	this.zoomSpeed = 5;
	this.panSpeed = 1.2;

	this.noRotate = false;
	this.noZoom = false;
	this.noPan = false;

//	this.staticMoving = false;
//	this.dynamicDampingFactor = 0.2;

	this.minDistance = 0;
	this.maxDistance = Infinity;

	this.keys = [ 65 /*A*/, 83 /*S*/, 68 /*D*/ ];

	this._onUpdate=null;

	// internals

	this.target = new THREE.Vector3( 0, 0, 0 );

	var _keyPressed = false,
	_state = STATE.NONE,

	_eye = new THREE.Vector3(),

	_zoomStart = new THREE.Vector2(),
	_zoomEnd = new THREE.Vector2(),

	_panStart = new THREE.Vector2(),
	_panEnd = new THREE.Vector2();

	_dx=0;
	_dy=0;
	_xinit=0;
	_yinit=0;
	_alpha=0;

	// methods

	this.getInternals = function ()
	{
		return [ _zoomStart, _zoomEnd, _panStart, _panEnd, _eye];
	}

	this.copy = function (source) {

		var internals=source.getInternals();
		_zoomStart.copy(internals[0]);
		_zoomEnd.copy(internals[1]);
		_panStart.copy(internals[2]);
		_panEnd.copy(internals[3]);

		_eye.copy(internals[4]);	
		_this.object.up.copy(source.object.up);
		_this.object.position.copy(source.object.position);
		_this.target.copy(source.target);

	};

	this.handleEvent = function ( event ) {

		if ( typeof this[ event.type ] == 'function' ) {

			this[ event.type ]( event );

		}

	};

	this.getMouseOnScreen = function( x, y ) {

		return new THREE.Vector2(
			x / _this.radius * 0.5,
			y / _this.radius * 0.5
		);

	};

	this.rotateCamera = function() {

		var axis = new THREE.Vector3(),
			quaternion = new THREE.Quaternion(),
			angle;

		if ( _dy != 0 ) {
			angle = _this.rotateSpeed * _dy / _this.radius;

			axis.cross( _eye, _this.object.up ).normalize();
			quaternion.setFromAxisAngle( axis, angle );

			quaternion.multiplyVector3( _eye );
			quaternion.multiplyVector3( _this.object.up );
		}

		if ( _dx != 0 ) {
			angle = -_this.rotateSpeed * _dx / _this.radius;
			axis.copy( _this.object.up ).normalize();
			quaternion.setFromAxisAngle( axis , angle );

			quaternion.multiplyVector3( _eye );
			quaternion.multiplyVector3( _this.object.up );
		}

		if ( _alpha != 0 ) {
			axis.copy( _eye ).normalize();
			quaternion.setFromAxisAngle( axis , _alpha );

	//		quaternion.multiplyVector3( _eye );
			quaternion.multiplyVector3( _this.object.up );
		}

	};

	this.zoomCamera = function() {

		var factor = 1.0 + ( _zoomEnd.y - _zoomStart.y ) * _this.zoomSpeed;

		if ( factor !== 1.0 && factor > 0.0 ) {

			_eye.multiplyScalar( factor );

//			if ( _this.staticMoving ) {

				_zoomStart = _zoomEnd;
/*
			} else {

				_zoomStart.y += ( _zoomEnd.y - _zoomStart.y ) * this.dynamicDampingFactor;

			}*/

		}

	};

	this.panCamera = function() {

		var mouseChange = _panEnd.clone().subSelf( _panStart );

		if ( mouseChange.lengthSq() ) {

			mouseChange.multiplyScalar( _eye.length() * _this.panSpeed );

			var pan = _eye.clone().crossSelf( _this.object.up ).setLength( mouseChange.x );
			pan.addSelf( _this.object.up.clone().setLength( mouseChange.y ) );

			_this.object.position.addSelf( pan );
			_this.target.addSelf( pan );

//			if ( _this.staticMoving ) {

				_panStart = _panEnd;

	/*		} else {

				_panStart.addSelf( mouseChange.sub( _panEnd, _panStart ).multiplyScalar( _this.dynamicDampingFactor ) );

			}*/

		}

	};

	this.checkDistances = function() {

		if ( !_this.noZoom || !_this.noPan ) {

			if ( _this.object.position.lengthSq() > _this.maxDistance * _this.maxDistance ) {

				_this.object.position.setLength( _this.maxDistance );

			}

			if ( _eye.lengthSq() < _this.minDistance * _this.minDistance ) {

				_this.object.position.add( _this.target, _eye.setLength( _this.minDistance ) );

			}

		}

	};

	this.update = function() {

		_eye.copy( _this.object.position ).subSelf( this.target );

		if ( !_this.noRotate ) {

			_this.rotateCamera();

		}
		
		if ( !_this.noZoom ) {

			_this.zoomCamera();

		}

		if ( !_this.noPan ) {

			_this.panCamera();

		}

		_this.object.position.add( _this.target, _eye );

		_this.checkDistances();

		_this.object.lookAt( _this.target );

		_dx=0;
		_dy=0;
		_alpha=0;

	};


	// listeners

	function keydown( event ) {

		if ( ! _this.enabled ) return;

		if ( _state !== STATE.NONE ) {

			return;

		} else if ( event.keyCode === _this.keys[ STATE.ROTATE ] && !_this.noRotate ) {

			_state = STATE.ROTATE;

		} else if ( event.keyCode === _this.keys[ STATE.ZOOM ] && !_this.noZoom ) {

			_state = STATE.ZOOM;

		} else if ( event.keyCode === _this.keys[ STATE.PAN ] && !_this.noPan ) {

			_state = STATE.PAN;

		}

		if ( _state !== STATE.NONE ) {

			_keyPressed = true;

		}

	};

	function keyup( event ) {

		if ( ! _this.enabled ) return;

		if ( _state !== STATE.NONE ) {

			_state = STATE.NONE;

		}

	};

	this.mouseDown= function ( button, x ,y ) {

		if ( ! _this.enabled ) return;

		if ( _state === STATE.NONE ) {

			_state = button;

			if ( _state === STATE.ROTATE && !_this.noRotate ) {

			//	_rotateStart = _rotateEnd = _this.getMouseProjectionOnBall( x, y );

			} else if ( _state === STATE.ZOOM && !_this.noZoom ) {

				_zoomStart = _zoomEnd = _this.getMouseOnScreen( x, y );

			} else if ( !this.noPan ) {

				_panStart = _panEnd = _this.getMouseOnScreen( x, y );

			}
			_xinit=x;
			_yinit=y;
		}

	};

	this.mouseMove =function ( x, y ) {

		if ( ! _this.enabled ) return;

		if ( _keyPressed ) {

			_zoomStart = _zoomEnd = _this.getMouseOnScreen( x, y );
			_panStart = _panEnd = _this.getMouseOnScreen( x, y );

			_keyPressed = false;

		}

		_dx=0;
		_dy=0;
		_alpha=0;

		if ( _state === STATE.NONE ) {

			return;

		} else if ( _state === STATE.ROTATE && !_this.noRotate ) {

			_dx=x-_xinit;
			_dy=y-_yinit;

		} else if ( _state === STATE.ZOOM && !_this.noZoom ) {

			_zoomEnd = _this.getMouseOnScreen( x, y );

		} else if ( _state === STATE.PAN && !_this.noPan ) {

			_panEnd = _this.getMouseOnScreen( x, y );

		} else if ( _state === STATE.ROTATE_Z ) {

			var p1 = new THREE.Vector2( x - 0.5 * this.screen.width,
								y - 0.5 * this.screen.height);
			var p2 = new THREE.Vector2( _xinit - 0.5 * this.screen.width,
								_yinit - 0.5 * this.screen.height);

			var n1 = p1.length();
			var n2 = p2.length();
			var n12 = n1 * n2;

			if ( n12 > 0 )
			{
				var cosAlpha = p1.dot( p2 ) / n12;
				var sinAlpha = p2.y * p1.x - p2.x * p1.y;

				if ( cosAlpha > 1 )
				{
					_alpha = 0;
				}
				else
				{
					_alpha = Math.acos( cosAlpha );
				}
				if ( sinAlpha > 0 )
					_alpha = -_alpha;
			}
		}

		_xinit = x;
		_yinit = y;

		if ( _this.onUpdate != null )
			_this.onUpdate();
	};

	this.mouseUp = function( ) {
		_state = STATE.NONE;
	};
};

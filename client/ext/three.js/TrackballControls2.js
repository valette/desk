/**
 * @author Eberhard Graether / http://egraether.com/
 * @author Sebastien Valette
 */

THREE.TrackballControls2 = function ( object ) {

	STATE = { NONE : -1, ROTATE : 0, ZOOM : 1, PAN : 2 , ROTATE_Z : 3};

	this.object = object;

	this.enabled = true;

	this.setSize = function(width, height) {
		this.width = width;
		this.height = height;
		this.radius = width height;
	}

	this.setSize();

	this.rotateSpeed = 15;
	this.zoomSpeed = 5;
	this.panSpeed = 2.2;

	this.noRotate = false;
	this.noZoom = false;
	this.noPan = false;

	this.minDistance = 0;
	this.maxDistance = Infinity;

	// internals

	this.target = new THREE.Vector3( 0, 0, 0 );

	var _keyPressed = false,
		_state = STATE.NONE,

		_eye = new THREE.Vector3(),

		_zoomStart = 0,
		_zoomEnd = 0,

		_panStart = new THREE.Vector2(),
		_panEnd = new THREE.Vector2();

	this._dx = 0;
	this._dy = 0;
	this._xinit = 0;
	this._yinit = 0;
	this._alpha = 0;

	// methods

	this.getState = function () {
		return [ _zoomStart, _zoomEnd, _panStart, _panEnd, _eye, 
			this.object.up, this.object.position, this.target];
	};

	this.setState = function (state) {
		_zoomStart = state[0];
		_zoomEnd = state[1];
		_panStart.copy(state[2]);
		_panEnd.copy(state[3]);

		_eye.copy(state[4]);	
		this.object.up.copy(state[5]);
		this.object.position.copy(state[6]);
		this.target.copy(state[7]);
		this.update();
	};


	this.copy = function (source) {
		this.setState(source.getState());
	};

	this.getMouseOnScreen = function( x, y ) {

		return new THREE.Vector2(
			x / this.radius,
			y / this.radius
		);

	};

	var axis = new THREE.Vector3(),
		quaternion = new THREE.Quaternion();

	this.rotateCamera = function() {
		var angle;

		if ( this._dy != 0 ) {
			angle = this.rotateSpeed * this._dy / this.radius;

			axis.crossVectors( _eye, this.object.up ).normalize();
			quaternion.setFromAxisAngle( axis, angle );

			_eye.applyQuaternion(quaternion);
			this.object.up.applyQuaternion(quaternion);
		}

		if ( this._dx != 0 ) {
			angle = - this.rotateSpeed * this._dx / this.radius;
			axis.copy( this.object.up ).normalize();
			quaternion.setFromAxisAngle( axis , angle );

			_eye.applyQuaternion(quaternion);
			this.object.up.applyQuaternion(quaternion);
		}

		if ( this._alpha != 0 ) {
			axis.copy( _eye ).normalize();
			quaternion.setFromAxisAngle( axis , this._alpha );

			this.object.up.applyQuaternion(quaternion);
		}

	};

	this.zoomCamera = function() {

		var factor = 1.0 + ( _zoomEnd - _zoomStart ) * this.zoomSpeed;

		if ( factor !== 1.0 && factor > 0.0 ) {

			_eye.multiplyScalar( factor );

				_zoomStart = _zoomEnd;

		}

	};

	this.panCamera = function() {

		var mouseChange = _panEnd.clone().sub( _panStart );

		if ( mouseChange.lengthSq() ) {

			mouseChange.multiplyScalar( _eye.length() * this.panSpeed );

			var pan = _eye.clone().cross( this.object.up ).setLength( mouseChange.x );
			pan.add( this.object.up.clone().setLength( mouseChange.y ) );

			this.object.position.add( pan );
			this.target.add( pan );

			_panStart = _panEnd;

		}

	};

	this.checkDistances = function() {

		if ( !this.noZoom || !this.noPan ) {

			if ( this.object.position.lengthSq() > this.maxDistance * this.maxDistance ) {

				this.object.position.setLength( this.maxDistance );

			}

			if ( _eye.lengthSq() < this.minDistance * this.minDistance ) {

				this.object.position.addVectors( this.target, _eye.setLength( this.minDistance ) );

			}

		}

	};

	this.update = function() {

		_eye.copy( this.object.position ).sub( this.target );

		if ( !this.noRotate ) {

			this.rotateCamera();

		}
		
		if ( !this.noZoom ) {

			this.zoomCamera();

		}

		if ( !this.noPan ) {

			this.panCamera();

		}

		this.object.position.addVectors( this.target, _eye );

		this.checkDistances();

		this.object.lookAt( this.target );

		this._dx = 0;
		this._dy = 0;
		this._alpha = 0;
	};


	this.mouseDown = function ( button, x ,y ) {

		if ( ! this.enabled ) return;

		if ( _state === STATE.NONE ) {

			_state = button;

			if ( _state === STATE.ZOOM && !this.noZoom ) {

				_zoomStart = _zoomEnd = this.getMouseOnScreen( x, y ).y;

			} else if ( !this.noPan ) {

				_panStart = _panEnd = this.getMouseOnScreen( x, y );

			}
			this._xinit = x;
			this._yinit = y;
		}

	};

	this.mouseMove = function ( x, y ) {

		if ( ! this.enabled ) return;

		if ( _keyPressed ) {

			_zoomStart = _zoomEnd = this.getMouseOnScreen( x, y ).y;
			_panStart = _panEnd = this.getMouseOnScreen( x, y );

			_keyPressed = false;

		}


		if ( _state === STATE.NONE ) {

			return;

		} else if ( _state === STATE.ROTATE && !this.noRotate ) {

			this._dx= +x - this._xinit;
			this._dy= +y - this._yinit;

		} else if ( _state === STATE.ZOOM && !this.noZoom ) {

			_zoomEnd = this.getMouseOnScreen( x, y ).y;

		} else if ( _state === STATE.PAN && !this.noPan ) {

			_panEnd = this.getMouseOnScreen( x, y );

		} else if ( _state === STATE.ROTATE_Z ) {

			var p1 = new THREE.Vector2( x - 0.5 * this.width,
								y - 0.5 * this.height);
			var p2 = new THREE.Vector2( this._xinit - 0.5 * this.width,
								this._yinit - 0.5 * this.height);

			var n1 = p1.length();
			var n2 = p2.length();
			var n12 = n1 * n2;

			if ( n12 > 0 ) {

				var alpha = 0;
				var cosAlpha = p1.dot( p2 ) / n12;
				var sinAlpha = p2.y * p1.x - p2.x * p1.y;

				if ( cosAlpha < 1 ){
					alpha = Math.acos( cosAlpha );
				}
				if ( sinAlpha > 0 )
					alpha = - alpha;
				this._alpha = alpha;

			}
		}

		this._xinit = x;
		this._yinit = y;
		this.update();
	};

	this.mouseUp = function( ) {
		_state = STATE.NONE;
	};
};

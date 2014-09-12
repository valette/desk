/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.VTKLoader = function () {};

THREE.VTKLoader.prototype = {
	addEventListener: THREE.EventDispatcher.prototype.addEventListener,
	hasEventListener: THREE.EventDispatcher.prototype.hasEventListener,
	removeEventListener: THREE.EventDispatcher.prototype.removeEventListener,
	dispatchEvent: THREE.EventDispatcher.prototype.dispatchEvent,

	constructor: THREE.VTKLoader,

	load: function ( url, callback ) {

		var scope = this;
		var request = new XMLHttpRequest();

		request.addEventListener( 'load', function ( event ) {

			var geometry = scope.parse( event.target.responseText );

			scope.dispatchEvent( { type: 'load', content: geometry } );

			if ( callback ) callback( geometry );

		}, false );

		request.addEventListener( 'progress', function ( event ) {

			scope.dispatchEvent( { type: 'progress', loaded: event.loaded, total: event.total } );

		}, false );

		request.addEventListener( 'error', function () {

			scope.dispatchEvent( { type: 'error', message: 'Couldn\'t load URL [' + url + ']' } );

		}, false );

		request.open( 'GET', url, true );
		request.send( null );

	},

	parse: function ( data ) {

		var i, pattern, pattern2, result, nV, numV, numP;
		var geometry = new THREE.BufferGeometry();

		pattern = /POINTS[\s]+([\d]+)/g;
		result = pattern.exec( data );
		numV = parseInt(result[1], 10);
		// float/int  float/int  float/int
		pattern2 = /([\+|\-]?[\d]+[\.]?[\d|\-|e]*)[ ]+([\+|\-]?[\d]+[\.]?[\d|\-|e]*)[ ]+([\+|\-]?[\d]+[\.]?[\d|\-|e]*)/g;
		pattern2.lastIndex = pattern.lastIndex;

		var positions = new Float32Array( numV * 3 );

		nV = numV;
		i = 0;
		while ( nV--) {
			result = pattern2.exec( data );
			positions[i++] = parseFloat( result[ 1 ] );
			positions[i++] = parseFloat( result[ 2 ] );
			positions[i++] = parseFloat( result[ 3 ] );
		}

		pattern = /POLYGONS[\s]+([\d]+)[\s]([\d]+)/g;
		result = pattern.exec( data );
		numP = parseInt(result[1], 10);

		// 3 int int int
		pattern2 = /3[ ]+([\d]+)[ ]+([\d]+)[ ]+([\d]+)/g;
		pattern2.lastIndex = pattern.lastIndex;

		var indices = new Uint32Array( numP * 3 );

		var j = 0;
		for (i = 0; i < numP; i++) {
			// ["3 1 2 3", "1", "2", "3"]
			result = pattern2.exec( data );
			indices[j++] = parseInt( result[ 1 ] );
			indices[j++] = parseInt( result[ 2 ] );
			indices[j++] = parseInt( result[ 3 ] );
		}

        pattern = /POINT_DATA[\s]([\d]+)/g;
		result = pattern.exec( data );
		if (result) {

            if ( numV !== parseInt(result[1], 10)) {
				return;
			}

			pattern2 = /SCALARS[\s][\x21-\x7E]+[\s][\x21-\x7E]+/g;
			pattern2.lastIndex = pattern.lastIndex;
			result = pattern2.exec( data );

			pattern =/LOOKUP_TABLE[\s][\x21-\x7E]+/;
			pattern.lastIndex = pattern2.lastIndex;
			result = pattern.exec( data );

			pattern2 = /[\s]*([\-\+]?[0-9]*[\.]?[0-9]+)/g;
			pattern2.lastIndex = pattern.lastIndex;
			
			var pointData = new Float32Array(numV);
			for  (i = 0; i < numV; i++) {
				result = pattern2.exec( data );
				pointData[i] = parseFloat(result[1], 10);
			}

			geometry.userData = geometry.userData || {};
			geometry.userData.pointData = pointData;

		}

		geometry.addAttribute( 'index', new THREE.BufferAttribute( indices, 1 ) );
		geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

		geometry.computeVertexNormals();

		return geometry ;
	}

};

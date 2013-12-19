/**
 * @author mrdoob / http://mrdoob.com/
 */

THREE.WireframeHelper = function ( object ) {

	var edge = [ 0, 0 ], hash = {};
	var sortFunction = function ( a, b ) { return a - b };

	var keys = [ 'a', 'b', 'c', 'd' ];
	var geometry = new THREE.BufferGeometry();
	var numEdges = 0;

	if ( object.geometry instanceof THREE.Geometry ) {

		var vertices = object.geometry.vertices;
		var faces = object.geometry.faces;

		// allocate maximal size
		var edges = new Uint32Array(6 * faces.length);

		for ( var i = 0, l = faces.length; i < l; i ++ ) {

			var face = faces[ i ];

			for ( var j = 0; j < 3; j ++ ) {

				edge[ 0 ] = face[ keys[ j ] ];
				edge[ 1 ] = face[ keys[ ( j + 1 ) % 3 ] ];
				edge.sort( sortFunction );

				var key = edge.toString();

				if ( hash[ key ] === undefined ) {

					edges[ 2 * numEdges ] = edge[ 0 ];
					edges[ 2 * numEdges + 1 ] = edge[ 1 ];
					hash[ key ] = true;
					numEdges ++;

				}

			}

		}

		geometry.addAttribute( 'position', Float32Array, 2 * numEdges , 3 );
		var coords = geometry.attributes.position.array;

		for ( var i = 0, l = numEdges; i < l; i ++ ) {

			for ( var j = 0; j < 2; j ++ ) {

				var vertex = vertices[ edges [ 2 * i + j] ];

				var index = 6 * i + 3 * j;
				coords[ index + 0 ] = vertex.x;
				coords[ index + 1 ] = vertex.y;
				coords[ index + 2 ] = vertex.z;

			}

		}

	} else if ( object.geometry.offsets.length ) {

		var vertices = object.geometry.attributes.position.array;
		var indices = object.geometry.attributes.index.array;
		var offsets = object.geometry.offsets

		// allocate maximal size
		var edges = new Uint32Array(2 * indices.length);

		for ( var o = 0, ol = offsets.length; o < ol; ++ o ) {

			var start = offsets[ o ].start;
			var count = offsets[ o ].count;
			var index = offsets[ o ].index;
			var il;

			for ( var i = start, il = start + count; i < il; i += 3 ) {

				for ( var j = 0; j < 3; j ++ ) {

					edge[ 0 ] = index + indices[ i + j ];
					edge[ 1 ] = index + indices[ i + ( j + 1 ) % 3 ];
					edge.sort( sortFunction );

					var key = edge.toString();

					if ( hash[ key ] === undefined ) {

						edges[ 2 * numEdges ] = edge[ 0 ];
						edges[ 2 * numEdges + 1 ] = edge[ 1 ];
						hash[ key ] = true;
						numEdges ++;

					}

				}

			}

		}

		geometry.addAttribute( 'position', Float32Array, 2 * numEdges , 3 );

		var coords = geometry.attributes.position.array;

		for ( var i = 0, l = numEdges; i < l; i ++ ) {

			for ( var j = 0; j < 2; j ++ ) {

				var index = 6 * i + 3 * j;
				var index2 = 3 * edges[ 2 * i + j];
				coords[ index + 0 ] = vertices[ index2 ];
				coords[ index + 1 ] = vertices[ index2 + 1 ];
				coords[ index + 2 ] = vertices[ index2 + 2 ];

			}

		}
	} else {

		var vertices = object.geometry.attributes.position.array;
		var numEdges = vertices.length / 3;
		var numTris = numEdges / 3;

		geometry.addAttribute( 'position', Float32Array, 2 * numEdges , 3 );
		var coords = geometry.attributes.position.array;

		for ( var i = 0, l = numTris; i < l; i ++ ) {

			var index = i * 9;

			for ( var j = 0; j < 3; j ++ ) {
				var index2 = 2 * index + 6 * j;

				var vertex1 = j * 3;
				var vertex2 = ( ( j + 1 ) % 3 ) * 3;
				coords[ index2 + 0 ] = vertices[ index + vertex1 ];
				coords[ index2 + 1 ] = vertices[ index + vertex1 + 1 ];
				coords[ index2 + 2 ] = vertices[ index + vertex1 + 2 ];

				coords[ index2 + 3 ] = vertices[ index + vertex2 ];
				coords[ index2 + 4 ] = vertices[ index + vertex2 + 1 ];
				coords[ index2 + 5 ] = vertices[ index + vertex2 + 2 ];

			}

		}

	}

	THREE.Line.call( this, geometry, new THREE.LineBasicMaterial( { color: 0xffffff } ), THREE.LinePieces );

	this.matrixAutoUpdate = false;
	this.matrixWorld = object.matrixWorld;

};

THREE.WireframeHelper.prototype = Object.create( THREE.Line.prototype );

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
		var i;
		var geometry = new THREE.Geometry();

		function vertex( x, y, z ) {

			geometry.vertices.push( new THREE.Vector3( x, y, z ) );

		}

		function face3( a, b, c ) {

			geometry.faces.push( new THREE.Face3( a, b, c ) );

		}

		function face4( a, b, c, d ) {

			geometry.faces.push( new THREE.Face4( a, b, c, d ) );

		}

		var pattern, pattern2, result;

		pattern = /POINTS[\s]+([\d]+)/g;
		result = pattern.exec( data );
		var numV = parseInt(result[1], 10);
		pattern2 = /([\+|\-]?[\d]+[\.]?[\d|\-|e]*)[ ]+([\+|\-]?[\d]+[\.]?[\d|\-|e]*)[ ]+([\+|\-]?[\d]+[\.]?[\d|\-|e]*)/g;
		pattern2.lastIndex = pattern.lastIndex;
		

		var nV = numV
		// float/int  float/int  float/int
		while ( nV--) {

			result = pattern2.exec( data );

			// ["1.0 2.0 3.0", "1.0", "2.0", "3.0"]

			vertex( parseFloat( result[ 1 ] ), parseFloat( result[ 2 ] ), parseFloat( result[ 3 ] ) );

		}

		pattern = /POLYGONS[\s]+([\d]+)[\s]([\d]+)/g;
		result = pattern.exec( data );
		var numP = parseInt(result[1], 10);

		// 3 int int int

		var pattern2 = /3[ ]+([\d]+)[ ]+([\d]+)[ ]+([\d]+)/g;
		pattern2.lastIndex = pattern.lastIndex;

		for (i = 0; i < numP; i++) {

			// ["3 1 2 3", "1", "2", "3"]
			result = pattern2.exec( data );
			face3( parseInt( result[ 1 ] ), parseInt( result[ 2 ] ), parseInt( result[ 3 ] ) );

		}

		// 4 int int int int

	/*	pattern = /4[ ]+([\d]+)[ ]+([\d]+)[ ]+([\d]+)[ ]+([\d]+)/g;

		while ( ( result = pattern.exec( data ) ) != null ) {

			// ["4 1 2 3 4", "1", "2", "3", "4"]

			face4( parseInt( result[ 1 ] ), parseInt( result[ 2 ] ), parseInt( result[ 3 ] ), parseInt( result[ 4 ] ) );

		}*/

        pattern = /COLOR_SCALARS[\s][\x21-\x7E]+[\s]([\d]+)/g;
		result = pattern.exec( data );
		pattern2 = /([\+|\-]?[\d]+[\.]?[\d|\-|e]*)[ ]+([\+|\-]?[\d]+[\.]?[\d|\-|e]*)[ ]+([\+|\-]?[\d]+[\.]?[\d|\-|e]*)/g;
		pattern2.lastIndex = pattern.lastIndex;

		if (parseInt(result[1], 10) === 3) {
			var colors = [];
			for  (i = 0; i < numV; i++) {
				result = pattern2.exec( data );
				var color = new THREE.Color( );
				color.setRGB(result[1], result[2], result[3]);
				colors.push(color);
			}

			geometry.faces.forEach(function (face) {
				face.vertexColors.push(colors[face.a]);
				face.vertexColors.push(colors[face.b]);
				face.vertexColors.push(colors[face.c]);
			});
		}

		geometry.computeCentroids();
		geometry.computeFaceNormals();
		geometry.computeVertexNormals();
		geometry.computeBoundingSphere();

		return geometry ;
	}

};

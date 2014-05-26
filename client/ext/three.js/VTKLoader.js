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
		if (result) {
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
		}

        pattern = /POINT_DATA[\s]([\d]+)/g;
		result = pattern.exec( data );
		if (result) {
            if ( numV === parseInt(result[1], 10)) {
                pattern2 = /SCALARS[\s][\x21-\x7E]+[\s][\x21-\x7E]+/g;
                pattern2.lastIndex = pattern.lastIndex;
                result = pattern2.exec( data );
                pattern =/LOOKUP_TABLE[\s][\x21-\x7E]+/;
                pattern.lastIndex = pattern2.lastIndex;
                result = pattern.exec( data );
                pattern2 = /[\s]*([\-\+]?[0-9]*[\.]?[0-9]+)/g;
                pattern2.lastIndex = pattern.lastIndex;
                
                var pointData = [];
                for  (i = 0; i < numV; i++) {
                    result = pattern2.exec( data );
                    pointData.push(parseFloat(result[1], 10));
                }

                geometry.userData = geometry.userData || {};
                geometry.userData.pointData = pointData;
            }
		}

		geometry.computeFaceNormals();
		geometry.computeVertexNormals();
		geometry.computeBoundingSphere();

		return geometry ;
	}

};

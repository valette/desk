LZMA = require( './lzma.js' );
CTM = require( './ctm.js' );

module.exports = function () {

	self.onmessage = function( event ) {

		var files = [];

		for ( var i = 0; i < event.data.offsets.length; i ++ ) {

			var stream = new CTM.Stream( event.data.data );
			stream.offset = event.data.offsets[ i ];

			files[ i ] = new CTM.File( stream );

		}

		postMessage ( files );

	}
}

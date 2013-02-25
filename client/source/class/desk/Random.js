/**
 * An RC4 Seedable Random Number Generator, inspired from : 
 * http://www.webdeveloper.com/forum/showthread.php?140572-Need-random-numbers-based-on-seeds
 */
qx.Class.define("desk.Random", 
{
	extend : qx.core.Object,

	/**
	* Constructor, with seed
	* @param seed {String} optional seed
	* <pre class="javascript">
	* example : <br>
	* var rng = new desk.Random();<br>
	* for (var i = 0; i < 10; i++) {<br>
	*	console.log(rng.getRandomNumber());<br>
	* }<br>
	* will display 10 random numbers in the [0,1] range<br>
	* </pre>
	*/
	construct : function(seed) {
		this.base(arguments);
		this.__keySchedule = [];
		this.__keySchedule_i = 0;
		this.__keySchedule_j = 0;

		seed = seed || "defaultSeed"
		this.__init(seed.toString());
		return this;
	},

	members : {
		__init : function (seed) {
			var keySchedule = this.__keySchedule;
			for (var i = 0; i < 256; i++) {
				keySchedule[i] = i;
			}
			
			var j = 0;
			for (i = 0; i < 256; i++) {
				j = (j + keySchedule[i] + seed.charCodeAt(i % seed.length)) % 256;
				
				var t = keySchedule[i];
				keySchedule[i] = keySchedule[j];
				keySchedule[j] = t;
			}
		},

		__keySchedule  : null,
		__keySchedule_i : null,
		__keySchedule_j : null,

		__getRandomByte : function () {
			var keySchedule = this.__keySchedule;
			this.__keySchedule_i = (this.__keySchedule_i + 1) % 256;
			this.__keySchedule_j = (this.__keySchedule_j + keySchedule[this.__keySchedule_i]) % 256;
			
			var t = keySchedule[this.__keySchedule_i];
			keySchedule[this.__keySchedule_i] = keySchedule[this.__keySchedule_j];
			keySchedule[this.__keySchedule_j] = t;
			
			return keySchedule[(keySchedule[this.__keySchedule_i] + keySchedule[this.__keySchedule_j]) % 256];
		},

		/**
		 * Returns a random number in the [0,1] range
		 * @return{Float} random number
		 */
		getRandomNumber : function() {
			var number = 0;
			var multiplier = 1;
			for (var i = 0; i < 8; i++) {
				number += this.__getRandomByte() * multiplier;
				multiplier *= 256;
			}
			return number / 18446744073709551616;
		}
	}
});



/**
 * A Seedable Random Number Generator
 * @ignore (randomJS.*)
 */
qx.Class.define("desk.Random", 
{
	extend : qx.core.Object,

	/**
	* Constructor, with seed
	* @param seed {Integer} optional seed
	* <pre class="javascript">
	* example : <br>
	* var rng = new desk.Random(1234);<br>
	* for (var i = 0; i < 10; i++) {<br>
	*	console.log(rng.random());<br>
	* }<br>
	* will display 10 random numbers in the [0,1] range<br>
	* </pre>
	*/
	construct : function(seed) {
		this.base(arguments);

		if (seed === undefined) {
			seed = 1;
		}

		this.__random = randomJS(randomJS.engines.mt19937().seed(seed));
	},

	members : {
		__random : null,

		/**
		 * Returns a random number in the [0,1] range
		 * @return {Float} random number
		 */
		random : function() {
			return this.__random.real(0, 1, true);
		}
	}
});



/**
 * Mixin for handling links between several objects
 * @ignore (_.contains)
 */
qx.Mixin.define("desk.LinkMixin",
{
	members:
	{
		__links : null,

		/**
		* links to an other object
		*
		* @param source {Object} the object to link to
		*/
		link : function (source) {
			function addUnique(object, links) {
				if (!_.contains(links, object)) {
					links.push(object);
				}
			}

			if (source === this) {
				return;
			}

			if (this.__links === null){
				if (source.__links === null) {
					this.__links = [];
					source.__links = this.__links;
				}
				else {
					this.__links = source.__links;
				}
			}
			else {
				if (source.__links === null) {
					source.__links = this.__links;
				}
				else {
					for (var i = 0; i < source.__links.length; i++) {
						addUnique(source.__links[i], this.__links);
					}
					for (i = 0; i < source.__links.length; i++) {
						source.__links[i].__links = this.__links;
					}
				}
			}

			addUnique(this, this.__links);
			addUnique(source, this.__links);
		},


		/**
		* unlink the object
		*/
			unlink : function () {
			var links=this.__links;
			if (links === null) {
				return;
			}
			for (var i = 0; i < links.length; i++){
				if (links[i] == this) {
					links.splice(i,1);
					break;
				}
			}
			this.__links = null;
		},

		/**
		* apply the provided function to each linked object as context
		* @param applyFunction {Function} the function to apply
		* <pre class="javascript">
		* example : 
		* obj1.link(obj2);
		* obj1.applyToLinks(function() {
		*	this.doSomething // this will be applied to obj1 and obj2
		* });
		* </pre>
		*/
		applyToLinks : function (applyFunction) {
			var links = this.__links;
			if (links === null) {
				applyFunction.apply(this);
				return;
			}
			for (var i = 0; i < links.length; i++) {
				applyFunction.apply(links[i]);
			}
		},

		/**
		* apply the provided function to each linked objects as context
		* except for the called object
		* @param applyFunction {Function} the function to apply
		* <pre class="javascript">
		* example : 
		* obj1.link(obj2);
		* obj1.applyToLinks(function() {
		*	this.doSomething // this will be applied to only obj2
		* });
		* </pre>
		*/	
		applyToOtherLinks : function (applyFunction) {
			var links = this.__links;
			if (links === null) {
				return;
			}
			for (var i = 0; i < links.length; i++) {
				var link = links[i];
				if (link !== this) {
					applyFunction.call(link, this);
				}
			}
		}
	}
});

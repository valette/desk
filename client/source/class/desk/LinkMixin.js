/**
 * Mixin for handling links between several objects
 * @ignore (_.contains)
 */
qx.Mixin.define("desk.LinkMixin",
{
	construct : function () {
		this.__links = [this];
	},

	members : {
		__links : null,

		/**
		* links to an other object
		*
		* @param source {Object} the object to link to
		*/
		link : function (source) {
			source.__links.forEach(this.__addUnique, this);
			this.__addUnique(source);
		},

		__addUnique  : function (object) {
			if (!_.contains(this.__links, object)) {
				this.__links.push(object);
				object.__links = this.__links;
			}
		},

		/**
		* unlink the object
		*/
		unlink : function () {
			this.__links.forEach(function (link, index, links) {
				if (link == this) {
					links.splice(index,1);
				}
			}, this);
			this.__links = [this];
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
			this.__links.forEach(function (link) {
				applyFunction.apply(link);
			});
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
			this.__links.forEach(function (link) {
				if (link !== this) {
					applyFunction.call(link, this);
				}
			}, this);
		}
	}
});

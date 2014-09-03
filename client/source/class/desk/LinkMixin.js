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
		* gives the array of all linked object (this included)
		* @return {Array} the linked objects
		*/		getLinks : function () {
			return this.__links;
		}
	}
});

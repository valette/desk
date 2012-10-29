
qx.Mixin.define("desk.LinkMixin",
{
	members:
	{
		__links : null,

		link : function (source) {
			if (source == this) {
				return;
			}

			// first merge 2 links
			var links = this.__links;
			var links2 = source.__links;
			var found;
			var source2;

			if (links === null){
				if (links2 === null) {
					this.__links = source.__links = [];
				}
				else {
					this.__links = links2;
				}
			}
			else {
				if (links2 == null) {
					source.__links = links;
				}
				else {
					//need to merge links
					links = this.__links;
					links2 = source.__links;
					for (var i = 0; i < links2.length; i++) {
						source2 = links2[i];
						found = false;
						for (var j = 0; j < links.length; j++) {
							if (links[i] == source2) {
								found = true;
							}
						}
						if (!found) {
							links.push(source2);
						}
					}
					source.__links = links;
				}
			}

			links = this.__links;
			function addUnique(object) {
				var found = false;
				for (var i = 0; i < links.length; i++){
					source2 = links[i];
					if (source2 === this) {
						found = true;
						break;
					}
				}
				if (!found) {
					links.push(object);
				}
			}
			addUnique(this);
			addUnique(source);
		},

		unlink : function () {
			var links=this.__links;
			if (links==null) {
				return;
			}
			for (var i=0;i<links.length;i++){
				if (links[i] == this) {
					links.splice(i,1);
					break;
				}
			}
			this.__links=null;
		},

		applyToLinks : function (applyFunction) {
			var links=this.__links;
			if (links==null) {
				return;
			}
			for (var i = 0; i < links.length; i++) {
				applyFunction.apply(links[i]);
			}
		},

		applyToOtherLinks : function (applyFunction) {
			var links = this.__links;
			if (links == null) {
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

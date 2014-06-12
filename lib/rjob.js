function rjob(client, atts) {
	this.client = client;
	for (var key in atts) {
		this[key] = atts[key];
	}
	this.tags = this.tags.length ? this.tags : [];
	this.data = JSON.parse(this.data);
}

rjob.prototype.toString = function() {
	return 'qless.rjob ' + this.jid;
}

rjob.prototype.next = function(cb, eb) {
	this.client.redis.zscore('ql:q:' + this.queue + '-recur', this.jid, cb, eb);
}

rjob.prototype.move = function(queue, cb, eb) {
	this.client._lua.call('recur.update', [this.jid, 'queue', this.queue], cb, eb);
}

rjob.prototype.cancel = function(cb, eb) {
	this.client._lua.call('unrecur', [this.jid], cb, eb);
}

rjob.prototype.tag = function(tags, cb, eb) {
	this.client._lua.call('recur.tag', [tags], cb, eb);
}

rjob.prototype.untag = function(tags, cb, eb) {
	this.client._lua.call('recur.untag', [tags], cb, eb);
}

exports.rjob = rjob;

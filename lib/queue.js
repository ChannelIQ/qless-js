var uuid = require('node-uuid');
var job  = require('./job').job;
var rjob = require('./rjob').rjob;

function queue(name, client, worker) {
	this.name   = name;
	this.client = client;
	this.worker = worker;
}

queue.prototype.setHeartbeat = function(interval, cb, eb){
	this.client.config.set(this.name+'-heartbeat', interval, cb, eb);
}

queue.prototype.getHeartbeat = function(cb, eb){
	this.client.config.get(this.name+'-heartbeat', cb, eb);
}

queue.prototype.put = function(klass, data, options, cb, eb) {
	this.client._lua.call('put', [this.name,
		options.jid || uuid.v1().replace(/-/g, ''),
		klass,
		JSON.stringify(data),
		options.delay || 0,
		'priority', options.priority || 0,
		'tags', JSON.stringify(options.tags || []),
		'retries', options.retries || 5,
		'depends', JSON.stringify(options.depends || [])
	], cb, eb)
}

queue.prototype.recur = function(klass, data, interval, offset, options, cb, eb) {
	if(typeof(options)=='function') {
		eb=cb; cb=options; options=offset; offset = 0;
	}else if(!options){
		options = offset;
		offset = 0;
	}this.client._lua.call('recur', [this.name,
		options.jid || uuid.v1().replace(/-/g, ''),
		klass,
		JSON.stringify(data),
		'interval', interval, offset,
		'priority', options.priority || 0,
		'tags', JSON.stringify(options.tags || []),
		'retries', options.retries || 5
	], cb, eb)
}

queue.prototype.pop = function(count, cb, eb) {
	if (typeof(count) == 'function') {
		eb = cb; cb = count;
		this.client._lua.call('pop', [this.name, this.worker, 1], function(r) {
			var results = JSON.parse(r);
			if(results.length)
				cb(new job(client, JSON.parse(r)[0]));
			else	cb({});
		}, eb);
	} else {
		this.client._lua.call('pop', [this.name, this.worker, count], function(r) {
			var results = JSON.parse(r);
			for (var index in results) {
				results[index] = new job(client, results[index]);
			}
			cb(results);
		}, eb);
	}
}

queue.prototype.peek = function(count, cb, eb) {
	if (typeof(count) == 'function') {
		eb = cb; cb = count;
		this.client._lua.call('peek', [this.name, 1], function(r) {
			cb(new job(client, JSON.parse(r)[0]));
		}, eb);
	} else {
		this.client._lua.call('peek', [this.name, count], function(r) {
			results = JSON.parse(r);
			for (var index in results) {
				results[index] = new job(client, results[index]);
			}
			cb(results);
		}, eb);
	}
}

queue.prototype.stats = function(date, cb, eb) {
	if (typeof(date) == 'function') {
		eb = cb; cb = date; date = (new Date().getTime() / 1000);
	}
	this.client._lua.call('stats', [this.name, date], function(r) {
		cb(JSON.parse(r));
	}, eb);
}

queue.prototype.running = function(offset, count, cb, eb) {
	if (typeof(offset) == 'function') {
		eb = count; cb = offset; offset = 0; count = 25;
	} else if (typeof(count) == 'function') {
		eb = cb; cb = count; count = 25;
	}
	this.client._lua.call('jobs', ['running', this.name, offset, count], cb, eb);
}

queue.prototype.stalled = function(offset, count, cb, eb) {
	if (typeof(offset) == 'function') {
		eb = count; cb = offset; offset = 0; count = 25;
	} else if (typeof(count) == 'function') {
		eb = cb; cb = count; count = 25;
	}
	this.client._lua.call('jobs', ['stalled', this.name, offset, count], cb, eb);
}

queue.prototype.scheduled = function(offset, count, cb, eb) {
	if (typeof(offset) == 'function') {
		eb = count; cb = offset; offset = 0; count = 25;
	} else if (typeof(count) == 'function') {
		eb = cb; cb = count; count = 25;
	}
	this.client._lua.call('jobs', ['scheduled', this.name, offset, count], cb, eb);
}

queue.prototype.depends = function(offset, count, cb, eb) {
	if (typeof(offset) == 'function') {
		eb = count; cb = offset; offset = 0; count = 25;
	} else if (typeof(count) == 'function') {
		eb = cb; cb = count; count = 25;
	}
	this.client._lua.call('jobs', ['depends', this.name, offset, count], cb, eb);
}

queue.prototype.recurring = function(offset, count, cb, eb) {
	if (typeof(offset) == 'function') {
		eb = count; cb = offset; offset = 0; count = 25;
	} else if (typeof(count) == 'function') {
		eb = cb; cb = count; count = 25;
	}
	this.client._lua.call('jobs', ['recurring', this.name, offset, count], cb, eb);
}

queue.prototype.length = function(cb, eb) {
	this.client.redis.multi()
		.zcard('ql:q:' + this.name + '-locks')
		.zcard('ql:q:' + this.name + '-work')
		.zcard('ql:q:' + this.name + '-scheduled')
		.exec(function(err, r) {
			err ? (eb || console.warn)(err) : (cb || function(){})(r[0] + r[1] + r[2]);
		});
}

exports.queue = queue;

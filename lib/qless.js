/* External imports */
var os    = require('os');
var redis = require('redis');

/* Internal imports */
var lua    = require('./lua').lua;
var config = require('./config').config;
var queue  = require('./queue').queue;
var job    = require('./job').job;
var rjob   = require('./rjob').rjob;
var events = require('./events').events;

function client(host, port, hostname, klasses) {
	this.redis  = redis.createClient(port || 6379, host || 'localhost');
	this.worker = hostname || os.hostname();
	this.config = new config(this);
	this.events = new events(port || 6379, host || 'localhost');
	
	/* This is a reference to queues as they're lazily loaded */
	this.__queues = {}
	this['_lua'] = new lua(this.redis);

	//placeholder for job functions
	this.__klasses = klasses || {};
}

client.prototype.queue = function(name) {
	if (!this.__queues[name]) {
		this.__queues[name] = new queue(name, this, this.worker);
	}
	return this.__queues[name];
}

client.prototype.queues = function(queue, cb, eb) {
	if(typeof(queue)=='function'){
		eb=cb; cb=queue; queue = undefined;
	}
	if (queue) {
		return this._lua.call('queues', [queue], function(r) {
			cb(JSON.parse(r));
		}, eb);
	} else {
		return this._lua.call('queues', [], function(r) {
			cb(JSON.parse(r));
		}, eb);
	}
}

client.prototype.tracked = function(cb, eb) {
	return this._lua.call('track', [], function(r) {
		var results = JSON.parse(r);
		for (var index in results['jobs']) {
			results['jobs'][index] = new job(this, results['jobs'][index]);
		}
		cb(results);
	}, eb);
}

client.prototype.complete = function(offset, count, cb, eb) {
	if(typeof(offset)=='function'){
		cb=offset; eb=count; offset=0; count=25;
	} else if(typeof(count)=='function'){
		eb=cb; cb=count; count=25;
	} this._lua.call('jobs', ['complete', offset, count], cb, eb);
}

client.prototype.failed = function(group, start, limit, cb, eb) {
	if (typeof(group) == 'function') {
		eb = start; cb = group;
		group = null;
	} else if (typeof(start) == 'function') {
		eb = limit; cb = start;
		start = 0; limit = 25;
	} else if (typeof(limit) == 'function') {
		eb = cb; cb = limit;
		limit = 25;
	}
	if (group == null) {
		this._lua.call('failed', [], function(r) {
			cb(JSON.parse(r));
		}, eb);
	} else {
		this._lua.call('failed', [group, start, limit], function(r) {
			var results = JSON.parse(r);
			var size=results['jobs'].length;
			var jobs=0;
			for (var index in results['jobs']) {
				var temp = index;
                                this.client.job(results['jobs'][index], 
					function(r){results['jobs'][temp]=r;jobs++});
			}
			var forend = function(){
				if(jobs==size)
					cb(results);
				else setTimeout((function(){forend()}), 1);
			}
			forend();
		}, eb);
	}
}

client.prototype.unfail = function(queue, group, count, cb, eb){
	if (typeof(count) == 'function') {
		eb=cb; cb=count;
		count = 500;
	}
	if (!count) count = 500;
	this._lua.call('unfail', [queue, group, count], cb, eb);
}

client.prototype.workers = function(worker, cb, eb) {
	if (typeof(worker) == 'function') {
		eb = cb; cb = worker;
		this._lua.call('workers', [], function(r) {
			cb(JSON.parse(r));
		}, eb);
	} else {
		this._lua.call('workers', [worker], function(r) {
			cb(JSON.parse(r));
		}, eb);
	}
}

client.prototype.tags = function(offset, count, cb, eb) {
	if(count == undefined) count = 100;
	if(offset == undefined) offset = 0;
	if(typeof(offset) == 'function') {
		cb = offset;
		eb = count;
		offset = 0;
		count = 100;
	} else if(typeof(count) == 'function') {
		eb = cb;
		cb = count;
		count = 0;
	} this._lua.call('tag', ['top', offset, count], function(r){cb(JSON.parse(r))}, eb);
}

client.prototype.tagged = function(tag, offset, count, cb, eb) {
	if(typeof(offset)=='function'){
		cb=offset; eb=count; offset=0; count=25;
	}else if(typeof(count)=='function'){
		eb=cb; cb=count; count=25;
	}this._lua.call('tag', ['get', tag, offset, count], function(r){cb(JSON.parse(r))}, eb);
}

client.prototype.job = function(id, cb, eb) {
	this._lua.call('get', [id], function(r) {
		if (r) {
			cb(new job(this.client, JSON.parse(r)));	
		} else {
			this.client._lua.call('recur.get', [id], function(r){
				if (r) {
					cb(new rjob(this.client, JSON.parse(r)));
				} else {
					cb(null);
				}
			}, eb);
		}
	}, eb);
}    

exports.client = client;

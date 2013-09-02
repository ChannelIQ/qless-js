var qless = require('../qless');
var assert = require('assert');

//init
before(function(){
    client = new qless.client();
//    client.redis.send_command('script',['flush']);
    client.redis.send_command('flushdb',[]);
    client.worker='worker';
})
after(function(){
    client.redis.send_command('flushdb',[]);
})

var Foo = function(){}

Foo.prototype = {
    bar:  function(job){
        job['foo'] = 'bar';
        job.complete();
    },
    nonstatic: function(){}
}

describe('Job -', function(){
    it('it should have all basic attributes', function(done){
        client.queue('foo').put('Foo', {'whiz': 'bang'}, {'jid':'jid', 'tags':['foo'], 'retries':3}, function(){
            client.job('jid', function(r){
                assert.deepEqual(
                    { 'data': {'whiz': 'bang'},
                      'dependencies': [],
                      'dependents': [],
                      'expires_at': 0,
                      'jid': 'jid',
                      'klass_name': 'Foo',
                      'original_retries': 3,
                      'priority': 0,
                      'queue_name': 'foo',
                      'retries_left': 3,
                      'tags': ['foo'],
                      'worker_name': ''        },
                    { 'data': r.data,
                      'dependencies': r.dependencies,
                      'dependents': r.dependents,
                      'expires_at': r.expires_at,
                      'jid': r.jid,
                      'klass_name': r.klass_name,
                      'original_retries': r.original_retries,
                      'priority': r.priority,
                      'queue_name': r.queue_name,
                      'retries_left': r.retries_left,
                      'tags': r.tags,
                      'worker_name': r.worker_name        })
            })
        })
    })
})

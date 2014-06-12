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

describe('#get initial job counts -', function(){
    it('depends should be blank', function(done){
        client.redis.send_command('flushdb',[]);
        client.queue('foo').depends(function(r){
            assert.deepEqual(r, []);
            done();
        })
    })
    it('running should be blank', function(done){
        client.queue('foo').running(function(r){
            assert.deepEqual(r, []);
            done();
        })
    })
    it('stalled should be blank', function(done){
        client.queue('foo').stalled(function(r){
            assert.deepEqual(r, []);
            done();
        })
    })
    it('scheduled should be blank', function(done){
        client.queue('foo').scheduled(function(r){
            assert.deepEqual(r, []);
            done();
        })
    })
    it('recurring should be blank', function(done){
        client.queue('foo').recurring(function(r){
            assert.deepEqual(r, []);
            done();
        })
    })
})

describe('#queues() -', function(){
    it('should give initial job counts', function(done){
        client.queue('foo').put('Foo', {}, {'jid':'jid'}, function(){
            client.queues(false, function(r){
                assert.deepEqual(r[0], 
                    { depends:   0,
                      name:      'foo',
                      paused:    false,
                      recurring: 0,
                      running:   0,
                      scheduled: 0,
                      stalled:   0,
                      waiting:   1     })
                done();
            })
        })
    })
})

describe('#peek() -', function(){
    it('single peek should return jid', function(done){
        client.queue('foo').peek(function(r){
            assert.equal(r.jid, 'jid');
            done();
        })
    })
    it('multipeek should return two values', function(done){
        client.queue('foo').put('Bar',{},{'jid':'jid2'}, function(){
            client.queue('foo').peek(10, function(r){
                assert.equal(r.length, 2);
                done();
            })
        })
    })
})

describe('#pop() -', function(){
    it('multipop should pop 2 entries out', function(done){
        client.queue('foo').pop(10, function(r){
            assert.equal(r.length, 2);
            done();
        })
    })
    it('pop should now be blank', function(done){
        client.queue('foo').pop(function(r){
            assert.deepEqual(r, {});
            done();
        })
    })
})

describe('#queue count -', function(){
    it('should be 1', function(done){
        assert.equal(Object.keys(client.__queues).length, 1);
        done();
    })
})

describe('#heartbeat -', function(){
    it('setHeartbeat(interval) should change the interval', function(done){
        var original;
        client.queue('foo').getHeartbeat(function(r){
            client.queue('foo').setHeartbeat(10, function(){
                client.queue('foo').getHeartbeat(function(r2){
                    assert.notEqual(r, r2);
                    done();
                })
            })
        })
    })
})

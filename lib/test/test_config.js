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

//tests
describe('#basic get and set -', function(){
    it('should return undefined', function(done){
        client.config.get('foo',function(reply){
            assert.equal(reply,undefined);
            done();
        })
    })
    it('set should not error', function(done){
        client.config.set('foo',5,function(){done()});
    })
    it('get should be 5', function(done){
        client.config.get('foo',function(reply){
            assert.equal(reply,'5');
            done();
        })
    })
    it('unset should not error', function(done){
        client.config.unset('foo',function(){done()});
    })
    it('unset key should have undefined value', function(done){
        client.config.get('foo',function(reply){
            assert.equal(reply,undefined);
            done();
        })
    })
})
describe('#get all -', function(){
    it('should get default configuration', function(done){
        a = { 'application' : 'qless',
              'grace-period' : 10,
              'stats-history': 30,
              'jobs-history': 604800,
              'heartbeat' : 60,
              'jobs-history-count': 50000,
              'histogram-history': 7 }
        client.config.all(function(reply){
            assert.deepEqual(reply,a);
            done();
        })
    })
    it('with additional entry', function(done){
        a = { 'application' : 'qless',
              'histogram-history' : 7,
              'grace-period' : 10,
              'stats-history' : 30,
              'jobs-history' : 604800,
              'heartbeat' : 60,
              'jobs-history-count' : 50000,
              'foo' : '5' }
        client.config.set('foo',5,function(){
            client.config.all(function(reply){
                assert.deepEqual(reply,a)})
                done()
        })
    })
})



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

describe('Client', function(){
    describe('#track and untrack -', function(){
        it('should show jid as tracked', function(done){
            client.queue('foo').put('Foo', {}, {'jid':'jid'}, function(){
                client.job('jid', function(r){
                    r.track(function(){
                        client.tracked(function(r2){
                            assert.equal(r2.jobs[0].jid, 'jid');
                            done();
                        })
                    })
                })
            })
        })
        it('should be empty', function(done){
            client.job('jid', function(r){
                r.untrack(function(){
                    client.tracked(function(r2){
                        assert.deepEqual(r2, { 'jobs'    : [],
                                               'expired' : {}  });
                        done();
                    })
                })
            })
        })
    })
    describe('#tags -', function(){
        it('should be empty', function(done){
            client.tags(function(r){
                assert.deepEqual(r, {});
                done();
            })
        })
        it('should return "foo"', function(done){
            client.queue('foo').put('Foo', {}, {'tags':['foo']}, function(){
                client.queue('foo').put('Foo', {}, {'tags':['foo']}, function(){
                    client.queue('foo').put('Foo', {}, {'tags':['foo']}, function(){
                        client.tags(function(r){
                            assert.deepEqual(r, ['foo']);
                            done();
                        })
                    })
                })
            })
        })
    })
    describe('#unfail -', function(){
        it('verify job is in failed state', function(done){
            client.queue('foo').put('Foo', {}, {'jid':'foo'}, function(){
                client.queue('foo').pop(function(r){
                    r.fail('foo','bar', function(){
                        client.job('foo', function(r2){
                            assert(r2.state, 'failed');
                            done();
                        })
                    })
                })
            })
        })
	it('verify after running unfail() that job is in waiting state', function(done){
            client.unfail('foo', 'foo', function(){
                client.job('foo', function(r){
                    assert(r.state, 'waiting');
                    done();
                })
            })
        })
    })
})

describe('Jobs', function(){
    describe('#access jobs -', function(){
        it('verify no test job', function(done){
            client.job('basic', function(r){
                assert.equal(r, null);
                done();
            })
        })
        it('basic jobs', function(done){
            client.queue('foo').put('Foo', {}, {'jid':'basic'}, function(){
                client.job('basic', function(r){
                    assert.notEqual(r, null);
                    done();
                })
            })
        })
        it('recurring jobs', function(done){
            client.queue('foo').recur('Foo', {}, 60, {'jid':'recur'}, function(){
                client.job('recur', function(r){
                    assert.notEqual(r, null);
                    done();
                })
            })
        })
        it('complete jobs', function(done){
            client.redis.send_command('flushdb',[]);
            client.queue('foo').put('Foo', {}, {'jid':'complete'}, function(){
                client.queue('foo').pop(function(r){
                    r.complete(function(){
                        client.complete(function(r2){
                            assert.deepEqual(r2, ['complete']);
                            done();
                        })
                    })
                })
            })
        })
        it('tagged jobs', function(done){
            client.queue('foo').put('Foo', {}, {'jid':'tagged', 'tags':['foo']}, function(){
                client.tagged('foo', function(r){
                    assert.equal(r.jobs[0], 'tagged');
                    done();
                })
            })
        })
        it('failed jobs', function(done){
            client.redis.send_command('flushdb',[]);
            client.queue('foo').put('Foo', {}, {'jid':'failed'}, function(){
                client.queue('foo').pop(function(r){
                    r.fail('foo', 'bar', function(){
                        client.failed('foo', function(r2){
                            assert.equal(r2.jobs[0].jid, 'failed');
                            done();
                        })
                    })
                })
            })
        })
        it('failure types', function(done){
            client.queue('foo').put('Foo', {}, {'jid':'failures'}, function(){
                client.queue('foo').pop(function(r){
                    r.fail('foo', 'bar', function(){
                        client.failed(function(r2){
                            assert.deepEqual(r2, {'foo':2});
                            done();
                        })
                    })
                })
            })
        })
    })
})

describe('Queues', function(){
    it('- get basic access', function(done){
        assert.notEqual(client.queue('foo'), undefined);
        done();
    })
    it('- get counts', function(done){
        client.queue('foo').put('Foo', {}, {}, function(){
            client.queues(function(r){
                assert.deepEqual(r,
                    [{ 'scheduled': 0,
                       'name'     : 'foo',
                       'paused'   : false,
                       'waiting'  : 1,
                       'depends'  : 0,
                       'running'  : 0,
                       'stalled'  : 0,
                       'recurring': 0      }])
                done();
            })
        })
    })
})

describe('Workers', function(){
    describe('#access them', function(){
        it('- should be blank', function(done){
            client.redis.send_command('flushdb',[]);
            client.queue('foo').put('Foo', {}, {'jid':'jid'}, function(){
                client.workers('worker', function(r){
                    assert.deepEqual(r, {'jobs':[], 'stalled': []});
                    done();
                })
            })
        })
        it('- should show jid', function(done){
            client.queue('foo').pop(function(){
                client.workers('worker', function(r){
                    assert.deepEqual(r, {'jobs':['jid'], 'stalled': []});
                    done();
                })
            })
        })
    })
    describe('#counts -', function(){
        it('should be blank', function(done){
            client.redis.send_command('flushdb',[]);
            client.queue('foo').put('Foo', {}, {'jid':'jid'}, function(){
                client.workers(function(r){
                    assert.deepEqual(r, {});
                    done();
                })
            })
        })
        it('should not be blank', function(done){
            client.queue('foo').pop(function(){
                client.workers(function(r){
                    assert.deepEqual(r, [{'jobs':1, 'name': 'worker', 'stalled':0}]);
                    done();
                })
            })
        })
    })
})

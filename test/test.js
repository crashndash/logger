/* global describe, it */
'use strict'
const proxyquire = require('proxyquire')
const should = require('should')
const util = require('util')
var lastData = {}
var stubPut = function (key, value, callback) {
  lastData[key] = value
  if (callback) callback(null)
}
const namespace = 'testNamespace123'
const createKey = (key) => {
  return `${namespace}.${key}`
}
const stubConfig = {
  namespace: namespace,
  database: 'testdb'
}

describe('Subscriber', () => {
  it('Should export a function', () => {
    require('../src/subscriber').should.be.instanceOf(Function)
  })

  it('Should be a problem if message is not json', () => {
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut
      },
      '../config': stubConfig
    })
    ;(function () {
      sub('bogus', 'whatever', 'this is{so not json')
    }).should.throw()
  })

  it('Should save the expected data when doing new user connect', () => {
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut
      },
      '../config': stubConfig
    })
    var testId = 'testid12345'
    var data = {
      id: testId,
      otherData: {
        something: true
      }
    }
    sub('pattern', createKey('newuser_connect'), JSON.stringify(data))
    lastData[data.id].should.eql(data)
  })
  it('Should throw an error when put errors out on new user', () => {
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: (key, val, cb) => {
          cb(new Error('horrible problem'))
        }
      },
      '../config': stubConfig
    })
    var testId = 'testid12345'
    var data = {
      id: testId,
      otherData: {
        something: true
      }
    }
    ;(function () {
      sub('pattern', createKey('newuser_connect'), JSON.stringify(data))
    }).should.throw('horrible problem')
  })

  it('Should save stats', () => {
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut
      },
      '../config': stubConfig
    })
    var testId = 'testid1235'
    var data = {
      id: testId,
      otherData: {
        something: true
      }
    }
    sub('pattern', createKey('stats'), JSON.stringify(data))
    lastData['stats:' + data.id].should.eql(data)
  })

  it('Should save scores', () => {
    var testId = 'testid345'
    let expKey = 'scores:00003000:testid345'
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut,
        get: (key, callback) => {
          let err = new Error('Not found')
          err.notFound = true
          callback(err)
        }
      },
      '../config': stubConfig
    })
    var data = {
      userid: testId,
      score: 3000
    }
    sub('pattern', createKey('scores'), JSON.stringify(data))
    lastData['scoreskeys:' + data.userid].should.eql(expKey)
    lastData[expKey].score.should.eql(data.score)
    lastData[expKey].userid.should.eql(data.userid)
  })

  it('Should overwrite scores', () => {
    var testId = 'testid345'
    let expKey = 'scores:00003000:testid345'
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut,
        get: (key, callback) => {
          callback(null, expKey)
        },
        del: (key) => {
          delete lastData[key]
        }
      },
      '../config': stubConfig
    })
    var data = {
      userid: testId,
      score: 3000
    }
    sub('pattern', createKey('scores'), JSON.stringify(data))
    lastData['scoreskeys:' + data.userid].should.eql(expKey)
    lastData[expKey].score.should.eql(data.score)
    lastData[expKey].userid.should.eql(data.userid)
    // Now save again, and expect all things to change.
    data.score = 4000
    sub('pattern', createKey('scores'), JSON.stringify(data))
    lastData['scoreskeys:' + data.userid].should.not.eql(expKey)
    let newExpKey = 'scores:00004000:testid345'
    lastData['scoreskeys:' + data.userid].should.eql(newExpKey)
    should(lastData[expKey]).be.undefined()
    lastData[newExpKey].score.should.eql(data.score)
    lastData[newExpKey].userid.should.eql(data.userid)
  })

  it('Should throw when we pass an error for gettings scores', () => {
    var testId = 'testid345'
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut,
        get: (key, callback) => {
          callback(new Error('error'))
        },
        del: (key) => {
          delete lastData[key]
        }
      },
      '../config': stubConfig
    })
    var data = {
      userid: testId,
      score: 3000
    }
    ;(function () {
      sub('pattern', createKey('scores'), JSON.stringify(data))
    }).should.throw('error')
  })

  it('Should save save connect log', () => {
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut
      },
      '../config': stubConfig
    })
    var testId = 'testid345'
    var data = {
      user: testId,
      score: 3000,
      timestamp: 123
    }
    sub('pattern', createKey('connect'), JSON.stringify(data))
    lastData['connect:' + data.timestamp + ':' + data.user].should.eql(data)
  })

  it('Should save summaries', (done) => {
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut
      },
      '../config': stubConfig
    })
    // Add a couple of bogus ones, for coverage.
    var data = {
      room: 456
    }
    sub('pattern', createKey('events'), JSON.stringify(data))
    // First one will never save a key, so we filter on the data keys.
    should(Object.keys(lastData).filter((v) => {
      return v.indexOf('matches') > -1
    }).length).eql(0)
    data.event = {
      timestamp: 123
    }
    sub('pattern', createKey('events'), JSON.stringify(data))
    should(lastData['matches:123:' + data.room]).be.undefined()
    data.event.type = 'bogus'
    sub('pattern', createKey('events'), JSON.stringify(data))
    should(lastData['matches:123:' + data.room]).be.undefined()
    done()
    data.event.type = 'summary'
    sub('pattern', createKey('events'), JSON.stringify(data))
    should(lastData['matches:123:' + data.room]).be.undefined()
    data.event.message = {}
    sub('pattern', createKey('events'), JSON.stringify(data))
    should(lastData['matches:123:' + data.room]).be.undefined()
    data.event.message.results = {}
    sub('pattern', createKey('events'), JSON.stringify(data))
    should(lastData['matches:123:' + data.room]).be.undefined()
    data.event.message.results.car = {
      bot123: {
        name: 'Bot test',
        count: 1
      }
    }
    sub('pattern', createKey('events'), JSON.stringify(data))
    should(lastData['matches:123:' + data.room]).be.undefined()
    data.event.message.results.car = {
      test123: {
        name: 'Real test',
        count: 2
      }
    }
    sub('pattern', createKey('events'), JSON.stringify(data))
    should(lastData['matches:123:' + data.room]).eql({
      data: data.event.message.results,
      time: data.event.timestamp,
      room: data.room
    })
  })
})

describe('End to end', () => {
  it('Should save the expected values', (done) => {
    const db = proxyquire('../src/db', {
      '../config': stubConfig
    })
    const sub = proxyquire('../src/subscriber', {
      '../config': stubConfig,
      './db': db
    })
    var data = {
      user: 'test123',
      ip: '1.2.3.4',
      timestamp: Date.now()
    }
    let key = util.format('connect:%s:%s', data.timestamp, data.user)
    sub('pattern', createKey('connect'), JSON.stringify(data))
    db.get(key, (err, val) => {
      val.should.eql(data)
      db.close()
      done(err)
    })
  })

  it('Should save and delete and overwrite when we expect so', (done) => {
    const db = proxyquire('../src/db', {
      '../config': stubConfig
    })
    const sub = proxyquire('../src/subscriber', {
      '../config': stubConfig,
      './db': db
    })
    var data = {
      userid: 'test123',
      username: 'testname',
      score: 42
    }
    let key = util.format('scoreskeys:%s', data.userid)
    sub('pattern', createKey('scores'), JSON.stringify(data))
    setTimeout(() => {
      db.get(key, (err, val) => {
        let expKey = 'scores:00000042:test123'
        val.should.eql(expKey)
        should(err).eql(null)
        db.get(expKey, (err, val) => {
          should(err).eql(null)
          val.userid.should.eql(data.userid)
          val.username.should.eql(data.username)
          val.score.should.eql(data.score)
          // Then try to overwrite it.
          data.score = 43
          let key = util.format('scoreskeys:%s', data.userid)
          sub('pattern', createKey('scores'), JSON.stringify(data))
          // Make sure we are after the put
          setTimeout(() => {
            db.get(key, (err, val) => {
              db.close()
              done(err)
            })
          }, 10)
        })
      })
    }, 10)
  })
})

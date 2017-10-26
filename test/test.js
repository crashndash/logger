/* global describe, it */
'use strict'
const proxyquire = require('proxyquire')
require('should')
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
  namespace: namespace
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
    let expKey = '00003000:testid345'
    const sub = proxyquire('../src/subscriber', {
      './db': {
        put: stubPut,
        get: (key, callback) => {
          callback(null, expKey)
        }
      },
      '../config': stubConfig
    })
    var data = {
      userid: testId,
      score: 3000
    }
    sub('pattern', createKey('scores'), JSON.stringify(data))
    lastData['scores:' + data.userid].should.eql(expKey)
    lastData[expKey].score.should.eql(data.score)
    lastData[expKey].userid.should.eql(data.userid)
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
})

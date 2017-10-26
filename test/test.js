'use strict'
require('should')

describe('Subscriber', () => {
  it('Should export a function', () => {
    require('../src/subscriber').should.be.instanceOf(Function)
  })
})

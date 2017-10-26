'use strict'
const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')

let database = levelup(encode(leveldown('./mydb'), {
  valueEncoding: 'json'
}))

module.exports = {
  put: (key, value, callback) => {
    database.put(key, value, callback)
  },
  get: (key, callback) => {
    database.get(key, {
      asBuffer: false
    }, callback)
  },
  close: () => {
    database.close()
  }
}

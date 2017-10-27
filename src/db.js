'use strict'
const levelup = require('levelup')
const leveldown = require('leveldown')
const encode = require('encoding-down')
const config = require('../config')

let database = levelup(encode(leveldown('./' + config.database), {
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
  del: (key, callback) => {
    database.del(key, callback)
  },
  close: () => {
    database.close()
  },
  getAll: (key, reverse, limit, callback) => {
    var data = []
    database.createReadStream({
      gt: key + ':0',
      lt: key + ':å',
      keys: false,
      reverse: reverse,
      limit: limit
    })
    .on('data', (d) => {
      data.push(d)
    })
    .on('end', () => {
      callback(null, data)
    })
  }
}

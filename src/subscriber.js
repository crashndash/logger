'use strict'
const leftPad = require('left-pad')
const util = require('util')

const db = require('./db')
const config = require('../config')

const handleNewUserConnect = function (data) {
  db.put(data.id, data, function (err) {
    if (err) throw err
  })
}

const getStatsKey = (id) => {
  return util.format('stats:%s', id)
}

const handleStats = function (data) {
  db.put(getStatsKey(data.id), data)
}

const getUserScoreKey = (data) => {
  return util.format('scores:%s', data.userid)
}

const handleScores = (data) => {
  // First nuke the score the user has.
  let userKey = getUserScoreKey(data)
  data.date = new Date().getTime()
  db.get(userKey, (err, value) => {
    if (err && !err.notFound) {
      throw err
    }
    let paddedScore = leftPad(data.score, 8, 0)
    let key = util.format('%s:%s', paddedScore, data.userid)
    db.put(key, data)
    // And store the key we use.
    let userKey = getUserScoreKey(data)
    db.put(userKey, key)
    if (value && value !== key) {
      db.del(value)
    }
  })
}

const handleConnect = (data) => {
  let key = util.format('connect:%s:%s', data.timestamp, data.user)
  db.put(key, data)
}

const handleEvents = (data) => {
  if (!data.event || !data.event.type || data.event.type !== 'summary') {
    // We only care about summaries. Right now I have no idea what else there
    // is.
    return
  }
  if (!data.event.message || !data.event.message.results || !data.room) {
    // We really need that data.
    return
  }
  let results = data.event.message.results
  let sendStats = false
  for (var prop in results) {
    for (var e in results[prop]) {
      if (!new RegExp(/^bot[\d]*$/).test(e)) {
        sendStats = true
      }
    }
  }
  if (!sendStats) {
    return
  }
  let insert = {
    time: data.event.timestamp,
    data: results,
    room: data.room
  }
  let key = util.format('matches:%d:%s', insert.time, insert.room)
  db.put(key, insert)
}

const subscriber = (pattern, channel, message) => {
  let json
  try {
    json = JSON.parse(message)
  } catch (err) {
    // @todo: FIX!
    throw err
  }
  let event = channel.replace(config.namespace + '.', '')

  switch (event) {
    case 'stats':
      handleStats(json)
      break

    case 'newuser_connect':
      handleNewUserConnect(json)
      break

    case 'scores':
      handleScores(json)
      break

    case 'connect':
      handleConnect(json)
      break

    case 'events':
      handleEvents(json)
      break
  }
}
module.exports = subscriber

const util = require('util')
const redis = require('redis')
const cors = require('cors')
const express = require('express')
const ks = require('kill-switch')
const async = require('async')
ks.autoStart()
const app = express()

const config = require('./config')
const db = require('./src/db')
const subscriber = require('./src/subscriber')

let client = redis.createClient()
client.psubscribe(util.format('%s.*', config.namespace))

client.on('pmessage', subscriber)

app.use(cors())

app.get('/high-scores', (req, res) => {
  db.getAll('scores', true, 100000, (err, val) => {
    if (err) throw err
    res.json(val)
  })
})

app.get('/api/iplog', function (req, res) {
  db.getAll('connect', true, 10, (err, val) => {
    if (err) throw err
    // Also find names for all users.
    async.map(val, (d, callback) => {
      db.get(d.user, (err, val) => {
        if (err) {
          val = {
            name: 'Unknown'
          }
        }
        callback(null, val)
      })
    }, (err, results) => {
      if (err) throw err
      val.forEach((n, i) => {
        val[i].name = results[i].name
      })
      res.json(val)
    })
  })
})

app.listen(config.port, function () {
  console.log('Logger listening on port ' + config.port)
})

module.exports = {
  close: () => {
    client.quit()
    db.close()
  }
}

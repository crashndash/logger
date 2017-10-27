const util = require('util')
const redis = require('redis')
const cors = require('cors')
const express = require('express')
const ks = require('kill-switch')
ks.autoStart()
const app = express()

const config = require('./config')
const db = require('./src/db')
const subscriber = require('./src/subscriber')

let client = redis.createClient()
client.psubscribe(util.format('%s.*', config.namespace))

client.on('pmessage', subscriber)

app.use(cors())

app.get('/api/iplog', function (req, res) {
  db.getAll('connect', true, 10, (err, val) => {
    res.json(val)
  })
})

app.listen(3003, function () {
  console.log('Example app listening on port 3000!')
})

module.exports = {
  close: () => {
    client.quit()
    db.close()
  }
}

const util = require('util')
const redis = require('redis')
const cors = require('cors')
const express = require('express')
const ks = require('kill-switch')
const async = require('async')
const auth = require('basic-auth')
ks.autoStart()
const app = express()

const basicWare = (req, res, next) => {
  let credentials = auth(req)

  if (!credentials || credentials.name !== config.adminUser || credentials.pass !== config.adminPass) {
    res.statusCode = 401
    res.setHeader('WWW-Authenticate', 'Basic realm="example"')
    res.end('Access denied')
  } else {
    next()
  }
}

app.use('/api/iplog', basicWare)

const config = require('./config')
const db = require('./src/db')
const subscriber = require('./src/subscriber')

let client = redis.createClient()
client.psubscribe(util.format('%s.*', config.namespace))

client.on('pmessage', subscriber)
const whitelist = ['http://localhost:3001', 'http://localhost:3000', 'https://logger.crashndash.com']
const corsOptions = {
  credentials: true,
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  }
}
app.use(cors(corsOptions))

app.get('/high-scores', (req, res) => {
  db.getAll('scores', true, 100000, (err, val) => {
    if (err) throw err
    res.json(val)
  })
})

app.get('/api/iplog/:offset', function (req, res) {
  let offset = req.params.offset
  var data = []
  db.getDatabase()
  .createReadStream({
    lt: 'connect:' + offset,
    limit: 50,
    keys: false,
    reverse: true
  })
  .on('data', (d) => {
    data.push(d)
  })
  .on('end', () => {
    async.map(data, (d, callback) => {
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
      data.forEach((n, i) => {
        data[i].name = results[i].name
      })
      res.json(data)
    })
  })
})

app.get('/api/iplog', function (req, res) {
  db.getAll('connect', true, 50, (err, val) => {
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

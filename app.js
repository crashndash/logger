const util = require('util')
const redis = require('redis')

const ks = require('kill-switch')
ks.autoStart()

const config = require('./config')
const db = require('./src/db')
const subscriber = require('./src/subscriber')

let client = redis.createClient()
client.psubscribe(util.format('%s.*', config.namespace))

client.on('pmessage', subscriber)

module.exports = {
  close: () => {
    client.quit()
    db.close()
  }
}

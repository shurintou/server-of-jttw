const log4js = require("log4js")
const conf = require('../config/')

log4js.configure(conf.logConf)
const logger = log4js.connectLogger(log4js.getLogger("jttw"), {level: 'error'})

module.exports = logger
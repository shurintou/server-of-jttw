var session = require('express-session')
let RedisStore = require('connect-redis')(session)
let redisClient = require('../database/redis')
const conf = require('../config/')
var sess = conf.session
var redisStore = new RedisStore({ client: redisClient })

sess.store = redisStore
module.exports = {
    session: session(sess),
    store: redisStore,
    sessionHandler: function( req, account){
        req.session.username = account.username
        req.session.userId = account.id
        req.session.nickname = account.nickname
        req.session.sessionID = req.sessionID
    }
}
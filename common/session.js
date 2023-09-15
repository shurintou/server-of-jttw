/* session配置，通过redis来管理玩家session */

var session = require('express-session')
let RedisStore = require('connect-redis')(session)
let redisClient = require('../database/redis')
const conf = require('../config/')
var sess = conf.session
var redisStore = new RedisStore({ client: redisClient })
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/player').SequelizedModelPlayer}
 */

sess.store = redisStore
module.exports = {
    session: session(sess),
    store: redisStore,
    /** 
     * @description 将玩家信息绑定到request会话中。
     * @param {ClientRequest} req
     * @param {SequelizedModelPlayer} account
     */
    sessionHandler: function (req, account) {
        req.session.username = account.username
        req.session.userId = account.id
        req.session.sessionID = req.sessionID
        req.session.ip = req.ip
    }
}
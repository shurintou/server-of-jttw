/* session配置，通过redis来管理玩家session */

const session = require('express-session')
const RedisStore = require('connect-redis')(session)
const { redis } = require('../database/redis')
const conf = require('../config/')
const sess = conf.session
const redisStore = new RedisStore({ client: redis })
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/player').SequelizedModelAccount}
 */

sess.store = redisStore
module.exports = {
    session: session(sess),
    store: redisStore,
    /** 
     * @description 将玩家信息绑定到request会话中。
     * @param {ClientRequest} req
     * @param {SequelizedModelAccount} account
     */
    sessionHandler: function (req, account) {
        req.session.username = account.username
        req.session.userId = account.id
        req.session.sessionID = req.sessionID
        req.session.ip = req.ip
    }
}
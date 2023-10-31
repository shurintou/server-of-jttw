/* session配置，通过redis来管理玩家session */
module.exports = (async function () {
    const session = require('express-session')
    const RedisStore = require("connect-redis").default
    const redisClient = await require('../database/redis')
    const conf = require('../config/')
    const sess = conf.session
    const redisStore = new RedisStore({ client: redisClient })
    /** 
     * @typedef {import('../types/http').ClientRequest}
     * @typedef {import('../types/player').SequelizedModelAccount}
     */

    sess.store = redisStore
    return {
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
})()
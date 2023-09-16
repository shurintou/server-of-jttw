const sequelize = require('../database/mysql').sequelize
const redis = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')
const logoutHandler = require('../websocket/logoutHandler')
const wss = require('../websocket/')
const logger = require('../common/log')


module.exports = {
    login: async function (req) {
        try {
            const Account = sequelize.models.account
            var accounts = await Account.findAll({ where: { username: req.body.username } })
            if (accounts.length === 0) {
                return Promise.resolve(errors.USERNAME_NOT_FOUND)
            }
            else {
                if (accounts[0].password === req.body.password) {
                    /* store.all是回调函数形式的异步，所以用Promise包裹一层使得其能够同步执行 */
                    return await storeWrapper(req, accounts[0])
                }
                else {
                    return Promise.resolve(errors.WRONG_PASSWORD)
                }
            }
        }
        catch (e) {
            logger.error(e)
            return Promise.reject({ message: e })
        }
    },

    logout: function (req) { logoutHandler(wss, req) }
}

function storeWrapper(req, account) {
    return new Promise((resolve, reject) => {
        /* 通过验证能够登录，但须确认有没有重复session */
        redis.keys(conf.redisCache.sessionPrefix + '*', function (err, list) {
            if (err) { return reject({ message: err }) }
            if (list.length === 0) { return resolve({ code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } }) }
            redis.mget(list, function (err, res) {
                if (err) { return reject({ message: err }) }
                let sessions = []
                let sessionIp = ''
                res.forEach(item => { sessions.push(JSON.parse(item)) })
                var hasLogin = false //是否有重复登录
                var sessionId = ''  //已经登录的sessionID
                for (var i = 0; i < sessions.length; i++) {
                    if (sessions[i].username === req.body.username) {
                        sessionId = conf.redisCache.sessionPrefix + sessions[i].sessionID
                        sessionIp = sessions[i].ip
                        hasLogin = true
                        break
                    }
                }
                if (hasLogin) {
                    /* 如果有重复登录，则获取已经登录session的ttl */
                    redis.ttl(sessionId, function (err, res) {
                        if (err) { return logger.error('error redis response - ' + err) }
                        /* 如果已经登录的session的ttl少于挤号判定时间，则删除该session，让另一边登录 */
                        if (res < conf.ws.forceLogoutTtl || req.ip === sessionIp) {
                            redis.del(sessionId, function (err) {
                                if (err) { return logger.error('error redis response - ' + err) }
                                return resolve({ code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } })
                            })
                        }
                        /* 如果大于挤号判定时间，则将该session的ttl设置为挤号判定时间 */
                        else {
                            redis.expire(sessionId, conf.ws.forceLogoutTtl, function (err) {
                                if (err) { return logger.error('error redis response - ' + err) }
                                return resolve(errors.DUBLICATE_ACCESS)
                            })
                        }
                    })
                }
                /* 没有重复登录，则无须判断，直接登录成功 */
                else {
                    return resolve({ code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } })
                }
            })
        })
    })
}
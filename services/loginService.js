const conf = require('../config/')
const errors = require('../common/errors')
const logoutHandler = require('../websocket/logoutHandler')
const wss = require('../websocket/')
const logger = require('../common/log')
const Account = require('../models/account')
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/http').RegisterRequestBody}
 * @typedef {import('../types/player').SequelizedModelAccount}
 * @typedef {import('../types/websocket').RedisCacheWebsocketInfo}
 */

module.exports = {
    /** @type {(req: ClientRequest) => Promise<{code:number, message:string, account?: {id: number, username: string, avatar_id: number, nickname: string}}>} */
    login: async function (req) {
        const redis = await require('../database/redis')
        try {
            /** @type {RegisterRequestBody} */
            const body = req.body
            /** @type {SequelizedModelAccount[]} */
            const accounts = await Account.findAll({ where: { username: body.username } })
            if (accounts.length === 0) {
                return errors.USERNAME_NOT_FOUND
            }
            else {
                if (accounts[0].password === body.password) {
                    return await getSession(req, accounts[0])
                }
                else {
                    return errors.WRONG_PASSWORD
                }
            }
        }
        catch (e) {
            logger.error(e)
            throw new Error({ message: e })
        }
    },

    /** @type {(req: ClientRequest) => Promise<void>} */
    logout: async function (req) { await logoutHandler(wss, req) }
}

/** 
 * @param {ClientRequest} req
 * @param {SequelizedModelAccount} account
 * @returns {Promise<{code:number, message:string, account?: {id: number, username: string, avatar_id: number, nickname: string}}>}
 */
async function getSession(req, account) {
    const redis = await require('../database/redis')
    try {
        /* 通过验证能够登录，但须确认有没有重复session */
        const list = await redis.keys(conf.redisCache.sessionPrefix + '*')
        if (list.length === 0) {
            return { code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } }
        }
        const sessionRes = await redis.mGet(list)
        /** @type {RegisterRequestBody} */
        const body = req.body
        /** @type {RedisCacheWebsocketInfo[]} */
        let sessions = []
        let sessionIp = ''
        sessionRes.forEach(item => { sessions.push(JSON.parse(item)) })
        let hasLogin = false //是否有重复登录
        let sessionId = ''  //已经登录的sessionID
        for (let i = 0; i < sessions.length; i++) {
            if (sessions[i].username === body.username) {
                sessionId = conf.redisCache.sessionPrefix + sessions[i].sessionID
                sessionIp = sessions[i].ip
                hasLogin = true
                break
            }
        }
        if (hasLogin) {
            /* 如果有重复登录，则获取已经登录session的ttl */
            const ttlRes = await redis.ttl(sessionId)
            /* 如果已经登录的session的ttl少于挤号判定时间，则删除该session，让另一边登录 */
            if (ttlRes < conf.ws.forceLogoutTtl || req.ip === sessionIp) {
                await redis.del(sessionId)
                return { code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } }
            }
            /* 如果大于挤号判定时间，则将该session的ttl设置为挤号判定时间 */
            else {
                await redis.expire(sessionId, conf.ws.forceLogoutTtl)
                return errors.DUBLICATE_ACCESS
            }
        }
        /* 没有重复登录，则无须判断，直接登录成功 */
        else {
            return { code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } }
        }
    }
    catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}
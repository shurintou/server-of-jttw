const conf = require('../config/')
const { asyncKeys, asyncMget, asyncTtl, asyncExpire, asyncDel } = require('../database/redis')
const errors = require('../common/errors')
const logoutHandler = require('../websocket/logoutHandler')
const wss = require('../websocket/')
const logger = require('../common/log')
const Account = require('../models/account')
const { getHash, compare } = require('../common/bcrypt')
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/http').RegisterRequestBody}
 * @typedef {import('../types/player').SequelizedModelAccount}
 * @typedef {import('../types/websocket').RedisCacheWebsocketInfo}
 */

module.exports = {
    /** @type {(req: ClientRequest) => Promise<{code:number, message:string, account?: {id: number, username: string, avatar_id: number, nickname: string}}>} */
    login: async function (req) {
        try {
            /** @type {RegisterRequestBody} */
            const body = req.body
            /** @type {SequelizedModelAccount[]} */
            const accounts = await Account.findAll({ where: { username: body.username } })
            if (accounts.length === 0) {
                return errors.USERNAME_NOT_FOUND
            }
            if (compare(body.password, accounts[0].password)) {
                return await getSession(req, accounts[0])
            }
            return errors.WRONG_PASSWORD
        } catch (e) {
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
    try {
        /* 通过验证能够登录，但须确认有没有重复session */
        const list = await asyncKeys(conf.redisCache.sessionPrefix + '*')
        if (list.length === 0) {
            return { code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } }
        }
        const sessionRes = await asyncMget(list)
        /** @type {RegisterRequestBody} */
        const body = req.body
        /** @type {RedisCacheWebsocketInfo[]} */
        const sessions = []
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
            const ttlRes = await asyncTtl(sessionId)
            /* 如果已经登录的session的ttl少于挤号判定时间，则删除该session，让另一边登录 */
            if (ttlRes < conf.ws.forceLogoutTtl || req.ip === sessionIp) {
                await asyncDel(sessionId)
                return { code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } }
            }
            /* 如果大于挤号判定时间，则将该session的ttl设置为挤号判定时间 */
            await asyncExpire(sessionId, conf.ws.forceLogoutTtl)
            return errors.DUBLICATE_ACCESS
        }
        /* 没有重复登录，则无须判断，直接登录成功 */
        return { code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } }
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}
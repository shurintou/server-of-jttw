const Account = require('../models/account')
const { asyncGet } = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')
const logger = require('../common/log')
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/player').SequelizedModelAccount}
 */

module.exports = {
    /** @type {(req: ClientRequest) => Promise<{code:number, message:string, account?: {id: number, username: string, avatar_id: number, nickname: string}}>} */
    authorization: async function (req) {
        try {
            const session = await asyncGet(conf.redisCache.sessionPrefix + req.sessionID)
            if (session === null) {
                return errors.SESSION_TIMEOUT
            }
            /** @type {SequelizedModelAccount[]} */
            const accounts = await Account.findAll({ where: { id: req.session.userId } })
            const account = accounts[0]
            return {
                code: 200,
                message: '',
                account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname }
            }
        } catch (e) {
            logger.error(e)
            throw new Error({ message: e })
        }
    }
}

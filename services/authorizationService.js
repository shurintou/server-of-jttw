const sequelize = require('../database/mysql').sequelize
const redis = require('../database/redis')
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
            var checkResult = await storeWrapper(req)
            if (checkResult.result) {
                return Promise.resolve(errors.SESSION_TIMEOUT)
            }
            else {
                const Account = sequelize.models.account
                /** @type {SequelizedModelAccount[]} */
                var accounts = await Account.findAll({ where: { id: req.session.userId } })
                var account = accounts[0]
                return Promise.resolve({ code: 200, message: '', account: { id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname } })
            }
        }
        catch (e) {
            logger.error(e)
            return Promise.reject({ message: e })
        }
    }
}

/** 
 * @param {ClientRequest} req
 * @returns {{result:boolean}} 检查结果，TRUE为Redis中不存在session信息，FALSE为存在。
 */
function storeWrapper(req) {
    return new Promise((resolve, reject) => {
        redis.get(conf.redisCache.sessionPrefix + req.sessionID, function (error, session) {
            if (error) return reject({ message: error })
            if (!session) {
                return resolve({ result: true })
            }
            else {
                return resolve({ result: false })
            }
        })
    })
}
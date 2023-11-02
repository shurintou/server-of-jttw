const Account = require('../models/account')
const logger = require('../common/log')
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/http').ModifyRequestBody}
 * @typedef {import('../types/player').SequelizedModelAccount}
 */

module.exports = {
    /** @type {(req: ClientRequest) => Promise<{code:number, message:string}> */
    modifyAvatar: async function (req) {
        try {
            /** @type {SequelizedModelAccount[]} */
            const accounts = await Account.findAll({ where: { id: req.session.userId } })
            /** @type {ModifyRequestBody} */
            const body = req.body
            accounts[0].avatar_id = body.avatar_id
            await accounts[0].save()
            return { code: 200, message: '' }
        } catch (e) {
            logger.error(e)
            throw new Error({ message: e })
        }
    },

    modifyNickname: async function (req) {
        try {
            /** @type {SequelizedModelAccount[]} */
            const accounts = await Account.findAll({ where: { id: req.session.userId } })
            /** @type {ModifyRequestBody} */
            const body = req.body
            accounts[0].nickname = body.nickname
            await accounts[0].save()
            return { code: 200, message: '' }
        } catch (e) {
            logger.error(e)
            throw new Error({ message: e })
        }
    },
}
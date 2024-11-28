const sequelize = require('../database/mysql').sequelize
const Account = require('../models/account')
const Record = require('../models/record')
const InvitationCode = require('../models/invitationCode')
const errors = require('../common/errors')
const logger = require('../common/log')
const { getHash } = require('../common/bcrypt')
/** 
 * @typedef {import('../types/http').RegisterRequestBody}
 * @typedef {import('../types/player').SequelizedModelInvitationCode}
 * @typedef {import('../types/player').SequelizedModelAccount}
 */

module.exports = {
    /** @type {(req: RegisterRequestBody) => Promise<{code:number, message:string}>} */
    register: async function (data) {
        const t = await sequelize.transaction()
        try {
            /** @type {SequelizedModelInvitationCode[]} */
            const invitationCodes = await InvitationCode.findAll({ where: { invitation_code: data.invitationCode } })
            if (invitationCodes.length === 0) {
                return errors.INVITATIONCODE_NOT_FOUND
            }
            else if (invitationCodes[0].is_used) {
                return errors.INVITATIONCODE_USED
            }
            else {
                /** @type {SequelizedModelAccount[]} */
                const accounts = await Account.findAll({ where: { username: data.username } })
                if (accounts.length === 0) {
                    /** @type {SequelizedModelAccount} */
                    const newAccount = await Account.create({ username: data.username, password: getHash(data.password) }, { transaction: t })
                    await Record.create({ accountId: newAccount.id }, { transaction: t })
                    invitationCodes[0].is_used = true
                    invitationCodes[0].player_id = newAccount.id
                    await invitationCodes[0].save({ transaction: t })
                    await t.commit()
                    return { code: 200, message: '' }
                }
                return errors.USERNAME_USED
            }
        } catch (e) {
            await t.rollback()
            logger.error(e)
            throw new Error({ message: e })
        }
    }
}

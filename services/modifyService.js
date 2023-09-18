const Account = require('../models/account')
const logger = require('../common/log')

module.exports = {
    modifyAvatar: async function (req) {
        try {
            const accounts = await Account.findAll({ where: { id: req.session.userId } })
            accounts[0].avatar_id = req.body.avatar_id
            await accounts[0].save()
            return Promise.resolve({ code: 200, message: '' })
        }
        catch (e) {
            logger.error(e)
            return Promise.reject({ message: e })
        }
    },

    modifyNickname: async function (req) {
        try {
            const accounts = await Account.findAll({ where: { id: req.session.userId } })
            accounts[0].nickname = req.body.nickname
            await accounts[0].save()
            return Promise.resolve({ code: 200, message: '' })
        }
        catch (e) {
            logger.error(e)
            return Promise.reject({ message: e })
        }
    },
}
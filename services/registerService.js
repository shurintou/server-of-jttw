const models = require('../common/models')
const errors = require('../common/errors')
const sequelize = require('../database/mysql').sequelize

module.exports = {
    register: async function(data){
        const t = await sequelize.transaction()
        try{
            const InvitationCode = models.invitationCode
            const Account = models.account
            var invitationCodes = await InvitationCode.findAll({where: {invitation_code: data.invitationCode}})
            if(invitationCodes.length === 0){
                return Promise.resolve(errors.INVITATIONCODE_NOT_FOUND)
            }
            else if(invitationCodes[0].is_used){
                return Promise.resolve(errors.INVITATIONCODE_USED)
            }
            else{
                var accounts = await Account.findAll({where:{username : data.username}})
                if(accounts.length === 0){
                    const Record = models.record
                    var newAccount = await Account.create({username: data.username, password: data.password}, { transaction: t })
                    await Record.create({accountId: newAccount.id}, { transaction: t })
                    invitationCodes[0].is_used = true
                    invitationCodes[0].player_id = newAccount.id
                    await invitationCodes[0].save({ transaction: t })
                    await t.commit()
                    return Promise.resolve({code: 200 , message: ''})
                }
                else{
                    return Promise.resolve(errors.USERNAME_USED)
                }
            }
        }
        catch(e){
            await t.rollback()
            return Promise.reject({message: e})
        }
       
    }
}

const models = require('../common/models')

module.exports = {
    modifyAvatar: async function(req){
        try{
            const Account = models.account
            var accounts = await Account.findAll({where:{id : req.session.userId}})
            accounts[0].avatar_id = req.body.avatar_id
            await accounts[0].save()
            return Promise.resolve({code:200 , message: ''})
        }
        catch(e){
            return Promise.reject({message: e})
        }
    },

    logout: function(req){store.destroy(req.sessionID, function(){})}
}
const models = require('../common/models')
const store = require('../common/session').store
const errors = require('../common/errors')

module.exports = {
    authorization: async function(req){
        try{
            if(await storeWrapper(req).result){
                return Promise.resolve(errors.SESSION_TIMEOUT)
            }
            else{
                const Account = models.account
                var accounts = await Account.findAll({where:{id : req.session.userId}})
                var account = accounts[0]
                return Promise.resolve({code: 200, message: '', account: {id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname }})
            }
        }
        catch(e){
            return Promise.reject({message: e})
        }
    }
}

function storeWrapper(req){
    return new Promise((resolve, reject) => {
        store.get(req.sessionID, function(error, session){
            if(!session || error){
                return reject({result: true})
            }
            else{
                return resolve({result: false})
            } 
        })
    })  
}
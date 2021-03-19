const models = require('../common/models')
const redis = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')

module.exports = {
    authorization: async function(req){
        try{
            var checkResult = await storeWrapper(req)
            if(checkResult.result){
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
        redis.get(conf.redisCache.sessionPrefix + req.sessionID, function(error, session){
            if(error)return reject({message: error})
            if(!session){
                return resolve({result: true})
            }
            else{
                return resolve({result: false})
            } 
        })
    })  
}
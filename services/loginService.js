const models = require('../common/models')
const store = require('../common/session').store
const redis = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')


module.exports = {
    login: async function(req){
        try{
            const Account = models.account
            var accounts = await Account.findAll({where:{username : req.body.username}})
            if(accounts.length === 0){
                return Promise.resolve(errors.USERNAME_NOT_FOUND)
            }
            else{
                if(accounts[0].password === req.body.password){
                    /* store.all是回调函数形式的异步，所以用Promise包裹一层使得其能够同步执行 */
                    return await storeWrapper(req, accounts[0])
                }
                else{
                    return Promise.resolve(errors.WRONG_PASSWORD)
                }
            }
        }
        catch(e){
            return Promise.reject({message: e})
        }
    },

    logout: function(req){store.destroy(req.sessionID, function(){})}
}

function storeWrapper(req, account){
    return new Promise((resolve, reject) => {
        /* 通过验证能够登录，但须确认有没有重复session */
        store.all(function(err, sessions){
            if(err){
                return reject({message: err})
            }
            else{
               var times = 0
               for(var i = 0; i < sessions.length; i++){
                    if(sessions[i].username === req.body.username){
                        var sessionId = 'sess:' + sessions[i].sessionID
                        redis.ttl(sessionId, function(err , res){
                            if(res < conf.ws.deadTtl){
                                redis.del(sessionId)
                            }
                            else{
                                redis.expire(sessionId , conf.ws.deadTtl + 1 )
                            }
                        }) 
                        times = times + 1
                    }
               }
               if(times > 0){
                 return resolve(errors.DUBLICATE_ACCESS)
               }
               else{
                 return resolve({code: 200, message: '', account: {id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname }})
               }
            }
        })
    })
}
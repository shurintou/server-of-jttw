const models = require('../common/models')
const store = require('../common/session').store

module.exports = {
    authorization: async function(req){
        try{
            if(await storeWrapper(req).result){
                return Promise.resolve({code: 401, message: '账号信息已过期，请重新登录'})
            }
            else{
                const Account = models.account
                var accounts = await Account.findAll({where:{id : req.session.userId}})
                var account = accounts[0]
                return Promise.resolve({code: 200, message: '登录成功', account: {id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname }})
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
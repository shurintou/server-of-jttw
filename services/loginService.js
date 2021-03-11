const models = require('../common/models')
const store = require('../common/session').store

module.exports = {
    login: async function(req){
        try{
            const Account = models.account
            var accounts = await Account.findAll({where:{username : req.body.username}})
            if(accounts.length === 0){
                return Promise.resolve({code: 406, message: '用户名不存在，请重新输入'})
            }
            else{
                if(accounts[0].password === req.body.password){
                    /* store.all是回调函数形式的异步，所以用Promise包裹一层使得其能够同步执行 */
                    return await storeWrapper(req, accounts[0])
                }
                else{
                    return Promise.resolve({code: 406, message: '密码不正确，请重新输入'})
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
                        times = times + 1 
                    }
               }
               if(times > 0){
                 return resolve({code: 409, message: '请勿重复登录'})
               }
               else{
                 return resolve({code: 200, message: '登录成功', account: {id: account.id, username: account.username, avatar_id: account.avatar_id, nickname: account.nickname }})
               }
            }
        })
    })
}
const models = require('../common/models')


module.exports = {
    login: async function(data){
        try{
            const Account = models.account
            var accounts = await Account.findAll({where:{username : data.username}})
            if(accounts.length === 0){
                return Promise.resolve({code: 406, message: '用户名不存在，请重新输入'})
            }
            else{
                if(accounts[0].password === data.password){
                   return Promise.resolve({code: 200, message: ''})
                }
                else{
                    return Promise.resolve({code: 406, message: '密码不正确，请重新输入'})
                }
            }
        }
        catch(e){
            return Promise.reject({message: e})
        }
    }
}
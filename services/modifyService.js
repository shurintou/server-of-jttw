const WebSocket = require('ws');
const models = require('../common/models')
const wss = require('../websocket/')

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

    modifyNickname: async function(req){
        try{
            const Account = models.account
            var accounts = await Account.findAll({where:{id : req.session.userId}})
            accounts[0].nickname = req.body.nickname
            await accounts[0].save()
            req.session.nickname = req.body.nickname
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN && client.userId === req.session.userId) {
                    client.nickname = req.body.nickname
                }
            });
            return Promise.resolve({code:200 , message: ''})
        }
        catch(e){
            return Promise.reject({message: e})
        }
    },
}
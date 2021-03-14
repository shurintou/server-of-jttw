const WebSocket = require('ws');
const redis = require('../database/redis')

module.exports =  function(data, wss, req){
        wss.clients.forEach(function each(client) {
            redis.get('player:' + req.session.userId, function(err, res){
                if (err) {return console.error('error redis response - ' + err)}
                /* 与聊天信息的发送源玩家处于同一房间位置，或者就是发送源玩家本人的话，即可接收聊天信息 */
                if ((data.player_loc === JSON.parse(res).player_loc || req.session.username === client.username ) && client.readyState === WebSocket.OPEN){
                    client.send(JSON.stringify(data));
                }
            })
        });
    }

  
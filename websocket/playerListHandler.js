const redis = require('../database/redis')
const WebSocket = require('ws');
const conf = require('../config/')

module.exports = function(data ,wss, req){
    /* 1，检查该key是否存在，不存在则是新上线，否则是刷新信息 */
    redis.exists(conf.redisCache.playerPrefix + req.session.userId, function(err, res){
        if (err) {return console.error('error redis response - ' + err)}
        if(res === 0){
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN && client.username !== req.session.username) {
                    client.send(JSON.stringify({type: 'system', player_loc: 0 , text: '玩家 ' + data.nickname + ' 上线了'}))
                }
            })
        }
        /* 2，设置玩家最新信息，覆盖掉旧信息 */
        redis.set(conf.redisCache.playerPrefix + req.session.userId,
        JSON.stringify({
            id: req.session.userId,
            username: req.session.username,
            nickname: data.nickname,
            player_loc: data.player_loc,
            player_status: data.player_status,
            avatar_id : data.avatar_id
        }), 
        function(err){
            if (err) {return console.error('error redis response - ' + err)}
            /* 3，获取所有player玩家，发送广播 */
            redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                if (err) {return console.error('error redis response - ' + err)}
                if (list.length > 0){
                    redis.mget(list, function(err, playerList){
                        if (err) {return console.error('error redis response - ' + err)}
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({type: 'playerList', data: playerList}));
                            }
                        })
                    })
                }
            })
        })
    })
}
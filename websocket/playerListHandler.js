const redis = require('../database/redis')
const WebSocket = require('ws')
const conf = require('../config/')

module.exports = function(data ,wss, req, ws){
    if(data.action && data.action === 'get'){
        console.log('get123123123')
        redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
            if (err) {return console.error('error redis response - ' + err)}
            if (list.length > 0){
                redis.mget(list, function(err, playerList){
                    if (err) {return console.error('error redis response - ' + err)}
                    ws.send(JSON.stringify({type: 'playerList', data: playerList}))
                })
            }
        })
    }
    else{
        /* 1，设置玩家最新信息，覆盖掉旧信息 */
        redis.getset(conf.redisCache.playerPrefix + req.session.userId,
        JSON.stringify({
            id: req.session.userId,
            username: req.session.username,
            nickname: data.nickname,
            player_loc: data.player_loc,
            player_status: data.player_status,
            avatar_id : data.avatar_id
        }), 
        function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
                /* 2，检查该key是否存在，不存在则是新上线，否则是刷新信息 */
            if(res === null){
                wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN && client.username !== req.session.username) {
                        client.send(JSON.stringify({type: 'system', player_loc: 0 , text: '玩家 ' + data.nickname + ' 上线了'}))
                    }
                })
            }
            /* 对比新旧信息 */
            else{
                var oldPlayer = JSON.parse(res)
                if(data.player_loc !== oldPlayer.player_loc){
                    if(data.player_loc > 0){
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN && client.userId !== req.session.userId) {
                                client.send(JSON.stringify({type: 'system', player_loc: data.player_loc , text: '玩家 ' + data.nickname + ' 进入了房间'}))
                            }
                        })
                    }
                    else{
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN && client.userId !== req.session.userId) {
                                client.send(JSON.stringify({type: 'system', player_loc: oldPlayer.player_loc , text: '玩家 ' + data.nickname + ' 离开了房间'}))
                            }
                        })
                    }
                }
            }
            /* 3，获取所有player玩家，发送广播 */
            redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                if (err) {return console.error('error redis response - ' + err)}
                if (list.length > 0){
                    redis.mget(list, function(err, playerList){
                        if (err) {return console.error('error redis response - ' + err)}
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({type: 'playerList', data: playerList}))
                            }
                        })
                    })
                }
            })
        })
    }
}
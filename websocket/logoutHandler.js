const redis = require('../database/redis')
const store = require('../common/session').store
const WebSocket = require('ws');

module.exports= function(wss){
    /* 1，获取redis中playerList列表 */
    redis.smembers('playerList', function(err, list){
        if (err) {return console.error('error redis response - ' + err)}
        var livePlayer = []
        var removePlayer = []
        /* 2，获取redis中sess:命名空间下失活的session */
        store.all( function(err, sessions){
            if (err) {return console.error('error redis response - ' + err)}
            sessions.forEach( session => {
                livePlayer.push('player:' + session.userId)
            })
            list.forEach( item => {
                var isLive = false
                for(let i=0 ; i < livePlayer.length; i++ ){
                    if(item === livePlayer[i]){
                        isLive = true
                        break
                    }
                }
                if(!isLive){
                    redis.get(item, function(err, res){
                        if (err) {return console.error('error redis response - ' + err)}
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({type: 'system', player_loc: 0 , text: '玩家 ' + JSON.parse(res).nickname + ' 下线了'}))
                                if(res.player_loc > 0){
                                    client.send(JSON.stringify({type: 'system', player_loc: res.player_loc , text: '玩家 ' + JSON.parse(res).nickname + ' 退出了房间'}))
                                }
                            }
                        });
                        redis.del(item)
                    })
                    /* 3，把1和2的结果对比，获取playerList中应该删除的玩家 */
                    removePlayer.push(item)
                }
            })
            /* 4，删除player */
            redis.srem('playerList', removePlayer, function(){
                redis.smembers('playerList', 
                function(err, list){
                    if (err) {return console.error('error redis response - ' + err)}
                    if (list.length > 0){
                        redis.mget(list, function(err, playerList){
                            if (err) {return console.error('error redis response - ' + err)}
                            /* 5，广播 */
                            wss.clients.forEach(function each(client) {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({type: 'playerList', data: playerList}));
                                }
                            });
                        })
                    }
                })
            })
        })
    })
    
}
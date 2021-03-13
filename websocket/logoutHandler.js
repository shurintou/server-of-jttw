const redis = require('../database/redis')
const store = require('../common/session').store
const WebSocket = require('ws');

module.exports= function(wss){
    /* 1，获取redis中playerList列表 */
    redis.smembers('playerList', function(err, list){
        if (err) {return console.error('error redis response - ' + err)}
        var livePlayer = []
        var removePlayer = []
        /* 2，获取redis中失活的session */
        store.all( function(err, sessions){
            if (err) {return console.error('error redis response - ' + err)}
            sessions.forEach( session => {
                livePlayer.push('player' + session.userId)
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
                    removePlayer.push(item)
                }
            })
            /* 3，对应删除失活session的player */
            redis.srem('playerList', removePlayer, function(){
                redis.smembers('playerList', 
                function(err, list){
                    if (err) {return console.error('error redis response - ' + err)}
                    redis.mget(list, function(err, playerList){
                        if (err) {return console.error('error redis response - ' + err)}
                        /* 4，广播 */
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({type: 'playerList', data: playerList}));
                            }
                        });
                    })
                })
            })
        })
    })
    
}
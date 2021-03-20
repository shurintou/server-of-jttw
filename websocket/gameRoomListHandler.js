const redis = require('../database/redis')
const WebSocket = require('ws');
const conf = require('../config/')

module.exports = function(data ,wss, ws){
    /* id是0则直接获取现在的游戏房间列表 */
    if(data.id === 0){
        redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
            if (err) {return console.error('error redis response - ' + err)}
            if(list.length === 0){ 
                ws.send(JSON.stringify({type: 'gameRoomList', data: [] }));
                return 
            }
            redis.mget(list, function(err, gameRoomList){
                if (err) {return console.error('error redis response - ' + err)}
                ws.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}));
            })
        })
    }
    /* id位NaN是新建的房间，需要分配一个id */
    else if(data.id === null || data.id === NaN){
        redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
            if (err) {return console.error('error redis response - ' + err)}
            var idOfList = []
            list.forEach( item => { idOfList.push(parseInt(item.split(conf.redisCache.gameRoomPrefix)[1]))})
            idOfList.sort()
            /* 分配的房间号 */
            var freeIndex = 0
            for(var i = 0; i < idOfList.length; i++){
                if( idOfList[i] !== i + 1 ){
                    freeIndex = i + 1
                    break
                }
            }
            if(freeIndex === 0){ freeIndex = idOfList.length + 1 }
            redis.set(conf.redisCache.gameRoomPrefix + freeIndex, JSON.stringify({
            id: freeIndex,
            name: data.name,
            status: data.status,
            needPassword: data.needPassword,
            password: data.password,
            cardNum: data.cardNum,
            owner: data.owner,
            playerList: data.playerList
            }), 
            function(err){
                if (err) {return console.error('error redis response - ' + err)}
                list.push(conf.redisCache.gameRoomPrefix + freeIndex)
                redis.mget(list, function(err, gameRoomList){
                    if (err) {return console.error('error redis response - ' + err)}
                    wss.clients.forEach(function each(client) {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}));
                        }
                    });
                })
            })
        })        
    }
    else if(data.id < 0){
        /* 小于0，某玩家离开了房间 */
        redis.get(conf.redisCache.gameRoomPrefix + (-1 * data.id), function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
            var room = JSON.parse(res)
            /* 过滤掉离开的玩家 */
            var newPlayerList = room.playerList.filter( player => player.id !==  ws.userId)
            /* 如果还有玩家在房间中则保留房间并广播 */
            if(newPlayerList.length > 0){
                room.playerList = newPlayerList
                redis.set(conf.redisCache.gameRoomPrefix + (-1 * data.id), JSON.stringify(room), function(err){
                    if (err) {return console.error('error redis response - ' + err)}
                    redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
                        if (err) {return console.error('error redis response - ' + err)}
                        if(list.length === 0){ 
                            wss.clients.forEach(function each(client) {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({type: 'gameRoomList', data: [] }));
                                }
                            })
                            return
                        }
                        redis.mget(list, function(err, gameRoomList){
                            if (err) {return console.error('error redis response - ' + err)}
                            wss.clients.forEach(function each(client) {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}));
                                }
                            });
                        })
                    })
                })
            }
            /* 否则删除房间并广播 */
            else{
                redis.del(conf.redisCache.gameRoomPrefix + (-1 * data.id), function(err){
                    if (err) {return console.error('error redis response - ' + err)}
                    redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
                        if (err) {return console.error('error redis response - ' + err)}
                        if(list.length === 0){ 
                            wss.clients.forEach(function each(client) {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({type: 'gameRoomList', data: [] }));
                                }
                            })
                            return
                        }
                        redis.mget(list, function(err, gameRoomList){
                            if (err) {return console.error('error redis response - ' + err)}
                            wss.clients.forEach(function each(client) {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}));
                                }
                            });
                        })
                    })
                })
            }
        })
    }
    
}
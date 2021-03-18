const redis = require('../database/redis')
const WebSocket = require('ws');
const conf = require('../config/')

module.exports = function(data ,wss, ws){
    /* id是-1则直接获取现在的游戏房间列表 */
    if(data.id === -1){
        redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
            if (err) {return console.error('error redis response - ' + err)}
            if(list.length === 0){ return }
            redis.mget(list, function(err, gameRoomList){
                if (err) {return console.error('error redis response - ' + err)}
                ws.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}));
            })
        })
    }
    /* id位0是新建的房间，需要分配一个id */
    else if(data.id === 0){
        redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
            if (err) {return console.error('error redis response - ' + err)}
            var idOfList = []
            list.forEach( item => { idOfList.push(parseInt(item.split(conf.redisCache.gameRoomPrefix)[1]))})
            idOfList.sort()
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
    
}
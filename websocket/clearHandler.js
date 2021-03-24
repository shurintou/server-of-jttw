const store = require('../common/session').store
const conf = require('../config/')
const redis = require('../database/redis')
const logoutHandler = require('./logoutHandler')
const WebSocket = require('ws');

/* 定期清除失活的连接，session，player */  
module.exports =  function(wss){setInterval(function checkConnections() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false){
            ws.terminate()
            logoutHandler(wss, ws)
        }
        ws.isAlive = false;
    }) 
    store.all( function(err, sessions){
        if (err) {return console.error('error redis response - ' + err)}
        for(let i = 0; i < sessions.length; i++){
            redis.ttl(conf.redisCache.sessionPrefix + sessions[i].sessionID, function(err, res){
              if (err) {return console.error('error redis response - ' + err)}
              if( res < conf.ws.deadTtl ){logoutHandler(wss, sessions[i])}
            })
        }
    }) 
    store.all( function(err, sessions){
        if (err) {return console.error('error redis response - ' + err)}
        let stillAlivePlayerIdList = []
        for(let i = 0; i < sessions.length; i++){
            stillAlivePlayerIdList.push( sessions[i].userId )
        }
          /* 清理房间 */
        redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
            if (err) {return console.error('error redis response - ' + err)}
            if(list.length === 0){ 
                return 
            }
            redis.mget(list, function(err, gameRoomList){
                if (err) {return console.error('error redis response - ' + err)}
                gameRoomList.forEach( item => {
                    let gameRoom = JSON.parse(item)
                    if(gameRoom.status === 1){ return } //房间正在游戏中，不清理
                    let stillHasPlayer = false
                    /* 对房间每个位置进行检查 */
                    for(let i = 0; i < Object.keys(gameRoom.playerList).length; i++){
                        if(gameRoom.playerList[i].id !== 0){
                            /* 该位置玩家还有session则还存在玩家 */
                            if(stillAlivePlayerIdList.indexOf(gameRoom.playerList[i].id) !== -1){
                                stillHasPlayer = true
                            }
                            /* 该位置玩家没有session则把该位置清空 */
                            else{
                                gameRoom.playerList[i] = {id: 0, cards: 0, win: 0, loss: 0, ready: false}
                            }
                        }
                    }
                    /* 房间还有玩家，则不删除房间 */
                    if(stillHasPlayer){
                        /* 如果房主不在房间了则换房主 */
                        if(stillAlivePlayerIdList.indexOf(gameRoom.owner) === -1){
                            gameRoom.owner = stillAlivePlayerIdList[0]
                        }
                        redis.set(conf.redisCache.gameRoomPrefix + gameRoom.id, JSON.stringify(gameRoom), function(err){
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
                        return
                    }
                    /* 否则删除房间 */
                    redis.del(conf.redisCache.gameRoomPrefix + gameRoom.id, function(err){
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
                })
            })
        })
    }) 
}, conf.ws.checkPeriod)}
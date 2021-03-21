const store = require('../common/session').store
const conf = require('../config/')
const redis = require('../database/redis')
const logoutHandler = require('./logoutHandler')

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
                    let stillHasPlayer = false
                    for(let i = 0; i < Object.keys(gameRoom.playerList).length; i++){
                        if(gameRoom.playerList[i].id !== 0){
                            if(stillAlivePlayerIdList.indexOf(gameRoom.playerList[i].id) !== -1){
                                stillHasPlayer = true
                                break
                            }
                        }
                    }
                    if(stillHasPlayer){
                       return
                    }
                    redis.del(conf.redisCache.gameRoomPrefix + gameRoom.id, function(err){
                        if (err) {return console.error('error redis response - ' + err)}
                    })
                })
            })
        })
    }) 
}, conf.ws.checkPeriod)}
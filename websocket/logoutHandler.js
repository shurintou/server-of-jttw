const redis = require('../database/redis')
const WebSocket = require('ws')
const conf = require('../config/')
const logger = require('../common/log')

module.exports= function(wss, data){
    var userId = data.session ? data.session.userId: data.userId
    redis.get(conf.redisCache.playerPrefix + userId, function(err, res){
        if (err) {return logger.error('error redis response - ' + err)}
        if(res === null){ return logger.error(conf.redisCache.playerPrefix + userId + errors.CACHE_DOES_NOT_EXIST)}
        redis.del(conf.redisCache.sessionPrefix + data.sessionID, function(err){
            if (err) {return logger.error('error redis response - ' + err)}
            redis.del(conf.redisCache.playerPrefix + userId, function(err){
                if (err) {return logger.error('error redis response - ' + err)}
                redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                    if (err) {return logger.error('error redis response - ' + err)}
                    if (list.length > 0){
                        redis.mget(list, function(err, playerList){
                            if (err) {return logger.error('error redis response - ' + err)}
                            try{
                                wss.clients.forEach(function each(client) {
                                    if (client.readyState === WebSocket.OPEN) {
                                        client.send(JSON.stringify({type: 'playerList', data: playerList}))
                                        client.send(JSON.stringify({type: 'system', player_loc: 0 , text: '玩家 ' + JSON.parse(res).nickname + ' 下线了'}))
                                        if(res.player_loc > 0){
                                            client.send(JSON.stringify({type: 'system', player_loc: res.player_loc , text: '玩家 ' + JSON.parse(res).nickname + ' 退出了房间'}))
                                        }
                                    }
                                })
                            }
                            catch(e){
                                logger.error(e)
                            }
                        })
                    }
                })
            })
        })
    })
}
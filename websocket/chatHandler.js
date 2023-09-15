const WebSocket = require('ws')
const redis = require('../database/redis')
const conf = require('../config/')
const logger = require('../common/log')

module.exports = function (data, wss, req) {
    try {
        wss.clients.forEach(function each(client) {
            redis.get(conf.redisCache.playerPrefix + req.session.userId, function (err, res) {
                if (err) { return logger.error('error redis response - ' + err) }
                if (res === null) { return logger.error(conf.redisCache.playerPrefix + req.session.userId + errors.CACHE_DOES_NOT_EXIST) }
                try {
                    /* 与聊天信息的发送源玩家处于同一房间位置，或者就是发送源玩家本人的话，即可接收聊天信息 */
                    if ((data.player_loc === JSON.parse(res).player_loc || req.session.username === client.username) && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data))
                    }
                }
                catch (e) {
                    logger.error(e)
                }
            })
        })
    }
    catch (e) {
        logger.error(e)
    }
}


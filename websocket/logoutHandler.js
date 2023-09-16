const redis = require('../database/redis')
const WebSocket = require('ws')
const errors = require('../common/errors')
const conf = require('../config/')
const logger = require('../common/log')

/**
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/websocket.js').WebSocketServerInfo}
 * @typedef {import('../types/websocket.js').WebSocketInfo}
 * @typedef {import('../types/player.js').RedisCachePlayer}
 */

/**
 * @summary 登出处理器。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {(ClientRequest & WebSocketInfo)} data 游戏房间的前端请求信息。
 * @returns {void}
 */
module.exports = function (wss, data) {
    const userId = data.session ? data.session.userId : data.userId
    redis.get(conf.redisCache.playerPrefix + userId, function (err, res) {
        if (err) { return logger.error('error redis response - ' + err) }
        if (res === null) { return logger.error(conf.redisCache.playerPrefix + userId + errors.CACHE_DOES_NOT_EXIST) }
        /** @type {RedisCachePlayer} */
        const player = JSON.parse(res)
        if (player.player_status === 2) { return logger.warn('user' + userId + 'is still in game so keep the cache.') }
        redis.del(conf.redisCache.sessionPrefix + data.sessionID, function (err) {
            if (err) { return logger.error('error redis response - ' + err) }
            redis.del(conf.redisCache.playerPrefix + userId, function (err) {
                if (err) { return logger.error('error redis response - ' + err) }
                redis.keys(conf.redisCache.playerPrefix + '*', function (err, list) {
                    if (err) { return logger.error('error redis response - ' + err) }
                    if (list.length > 0) {
                        redis.mget(list, function (err, playerList) {
                            if (err) { return logger.error('error redis response - ' + err) }
                            try {
                                wss.clients.forEach(function each(client) {
                                    if (client.readyState === WebSocket.OPEN) {
                                        client.send(JSON.stringify({ type: 'playerList', data: playerList }))
                                        client.send(JSON.stringify({ type: 'system', player_loc: 0, text: '玩家 ' + player.nickname + ' 下线了' }))
                                        if (player.player_loc > 0) {
                                            client.send(JSON.stringify({ type: 'system', player_loc: player.player_loc, text: '玩家 ' + player.nickname + ' 退出了房间' }))
                                        }
                                    }
                                })
                            }
                            catch (e) {
                                logger.error(e)
                            }
                        })
                    }
                })
            })
        })
    })
}
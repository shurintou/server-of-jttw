const redis = require('../database/redis')
const WebSocket = require('ws')
const conf = require('../config/')
const logger = require('../common/log')
/**
 * @typedef {import('../types/websocket.js').WebSocketServerInfo}
 * @typedef {import('../types/websocket.js').WebSocketInfo}
 * @typedef {import('../types/http.js').ClientRequest}
 * @typedef {import('../types/player.js').RedisCachePlayer}
 * @typedef {import('../types/player.js').PlayerListWebsocketRequestData}
 */

/**
 * @param {PlayerListWebsocketRequestData} data 玩家列表的前端请求信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {ClientRequest} req Request信息(附带玩家信息)。
 * @param {WebSocketInfo} ws 单一玩家的WebSocket连接(附带玩家信息)。
 * @returns {void}
 */
module.exports = function (data, wss, req, ws) {
    try {
        if (data.action && data.action === 'get') {
            redis.keys(conf.redisCache.playerPrefix + '*', function (err, list) {
                if (err) { return logger.error('error redis response - ' + err) }
                try {
                    if (list.length > 0) {
                        redis.mget(list, function (err, playerList) {
                            if (err) { return logger.error('error redis response - ' + err) }
                            ws.send(JSON.stringify({ type: 'playerList', data: playerList }))
                        })
                    }
                }
                catch (e) {
                    logger.error(e)
                }
            })
        }
        else {
            /* 1，设置玩家最新信息，覆盖掉旧信息 */
            redis.getset(conf.redisCache.playerPrefix + req.session.userId,
                JSON.stringify({
                    id: req.session.userId,
                    username: req.session.username,
                    nickname: data.nickname,
                    player_loc: data.player_loc,
                    player_status: data.player_status,
                    avatar_id: data.avatar_id
                }),
                function (err, res) {
                    if (err) { return logger.error('error redis response - ' + err) }
                    try {
                        /* 2，检查该key是否存在，不存在则是新上线，否则是刷新信息 */
                        if (res === null) {
                            wss.clients.forEach(function each(client) {
                                if (client.readyState === WebSocket.OPEN && client.username !== req.session.username) {
                                    client.send(JSON.stringify({ type: 'system', player_loc: 0, text: '玩家 ' + data.nickname + ' 上线了' }))
                                }
                            })
                        }
                        /* 对比新旧信息 */
                        else {
                            /** @type {RedisCachePlayer} */
                            var oldPlayer = JSON.parse(res)
                            if (data.player_loc !== oldPlayer.player_loc) {
                                if (data.player_loc > 0) {
                                    wss.clients.forEach(function each(client) {
                                        if (client.readyState === WebSocket.OPEN && client.userId !== req.session.userId) {
                                            client.send(JSON.stringify({ type: 'system', player_loc: data.player_loc, text: '玩家 ' + data.nickname + ' 进入了房间' }))
                                        }
                                    })
                                }
                                else {
                                    wss.clients.forEach(function each(client) {
                                        if (client.readyState === WebSocket.OPEN && client.userId !== req.session.userId) {
                                            client.send(JSON.stringify({ type: 'system', player_loc: oldPlayer.player_loc, text: '玩家 ' + data.nickname + ' 离开了房间' }))
                                        }
                                    })
                                }
                            }
                        }
                        /* 3，获取所有player玩家，发送广播 */
                        redis.keys(conf.redisCache.playerPrefix + '*', function (err, list) {
                            if (err) { return logger.error('error redis response - ' + err) }
                            if (list.length > 0) {
                                redis.mget(list, function (err, playerList) {
                                    if (err) { return logger.error('error redis response - ' + err) }
                                    try {
                                        wss.clients.forEach(function each(client) {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({ type: 'playerList', data: playerList }))
                                            }
                                        })
                                    }
                                    catch (e) {
                                        logger.error(e)
                                    }
                                })
                            }
                        })
                    }
                    catch (e) {
                        logger.error(e)
                    }
                })
        }
    }
    catch (e) {
        logger.error(e)
    }
}
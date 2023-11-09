const WebSocket = require('ws')
const { asyncGet } = require('../database/redis')
const conf = require('../config/')
const logger = require('../common/log')
const errors = require('../common/errors')

/**
 * @typedef {import('../types/room.js').RoomChatWebsocketRequestData}
 * @typedef {import('../types/websocket.js').WebSocketServerInfo}
 * @typedef {import('../types/websocket.js').WebSocketInfo}
 * @typedef {import('../types/player.js').RedisCachePlayer}
 */

/**
 * @param {RoomChatWebsocketRequestData} data 游戏房间聊天的前端请求信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {WebSocketInfo} ws 单一玩家的WebSocket连接(附带玩家信息)。
 * @returns {void}
 */
module.exports = function (data, wss, ws) {
    try {
        const dataStr = JSON.stringify(data)
        wss.clients.forEach(async client => {
            const res = await asyncGet(conf.redisCache.playerPrefix + client.userId)
            if (res === null) { return logger.error(conf.redisCache.playerPrefix + client.userId + errors.CACHE_DOES_NOT_EXIST) }
            /** @type {RedisCachePlayer} */
            const player = JSON.parse(res)
            /* 与聊天信息的发送源玩家处于同一房间位置，或者就是发送源玩家本人的话，即可接收聊天信息 */
            if ((data.player_loc === player.player_loc || ws?.username === client.username) && client.readyState === WebSocket.OPEN) {
                client.send(dataStr)
            }
        })
    } catch (e) {
        logger.error(e)
    }
}

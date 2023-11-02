const WebSocket = require('ws')
const { asyncGet } = require('../database/redis')
const conf = require('../config/')
const logger = require('../common/log')
/**
 * @typedef {import('../types/room.js').RoomChatWebsocketRequestData}
 * @typedef {import('../types/websocket.js').WebSocketServerInfo}
 * @typedef {import('../types/http.js').ClientRequest}
 * @typedef {import('../types/player.js').RedisCachePlayer}
 */

/**
 * @param {RoomChatWebsocketRequestData} data 游戏房间聊天的前端请求信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {ClientRequest} req Request信息(附带玩家信息)。
 * @returns {void}
 */
module.exports = async function (data, wss, req) {
    try {
        const res = await asyncGet(conf.redisCache.playerPrefix + req.session.userId)
        if (res === null) { return logger.error(conf.redisCache.playerPrefix + req.session.userId + errors.CACHE_DOES_NOT_EXIST) }
        /** @type {RedisCachePlayer} */
        const player = JSON.parse(res)
        wss.clients.forEach(function each(client) {
            /* 与聊天信息的发送源玩家处于同一房间位置，或者就是发送源玩家本人的话，即可接收聊天信息 */
            if ((data.player_loc === player.player_loc || req.session.username === client.username) && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data))
            }
        })
    } catch (e) {
        logger.error(e)
    }
}

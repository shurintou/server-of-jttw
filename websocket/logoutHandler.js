const WebSocket = require('ws')
const { asyncKeys, asyncMget, asyncDel, asyncGet } = require('../database/redis')
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
 * @returns {Promise<void>}
 */
module.exports = async function (wss, data) {
    try {
        const userId = data.session ? data.session.userId : data.userId
        const playerRes = await asyncGet(conf.redisCache.playerPrefix + userId)
        if (playerRes === null) { return logger.error(conf.redisCache.playerPrefix + userId + errors.CACHE_DOES_NOT_EXIST) }

        /** @type {RedisCachePlayer} */
        const player = JSON.parse(playerRes)
        if (player.player_status === 2) { return logger.warn('user' + userId + 'is still in game so keep the cache.') }

        await asyncDel(conf.redisCache.sessionPrefix + data.sessionID)
        await asyncDel(conf.redisCache.playerPrefix + userId)

        const keyList = await asyncKeys(conf.redisCache.playerPrefix + '*')
        if (keyList.length > 0) {
            const playerList = await asyncMget(keyList)
            const playerListStr = JSON.stringify({ type: 'playerList', data: playerList })
            const offLineStr = JSON.stringify({ type: 'system', player_loc: 0, text: '玩家 ' + player.nickname + ' 下线了' })
            const exitStr = JSON.stringify({ type: 'system', player_loc: player.player_loc, text: '玩家 ' + player.nickname + ' 退出了房间' })
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(playerListStr)
                    client.send(offLineStr)
                    if (player.player_loc > 0) {
                        client.send(exitStr)
                    }
                }
            })
        }
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}
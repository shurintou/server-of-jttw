const WebSocket = require('ws')
const playerListHandler = require('./playerListHandler')
const chatHandler = require('./chatHandler')
const { asyncPexpire, asyncGet } = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')
/** @type {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。*/
const wss = new WebSocket.Server(conf.ws.config)
const gameRoomListHandler = require('./gameRoomListHandler')
const gameHandler = require('./gameHandler')
const { clearHandler } = require('./clearHandler')
const logger = require('../common/log')
/**
 * @typedef {import('../types/websocket.js').WebSocketServerInfo}
 * @typedef {import('../types/websocket.js').WebSocketInfo}
 * @typedef {import('../types/websocket.js').WebSocketRequestRawData}
 * @typedef {import('../types/http.js').ClientRequest}
 */

wss.on('connection',
    /**
     * @param {WebSocketInfo} ws 单一玩家的WebSocket连接(附带玩家信息)。
     * @param {ClientRequest} req Request信息(附带玩家信息)。
     * @returns {void}
     */
    function connection(ws, req) {
        ws.username = req.session.username
        ws.userId = req.session.userId
        ws.sessionID = req.sessionID
        ws.on('message', async function incoming(data) {
            try {
                const session = await asyncGet(conf.redisCache.sessionPrefix + ws.sessionID)
                if (session === null) {
                    ws.close(errors.WEBSOCKET_SESSION_TIMEOUT.code, errors.WEBSOCKET_SESSION_TIMEOUT.message)
                    return
                }
                ws.isAlive = true
                /** @type {WebSocketRequestRawData} */
                const jsText = JSON.parse(data)
                jsText.userId = ws.userId
                /* heartbeat */
                if (jsText.type === 'ping') {
                    ws.send(JSON.stringify({ 'type': 'pong' }))
                    return
                }
                /* reset the expire of the session */
                await asyncPexpire(conf.redisCache.sessionPrefix + ws.sessionID, conf.session.cookie.maxAge)
                if (jsText.type === 'playerList') {
                    playerListHandler(jsText, wss, ws)
                }
                else if (jsText.type === 'gameRoomList') {
                    gameRoomListHandler(jsText, wss, ws)
                }
                else if (jsText.type === 'game') {
                    gameHandler(jsText, wss, ws)
                }
                else if (jsText.type === 'chat') {
                    chatHandler(jsText, wss, ws)
                }
            } catch (e) {
                logger.error(e)
            }
        })
    }
)

wss.on('close', function close() {
    try {
        clearInterval(wss.clearHandlerTimerId)
    } catch (e) {
        logger.error(e)
    }
})

clearHandler(wss)

module.exports = wss

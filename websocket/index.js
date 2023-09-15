const WebSocket = require('ws')
const playerListHandler = require('./playerListHandler')
const chatHandler = require('./chatHandler')
const redis = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')
const wss = new WebSocket.Server(conf.ws.config)
const gameRoomListHandler = require('./gameRoomListHandler')
const gameHandler = require('./gameHandler')
const clearHandler = require('./clearHandler')
const logger = require('../common/log')

wss.on('connection', function connection(ws, req) {
    try {
        ws.username = req.session.username
        ws.userId = req.session.userId
        ws.sessionID = req.sessionID
        ws.on('message', function incoming(data) {
            redis.get(conf.redisCache.sessionPrefix + req.sessionID, function (err, session) {
                if (err) { return logger.error('error redis response - ' + err) }
                try {
                    if (!session) {
                        ws.close(errors.WEBSOCKET_SESSION_TIMEOUT.code, errors.WEBSOCKET_SESSION_TIMEOUT.message)
                        return
                    }
                    ws.isAlive = true
                    let jsText = JSON.parse(data)
                    jsText.userId = ws.userId
                    /* heartbeat */
                    if (jsText.type === 'ping') {
                        ws.send(JSON.stringify({ 'type': 'pong' }))
                        return
                    }
                    /* reset the expire of the session */
                    redis.pexpire(conf.redisCache.sessionPrefix + req.sessionID, conf.session.cookie.maxAge)
                    if (jsText.type === 'playerList') {
                        playerListHandler(jsText, wss, req, ws)
                        return
                    }
                    if (jsText.type === 'gameRoomList') {
                        gameRoomListHandler(jsText, wss, ws)
                        return
                    }
                    if (jsText.type === 'game') {
                        gameHandler(jsText, wss, ws)
                        return
                    }
                    if (jsText.type === 'chat') {
                        chatHandler(jsText, wss, req)
                        return
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
})

wss.on('close', function close() {
    try {
        clearInterval(wss.clearHandlerTimerId)
    }
    catch (e) {
        logger.error(e)
    }
})

clearHandler(wss)

module.exports = wss

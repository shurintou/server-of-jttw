const WebSocket = require('ws')
const playerListHandler = require('./playerListHandler')
const chatHandler = require('./chatHandler')
const redis = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')
const wss = new WebSocket.Server(conf.ws.config)
const gameRoomListHandler = require('./gameRoomListHandler')
const clearHandler = require('./clearHandler')

wss.on('connection', function connection(ws, req) {
    ws.username = req.session.username
    ws.userId = req.session.userId
    ws.sessionID = req.sessionID
    ws.on('message', function incoming(data) {
        redis.get(conf.redisCache.sessionPrefix + req.sessionID, function(err, session){
            if (err) {return console.error('error redis response - ' + err)}
            if(!session){
                ws.close(errors.WEBSOCKET_SESSION_TIMEOUT.code, errors.WEBSOCKET_SESSION_TIMEOUT.message)
                return 
            }
            ws.isAlive = true
            let jsText = JSON.parse(data)
            jsText.userId = ws.userId
            /* heartbeat */
            if(jsText.type === 'ping'){
                ws.send(JSON.stringify({'type': 'pong'}))
                return
            }
            /* reset the expire of the session */
            redis.pexpire( conf.redisCache.sessionPrefix + req.sessionID , conf.session.cookie.maxAge)
            if(jsText.type === 'playerList'){
                playerListHandler(jsText, wss, req)
                return
            }
            if(jsText.type === 'gameRoomList'){
                gameRoomListHandler(jsText, wss, ws)
                return
            }
            if(jsText.type === 'chat'){
                chatHandler(jsText, wss, req)
                return
            } 
        })
    })
})
  
wss.on('close', function close() {
  clearInterval(interval)
})

clearHandler(wss)  

module.exports = wss
  
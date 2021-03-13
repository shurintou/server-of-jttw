const WebSocket = require('ws');
const store = require('../common/session').store
const playerListHandler = require('./playerListHandler')
const chatHandler = require('./chatHandler')
const redis = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')

const wss = new WebSocket.Server(conf.ws.config);

/* 定期清除失活的连接和session */  
const interval = setInterval(function checkConnections() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false){
      ws.terminate()
      store.destroy(ws.sessionID, function(){})
      return
    }
    ws.isAlive = false;
  }) 
  store.all( function(err, sessions){
    if (err) {return console.error('error redis response - ' + err)}
    for(let i = 0; i < sessions.length; i++){
        redis.ttl('sess:' + sessions[i].sessionID, function(err, res){
          if (err) {return console.error('error redis response - ' + err)}
          if( res < conf.ws.deadTtl ){
              redis.del('sess:' + sessions[i].sessionID)
          }
        })
    }
  }) 
}, conf.ws.checkPeriod);

  
wss.on('connection', function connection(ws, req) {
    ws.username = req.session.username
    ws.userId = req.session.userId
    ws.sessionID = req.sessionID
    ws.on('message', function incoming(data) {
        store.get(req.sessionID, function(err, session){
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
                ws.send(JSON.stringify({'type': 'pong'}));
                return
            }
            /* reset the expire of the session */
            redis.pexpire( 'sess:' + req.sessionID , conf.session.cookie.maxAge)
            if(jsText.type === 'playerList'){
                playerListHandler.modify(jsText, wss, req)
                return
            }
            if(jsText.type === 'chat'){
                chatHandler(jsText, wss)
                return
            } 
        })
    });
});
  
wss.on('close', function close() {
  clearInterval(interval)
});

module.exports = wss
  
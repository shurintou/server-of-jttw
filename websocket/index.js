const WebSocket = require('ws');
const store = require('../common/session').store
const chatHandler = require('./chatHandler')
const playerLocHandler = require('./playerLocHandler')
const redis = require('../database/redis')
const conf = require('../config/')


const wss = new WebSocket.Server({
    clientTracking: true,
    noServer: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      clientNoContextTakeover: true, 
      serverNoContextTakeover: true, 
      serverMaxWindowBits: 10, 
      concurrencyLimit: 10, 
      threshold: 1024, 
    }
  });

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
  try{
    store.all( function(err, sessions){
      for(let i = 0; i < sessions.length; i++){
         redis.ttl('sess:' + sessions[i].sessionID, function(err, res){
            if( res < 3000 ){
                redis.del('sess:' + sessions[i].sessionID)
            }
         })
      }
    }) 
  }
  catch(err){
    console.log(err)
  }  
}, 6000);

  
wss.on('connection', function connection(ws, req) {
    ws.nickname = req.session.nickname
    ws.username = req.session.username
    ws.userId = req.session.userId
    ws.sessionID = req.sessionID
    ws.on('message', function incoming(data) {
        store.get(req.sessionID, function(error, session){
            if(!session){
                ws.close(1000, '账号信息已过期，请重新登录')
                return 
            }
            ws.isAlive = true
            let jsText = JSON.parse(data)
            /* heartbeat */
            if(jsText.type === 'ping'){
                ws.send(JSON.stringify({'type': 'pong'}));
                return
            }
            /* reset the expire of the session */
            redis.pexpire( 'sess:' + req.sessionID , conf.session.cookie.maxAge)
            jsText.nickname = ws.nickname
            jsText.userId = ws.userId
            if(jsText.type === 'player_loc'){
                playerLocHandler(jsText , wss, ws)
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
  
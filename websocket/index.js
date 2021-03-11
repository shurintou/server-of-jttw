const WebSocket = require('ws');
const store = require('../common/session').store
const chatHandler = require('./chatHandler')
const playerLocHandler = require('./playerLocHandler')


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

  
wss.on('connection', function connection(ws, req) {
    ws.nickname = req.session.nickname
    ws.username = req.session.username
    ws.userId = req.session.userId
    ws.on('message', function incoming(data) {
        store.get(req.sessionID, function(error, session){
            if(!session){
                ws.close(1000, '账号信息已过期，请重新登录')
                return 
            }
            let jsText = JSON.parse(data)
            /* heartbeat */
            if(jsText.type === 'ping'){
                ws.send(JSON.stringify({'type': 'pong'}));
                return
            }
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
  console.log('tcp serve is off')
});

module.exports = wss
  
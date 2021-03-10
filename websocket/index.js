const WebSocket = require('ws');
const store = require('../common/session').store


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
    ws.on('message', function incoming(data) {
        store.get(req.sessionID, function(error, session){
            if(!session){
                ws.close(1000, '账号信息已过期，请重新登录')
                return 
            }
            let jsText = JSON.parse(data)
            if(jsText.text === 'ping'){
                sendJson(ws, {'text': 'pong'})
            }
            else{
                Broadcast(jsText)
            } 
        })
    });
});
  
  wss.on('close', function close() {
    console.log('tcp serve is off')
  });
  
  function Broadcast(data){
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        sendJson(client,data)
      }
    });
  }
  
  function sendJson(ws,data){
    ws.send(JSON.stringify(data));
  }
  

  module.exports = wss
  
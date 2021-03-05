const WebSocket = require('ws');


const wss = new WebSocket.Server({
  port: 8081,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed.
  }
});

wss.on('connection', function connection(ws) {
  console.log('tcp serve is on')
  ws.on('message', function incoming(data) {
    let jsText =JSON.parse(data)
    if(jsText.text==='ping'){
      sendJson(ws,{'text': 'pong'})
    }
    else{
      Broadcast(jsText)
    }
  });
});

wss.on('close', function close() {
  console.log('tcp serve is off')
});

const Broadcast = function(data){
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      sendJson(client,data)
    }
  });
}

const sendJson = function(ws,data){
  ws.send(JSON.stringify(data));
}


const WebSocket = require('ws');

module.exports =  function(data, wss){
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN && client.player_loc === data.player_loc) {
                client.send(JSON.stringify(data));
            }
        });
    }

  
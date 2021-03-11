
module.exports = function(data, wss, ws){
        // if(data.player_loc > 0){
        //     wss.clients.forEach(function each(client) {
        //         if (client.readyState === WebSocket.OPEN && client.player_loc === data.player_loc) {
        //             client.send(JSON.stringify(data));
        //         }
        //     });
        // }
        // else{
        //     if(ws.player_loc > 0){

        //     }
        // }
        ws.player_loc = data.player_loc

       
}

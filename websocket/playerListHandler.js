const redis = require('../database/redis')
const WebSocket = require('ws');

module.exports = function(data ,wss, req){
        redis.set('player:' + req.session.userId,
        JSON.stringify({
            id: req.session.userId,
            username: req.session.username,
            nickname: data.nickname,
            player_loc: data.player_loc,
            player_status: data.player_status,
            avatar_id : data.avatar_id
        }), 
        function(err){
            if (err) {return console.error('error redis response - ' + err)}
            redis.sadd('playerList', 'player:' + req.session.userId,
            function(err){
                if (err) {return console.error('error redis response - ' + err)}
                redis.smembers('playerList', 
                function(err, list){
                    if (err) {return console.error('error redis response - ' + err)}
                    if (list.length > 0){
                        redis.mget(list, function(err, playerList){
                            if (err) {return console.error('error redis response - ' + err)}
                            wss.clients.forEach(function each(client) {
                                if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({type: 'playerList', data: playerList}));
                                }
                            });
                        })
                    }
                })
            })
        })
}
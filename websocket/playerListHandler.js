const redis = require('../database/redis')
const WebSocket = require('ws');

module.exports = {
    modify: function(data ,wss, req){
        redis.set('player' + req.session.userId,
        JSON.stringify({
            id: req.session.userId,
            username: req.session.username,
            nickname: req.session.nickname,
            player_loc: data.player_loc,
            player_status: data.player_status,
            avatar_id : data.avatar_id
        }), 
        function(err, res){
            redis.sadd('playerList', 'player' + req.session.userId,
            function(err, res){
                redis.smembers('playerList', 
                function(err, list){
                    redis.mget(list, function(err, playerList){
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({type: 'playerList', data: playerList}));
                            }
                        });
                    })
                })
            })
        })
    }
}
const redis = require('../database/redis')
const WebSocket = require('ws')
const conf = require('../config/')
const errors = require('../common/errors')
const poker = require('../common/poker')

module.exports = function(data ,wss, ws){
    var gameRoomKey = conf.redisCache.gameRoomPrefix + data.id
    var gameKey = conf.redisCache.gamePrefix + data.id
    if(data.action === 'initialize'){
        redis.get(gameKey, function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
            if(res !== null)return
            redis.get(gameRoomKey, function(err, gameRoomRes){
                if (err) {return console.error('error redis response - ' + err)}
                redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                    if (err) {return console.error('error redis response - ' + err)}
                    redis.mget(list, function(err, playerListRes){
                        if (err) {return console.error('error redis response - ' + err)}
                        let gameRoom = JSON.parse(gameRoomRes) //游戏房间
                        let redisMSetStr = [] //mset批量改变玩家游戏状态的redis语句
                        let gamePlayerList = []  //player:列表
                        let pokers = [] //扑克牌数字列表
                        for(let i = 0; i < gameRoom.cardNum; i++){
                            for(let j = 0; j < 54; j++){
                                pokers.push(j)
                            }
                        }
                        pokers = poker.shuffle(pokers)
                        let game = {
                            id: data.id,
                            clockwise: false,
                            currentPlayer: 0,
                            currentCard: [],
                            currentCardPlayer: 0,
                            currentCombo: 0,
                            gamePlayer: {
                                0: {id: 0, nickname: '', cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                1: {id: 0, nickname: '', cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                2: {id: 0, nickname: '', cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                3: {id: 0, nickname: '', cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                4: {id: 0, nickname: '', cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                5: {id: 0, nickname: '', cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                6: {id: 0, nickname: '', cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                7: {id: 0, nickname: '', cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                            },
                            gamePlayerId: [],    
                            remainCards: pokers, //发送给玩家时只发送长度
                        }
                        for(let i = 0; i < playerListRes.length; i++){
                            gamePlayerList.push( JSON.parse(playerListRes[i]) )
                        }
                        for(let i = 0; i < Object.keys(gameRoom.playerList).length; i++){
                            if(gameRoom.playerList[i].id > 0){
                                game.gamePlayerId.push(gameRoom.playerList[i].id)
                                for(let j = 0; j < gamePlayerList.length; j++){
                                    /* 某玩家在房间中，获取该玩家昵称，设置信息，并改变其在玩家列表中的状态 */
                                    if(gameRoom.playerList[i].id === gamePlayerList[j].id){
                                        game.gamePlayer[i].id = gamePlayerList[j].id
                                        game.gamePlayer[i].nickname = gamePlayerList[j].nickname
                                        game.gamePlayer[i].online = true
                                        gamePlayerList[j].player_status = 2
                                        /* 发牌 */
                                        while(game.gamePlayer[i].remainCards.length < 5){
                                            game.gamePlayer[i].remainCards.push( game.remainCards.pop())
                                        }
                                        if(gameRoom.playerList[i].id === gameRoom.lastLoser ){
                                            game.currentPlayer = i
                                        }
                                        redisMSetStr.push(conf.redisCache.playerPrefix + gamePlayerList[j].id)
                                        redisMSetStr.push(JSON.stringify(gamePlayerList[j]))
                                        break
                                    }
                                }
                            }
                        }
                        /* 批量改变玩家状态 */
                        redis.mset(redisMSetStr, function(err){
                            if (err) {return console.error('error redis response - ' + err)}
                            redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                                if (err) {return console.error('error redis response - ' + err)}
                                redis.mget(list, function(err, playerList){
                                    if (err) {return console.error('error redis response - ' + err)}
                                    wss.clients.forEach(function each(client) {
                                        if (client.readyState === WebSocket.OPEN) {
                                            client.send(JSON.stringify({type: 'playerList', data: playerList}))
                                        }
                                    })
                                })
                            })
                            gameRoom.status = 1
                            /* 改变游戏列表 */
                            redis.set(gameRoomKey, JSON.stringify(gameRoom), function(err){
                                if (err) {return console.error('error redis response - ' + err)}
                                redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
                                    if (err) {return console.error('error redis response - ' + err)}
                                    redis.mget(list, function(err, gameRoomList){
                                        if (err) {return console.error('error redis response - ' + err)}
                                        wss.clients.forEach(function each(client) {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
                                            }
                                        })
                                    })
                                })
                                let gameStr = JSON.stringify(game)
                                redis.set(gameKey, gameStr, function(err){
                                    if (err) {return console.error('error redis response - ' + err)}
                                    wss.clients.forEach(function each(client) {
                                        if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                                            client.send(JSON.stringify({type: 'game', data: gameStr}))
                                        }
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
        return
    }
}
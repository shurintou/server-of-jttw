const redis = require('../database/redis')
const WebSocket = require('ws')
const conf = require('../config/')
const poker = require('../common/poker')

module.exports = function(data ,wss, ws){
    let gameRoomKey = conf.redisCache.gameRoomPrefix + data.id
    let gameKey = conf.redisCache.gamePrefix + data.id
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
                            currentPlayer: -1, //座位号
                            currentCard: [],
                            cardNum: gameRoom.cardNum,
                            currentCardPlayer: -1,
                            currentCombo: 0,
                            version: 0, //数据版本
                            timer: 0,
                            gamePlayer: {
                                0: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                1: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                2: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                3: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                4: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                5: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                6: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                7: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
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
                                if(game.currentPlayer === -1 ){
                                    game.currentPlayer = i
                                }
                                for(let j = 0; j < gamePlayerList.length; j++){
                                    /* 某玩家在房间中，获取该玩家昵称，设置信息，并改变其在玩家列表中的状态 */
                                    if(gameRoom.playerList[i].id === gamePlayerList[j].id){
                                        game.gamePlayer[i].id = gamePlayerList[j].id
                                        game.gamePlayer[i].nickname = gamePlayerList[j].nickname
                                        game.gamePlayer[i].avatar_id = gamePlayerList[j].avatar_id
                                        game.gamePlayer[i].online = true
                                        gamePlayerList[j].player_status = 2
                                        /* 发牌 */
                                        while(game.gamePlayer[i].remainCards.length < 5){
                                            game.gamePlayer[i].remainCards.push( game.remainCards.pop())
                                        }
                                        if(gameRoom.playerList[i].id === gameRoom.lastLoser && gameRoom.lastLoser > 0 ){
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
                                redis.set(gameKey, JSON.stringify(game), function(err){
                                    if (err) {return console.error('error redis response - ' + err)}
                                    game.remainCards = game.remainCards.length
                                    let gameStr = JSON.stringify(game)
                                    wss.clients.forEach(function each(client) {
                                        if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                                            client.send(JSON.stringify({type: 'game', action:'initialize', data: gameStr}))
                                        }
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    }
    else if(data.action === 'get'){
        redis.get( gameKey, function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
            let game = JSON.parse(res)
            game.remainCards = game.remainCards.length
            ws.send(JSON.stringify({type: 'game', action:'get', data: JSON.stringify(game)}))
        })
    }
    else if(data.action === 'play'){
        redis.get( gameKey, function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
            let game = JSON.parse(res)
            if(game.currentPlayer === data.seatIndex){
                clearInterval(game.timer)
                game.gamePlayer[data.seatIndex].remainCards = data.remainCards
                game.currentCombo = game.currentCombo + data.playCard.length
                if(game.currentCombo > game.maxCombo){
                    game.maxCombo = game.currentCombo
                }
                if(poker.cardList[data.playCard[0]].num === 100){//反弹牌
                    game.gamePlayer[data.seatIndex].joker = game.gamePlayer[data.seatIndex].joker + data.playCard.length
                    game.clockwise = !game.clockwise
                }
                else{
                    game.currentCard = data.playCard
                    game.currentCardPlayer = data.seatIndex
                    if(poker.cardList[data.playCard[0]].num === 21){
                        game.gamePlayer[data.seatIndex].shaseng = game.gamePlayer[data.seatIndex].shaseng + data.playCard.length
                    }
                    else if(poker.cardList[data.playCard[0]].num === 22){
                        game.gamePlayer[data.seatIndex].bajie = game.gamePlayer[data.seatIndex].bajie + data.playCard.length
                    }
                    else if(poker.cardList[data.playCard[0]].num === 23){
                        game.gamePlayer[data.seatIndex].wukong = game.gamePlayer[data.seatIndex].wukong + data.playCard.length
                    }
                    else if(poker.cardList[data.playCard[0]].num === 31){
                        game.gamePlayer[data.seatIndex].tangseng = game.gamePlayer[data.seatIndex].tangseng + data.playCard.length
                    }
                }
                while(game.gamePlayer[data.seatIndex].remainCards.length < 5 && game.remainCards.length > 0){//补牌
                    game.gamePlayer[data.seatIndex].remainCards.push( game.remainCards.pop())
                }
                let hasPlayerPlayCard = false
                let step = game.clockwise ? -1 : 1
                let nextSeatIndex = data.seatIndex + step
                for(let i = 0; i < 7; i++){
                    if(nextSeatIndex > 7){
                        nextSeatIndex = 0
                    }
                    else if(nextSeatIndex < 0){
                        nextSeatIndex = 7
                    }
                    if(game.gamePlayer[nextSeatIndex].remainCards.length > 0){
                        hasPlayerPlayCard = true
                        game.currentPlayer = nextSeatIndex
                        break
                    }
                    nextSeatIndex = nextSeatIndex + step
                } 
                if(!hasPlayerPlayCard){
                    //游戏结束
                    return
                }
                game.version = game.version + 1
                let timer = setInterval( function(){disCard(wss, data)} , poker.waitTime)
                game.timer = timer[Symbol.toPrimitive]()
                redis.set(gameKey, JSON.stringify(game), function(err){
                    if (err) {return console.error('error redis response - ' + err)}
                    game.remainCards = game.remainCards.length
                    wss.clients.forEach(function each(client) {
                        if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                            client.send(JSON.stringify({type: 'game', action:'update', data: JSON.stringify(game)}))
                        }
                    })
                })
            }
        })
    }
}

function disCard(wss, data){
    let gameKey = conf.redisCache.gamePrefix + data.id
    redis.get( gameKey, function(err, res){
        if (err) {return console.error('error redis response - ' + err)}
        let game = JSON.parse(res)
        if(game.currentCard.length === 0){
        
        }
        else{
            if(game.currentCombo > game.gamePlayer[game.currentPlayer].maxCombo){
                game.gamePlayer[game.currentPlayer].maxCombo = game.currentCombo
            }
            game.gamePlayer[game.currentPlayer].cards = game.gamePlayer[game.currentPlayer].cards + game.currentCombo
            game.currentCombo = 0
            game.currentCard = []
            game.currentCardPlayer = -1
            game.version = game.version + 1
            redis.set(gameKey, JSON.stringify(game), function(err){
                if (err) {return console.error('error redis response - ' + err)}
                game.remainCards = game.remainCards.length
                wss.clients.forEach(function each(client) {
                    if(client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                        client.send(JSON.stringify({type: 'game', action:'update', data: JSON.stringify(game)}))
                    }
                })
            })
        }
    })
    
}
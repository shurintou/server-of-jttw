const redis = require('../database/redis')
const WebSocket = require('ws')
const conf = require('../config/')
const poker = require('../common/poker')
const errors = require('../common/errors')
const models = require('../common/models')
const sequelize = require('../database/mysql').sequelize
const { Op } = require("sequelize");

module.exports = function(data ,wss, ws){
    let gameRoomKey = conf.redisCache.gameRoomPrefix + data.id
    let gameKey = conf.redisCache.gamePrefix + data.id
    if(data.action === 'initialize'){
        redis.watch(gameKey, gameRoomKey, function(err){
            if (err) {return console.error('error redis response - ' + err)}
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
                            let timer = setTimeout( function(){intervalCheckCard(wss, data.id)} , poker.waitTime)
                            let game = {
                                id: data.id,
                                clockwise: false,
                                currentPlayer: -1, //座位号
                                currentCard: [],
                                currentCardPlayer: -1,
                                jokerCard: [],
                                jokerCardPlayer: -1,
                                cardNum: gameRoom.cardNum,
                                currentCombo: 0,
                                version: 0, //数据版本
                                timer: timer[Symbol.toPrimitive](),
                                gamePlayer: {
                                    0: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                    1: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                    2: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                    3: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                    4: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                    5: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                    6: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
                                    7: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0},
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
                            gameRoom.status = 1
                            redis.multi()
                            .mset(redisMSetStr)
                            .set(gameRoomKey, JSON.stringify(gameRoom))
                            .set(gameKey, JSON.stringify(game))
                            .exec(function(err, results){
                                if (err) {return console.error('error redis response - ' + err)}
                                if(results === null){
                                    ws.send(JSON.stringify({type: 'message', subType:'error', player_loc: data.id , text: errors.SET_ONLINE_ERROR.message}))
                                }
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
                                game.remainCards = game.remainCards.length
                                game.messages = []
                                messageList =['游戏开始']
                                messageList.forEach(text => game.messages.push(text))
                                game.messages.push( '等待 ' + game.gamePlayer[game.currentPlayer].nickname + ' 出牌...')
                                let gameStr = JSON.stringify(game)
                                wss.clients.forEach(function each(client) {
                                    if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                                        client.send(JSON.stringify({type: 'game', action: 'initialize', data: gameStr}))
                                    }
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
            game.messages = []
            game.messages.push( '重新连接...')
            game.messages.push( '等待 ' + game.gamePlayer[game.currentPlayer].nickname + ' 出牌...')
            ws.send(JSON.stringify({type: 'game', action:'get', data: JSON.stringify(game)}))
        })
    }
    else if(data.action === 'play'){
        redis.get( gameKey, function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
            let game = JSON.parse(res)
            if(game.currentPlayer === data.seatIndex){
                let playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 打出了' + poker.cardList[data.playCard[0]].name
                game.gamePlayer[game.currentPlayer].online = true
                game.gamePlayer[game.currentPlayer].offLineTime = 0
                clearTimeout(game.timer)
                game.gamePlayer[data.seatIndex].remainCards = data.remainCards
                game.currentCombo = game.currentCombo + data.playCard.length
                if(game.currentCombo > game.maxCombo){
                    game.maxCombo = game.currentCombo
                }
                if(game.jokerCard.length > 0){
                    game.jokerCard = []
                    game.jokerCardPlayer = -1
                }
                if(poker.cardList[data.playCard[0]].num === 100){//反弹牌
                    game.gamePlayer[data.seatIndex].joker = game.gamePlayer[data.seatIndex].joker + data.playCard.length
                    game.clockwise = !game.clockwise
                    if(game.currentCard.length === 0){
                        game.currentCard = data.playCard
                        game.currentCardPlayer = data.seatIndex
                    }
                    else{
                        game.jokerCard = data.playCard
                        game.jokerCard.sort()
                        game.jokerCardPlayer = data.seatIndex
                    }
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
                    gameover(gameKey, game, wss)
                    return
                }
                game.version = game.version + 1
                let timer = setTimeout( function(){intervalCheckCard(wss, game.id)} , getWaitTime(game))
                game.timer = timer[Symbol.toPrimitive]()
                sendGameInfo(gameKey, game, wss, 'update',[ playCardText ])
            }
            else{
                ws.send(JSON.stringify({type: 'error', player_loc: data.id , text: errors.POKER_TIMER_EXPIRED.message}))
            }
        })
    }
    else if(data.action === 'discard'){
        redis.get( gameKey, function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
            let game = JSON.parse(res)
            if(game.currentPlayer === data.seatIndex){
                game.gamePlayer[game.currentPlayer].online = true
                game.gamePlayer[game.currentPlayer].offLineTime = 0
                clearTimeout(game.timer)
                /* 现在牌池没有牌的情况 */
                if(game.currentCard.length === 0){
                    game.gamePlayer[game.currentPlayer].remainCards.sort((a,b) =>{
                        if( poker.cardList[a].num === poker.cardList[b].num){
                            return poker.cardList[a].suit - poker.cardList[b].suit
                        }
                        else{
                            return poker.cardList[a].num - poker.cardList[b].num
                        }
                    })
                    game.currentCombo = 1
                    let playCard = game.gamePlayer[game.currentPlayer].remainCards.shift()
                    let playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 打出了' + poker.cardList[playCard].name
                    if(poker.cardList[playCard].num === 100){//反弹牌
                        game.gamePlayer[game.currentPlayer].joker = game.gamePlayer[game.currentPlayer].joker + 1
                        game.clockwise = !game.clockwise
                        game.jokerCard = []
                        game.jokerCard.push(playCard)
                        game.jokerCardPlayer = game.currentPlayer
                    }
                    else{
                        game.currentCardPlayer = game.currentPlayer
                        game.currentCard = []
                        game.currentCard.push(playCard)
                        if(poker.cardList[playCard].num === 21){
                            game.gamePlayer[game.currentPlayer].shaseng = game.gamePlayer[game.currentPlayer].shaseng + 1
                        }
                        else if(poker.cardList[playCard].num === 22){
                            game.gamePlayer[game.currentPlayer].bajie = game.gamePlayer[game.currentPlayer].bajie + 1
                        }
                        else if(poker.cardList[playCard].num === 23){
                            game.gamePlayer[game.currentPlayer].wukong = game.gamePlayer[game.currentPlayer].wukong + 1
                        }
                        else if(poker.cardList[playCard].num === 31){
                            game.gamePlayer[game.currentPlayer].tangseng = game.gamePlayer[game.currentPlayer].tangseng + 1
                        }
                    }
                    if(game.remainCards.length > 0){
                        game.gamePlayer[game.currentPlayer].remainCards.push(game.remainCards.pop())
                    }
                    let hasPlayerPlayCard = false
                    let step = game.clockwise ? -1 : 1
                    let nextSeatIndex = game.currentPlayer + step
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
                        gameover(gameKey, game, wss)
                        return
                    }
                    game.version = game.version + 1
                    let timer = setTimeout( function(){intervalCheckCard(wss, game.id)} , getWaitTime(game))
                    game.timer = timer[Symbol.toPrimitive]()
                    sendGameInfo(gameKey, game, wss, 'update', [playCardText])
                }
                /* 牌池有牌的情况 */
                else{
                    if(game.currentCombo > game.gamePlayer[game.currentPlayer].maxCombo){
                        game.gamePlayer[game.currentPlayer].maxCombo = game.currentCombo
                    }
                    let playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 收下 ' + game.currentCombo + ' 张牌'
                    game.jokerCard = []
                    game.jokerCardPlayer = -1
                    game.gamePlayer[game.currentPlayer].cards = game.gamePlayer[game.currentPlayer].cards + game.currentCombo
                    game.currentCombo = 0
                    game.currentCard = []
                    game.currentCardPlayer = -1
                    game.version = game.version + 1
                    let timer = setTimeout( function(){intervalCheckCard(wss, game.id)} , getWaitTime(game))
                    game.timer = timer[Symbol.toPrimitive]()
                    sendGameInfo(gameKey, game, wss, 'update', [playCardText])
                }
            }
            else{
                ws.send(JSON.stringify({type: 'error', player_loc: data.id , text: errors.POKER_TIMER_EXPIRED.message}))
            }
        })
    }
    else if(data.action === 'shiftOnline'){
        redis.watch( gameKey, function(err){
            if (err) {return console.error('error redis response - ' + err)}
            redis.get( gameKey, function(err, res){
                if (err) {return console.error('error redis response - ' + err)}
                let game = JSON.parse(res)
                game.gamePlayer[data.seatIndex].online = !game.gamePlayer[data.seatIndex].online
                game.gamePlayer[data.seatIndex].offLineTime = 0
                // game.version = game.version + 1  设置托管不更新数据版本
                redis.multi()
                .set(gameKey, JSON.stringify(game))
                .exec(function(err, results){
                    if (err) {return console.error('error redis response - ' + err)}
                    if(results === null){//在set时有其他线程改变了key，set失败
                        ws.send(JSON.stringify({type: 'message', subType:'error', player_loc: data.id , text: errors.SET_ONLINE_ERROR.message}))
                        return
                    }
                    if(game.gamePlayer[data.seatIndex].online){
                        ws.send(JSON.stringify({type: 'message', subType:'success', player_loc: data.id , text: '已取消托管'}))
                    }
                    else{
                        ws.send(JSON.stringify({type: 'message', subType:'warning', player_loc: data.id , text: '已托管'}))
                    }
                    wss.clients.forEach(function each(client) {
                        if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                            client.send(JSON.stringify({type: 'game', action: 'shiftOnline', seatIndex: data.seatIndex, online: game.gamePlayer[data.seatIndex].online}))
                        }
                    })
                })
            })
        })
    }
    else if(data.action === 'textToPlayer'){
        redis.get( gameKey, function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
            let game = JSON.parse(res)
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                    client.send(JSON.stringify({type: 'game', action: 'textToPlayer', data: {source: data.source, target: data.target, sourceId: data.sourceId, targetId: data.targetId, text: data.text} }))
                }
            })
        })
    }
}

function intervalCheckCard(wss, id){
    let gameKey = conf.redisCache.gamePrefix + id
    redis.get( gameKey, function(err, res){
        if (err) {return console.error('error redis response - ' + err)}
        let game = JSON.parse(res)
        game.gamePlayer[game.currentPlayer].offLineTime = game.gamePlayer[game.currentPlayer].offLineTime + 1 //玩家超时次数
        game.gamePlayer[game.currentPlayer].offLinePlayCard = game.gamePlayer[game.currentPlayer].offLinePlayCard + 1 //玩家托管打出的牌数
        if(game.gamePlayer[game.currentPlayer].offLineTime > 1 && game.gamePlayer[game.currentPlayer].online){
            game.gamePlayer[game.currentPlayer].online = false //托管
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN && game.gamePlayer[game.currentPlayer].id === client.userId) {
                    client.send(JSON.stringify({type: 'message', subType:'warning', player_loc: id , text: '无操作响应，进入托管状态'}))
                }
            })
        }
        /* 现在牌池没有牌的情况 */
        if(game.currentCard.length === 0){
            game.gamePlayer[game.currentPlayer].remainCards.sort((a,b) =>{
                if( poker.cardList[a].num === poker.cardList[b].num){
                    return poker.cardList[a].suit - poker.cardList[b].suit
                }
                else{
                    return poker.cardList[a].num - poker.cardList[b].num
                }
            })
            game.currentCombo = 1
            let playCard = game.gamePlayer[game.currentPlayer].remainCards.shift()
            let playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 打出了' + poker.cardList[playCard].name
            if(poker.cardList[playCard].num === 100){//反弹牌
                game.gamePlayer[game.currentPlayer].joker = game.gamePlayer[game.currentPlayer].joker + 1
                game.clockwise = !game.clockwise
            }
            else{
                if(poker.cardList[playCard].num === 21){
                    game.gamePlayer[game.currentPlayer].shaseng = game.gamePlayer[game.currentPlayer].shaseng + 1
                }
                else if(poker.cardList[playCard].num === 22){
                    game.gamePlayer[game.currentPlayer].bajie = game.gamePlayer[game.currentPlayer].bajie + 1
                }
                else if(poker.cardList[playCard].num === 23){
                    game.gamePlayer[game.currentPlayer].wukong = game.gamePlayer[game.currentPlayer].wukong + 1
                }
                else if(poker.cardList[playCard].num === 31){
                    game.gamePlayer[game.currentPlayer].tangseng = game.gamePlayer[game.currentPlayer].tangseng + 1
                }
            }
            game.currentCardPlayer = game.currentPlayer
            game.currentCard = []
            game.currentCard.push(playCard)
            if(game.remainCards.length > 0){
                game.gamePlayer[game.currentPlayer].remainCards.push(game.remainCards.pop())
            }
            let hasPlayerPlayCard = false
            let step = game.clockwise ? -1 : 1
            let nextSeatIndex = game.currentPlayer + step
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
                gameover(gameKey, game, wss)
                return
            }
            game.version = game.version + 1
            let timer = setTimeout( function(){intervalCheckCard(wss, game.id )} , getWaitTime(game))
            game.timer = timer[Symbol.toPrimitive]()
            sendGameInfo(gameKey, game, wss, 'update', [playCardText])
        }
        /* 牌池有牌的情况 */
        else{
            if(game.currentCombo > game.gamePlayer[game.currentPlayer].maxCombo){
                game.gamePlayer[game.currentPlayer].maxCombo = game.currentCombo
            }
            let playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 收下 ' + game.currentCombo + ' 张牌'
            game.jokerCard = []
            game.jokerCardPlayer = -1
            game.gamePlayer[game.currentPlayer].cards = game.gamePlayer[game.currentPlayer].cards + game.currentCombo
            game.currentCombo = 0
            game.currentCard = []
            game.currentCardPlayer = -1
            game.version = game.version + 1
            let timer = setTimeout( function(){intervalCheckCard(wss, game.id )} , getWaitTime(game))
            game.timer = timer[Symbol.toPrimitive]()
            sendGameInfo(gameKey, game, wss, 'update', [playCardText])
        }
    })
}

function sendGameInfo(gameKey, game, wss, action, messageList){
    redis.set(gameKey, JSON.stringify(game), function(err){
        if (err) {return console.error('error redis response - ' + err)}
        game.remainCards = game.remainCards.length
        game.messages = []
        messageList.forEach(text => game.messages.push(text))
        game.messages.push( '等待 ' + game.gamePlayer[game.currentPlayer].nickname + ' 出牌...')
        let gameStr = JSON.stringify(game)
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                client.send(JSON.stringify({type: 'game', action: action, data: gameStr}))
            }
        })
    })
}

function getWaitTime(game){
    if(game.gamePlayer[game.currentPlayer].online === false){
        return poker.offLineWaitTime
    }
    else{
        return poker.waitTime
    }
}

function gameover(gameKey, game, wss){
    game.currentCard = []
    game.currentCardPlayer = -1
    game.jokerCard = []
    game.jokerCardPlayer = -1
    game.currentCombo = 0
    game.version = game.version + 1
    let winPlayer = 0 //id
    let losePlayer = 0
    let maxCards = 0
    let minCards = 0
    let cardsSortList = []
    for(let i = 0; i < Object.keys(game.gamePlayer).length; i++){
        game.gamePlayer[i].remainCards = []
        if(game.gamePlayer[i].id > 0){
            cardsSortList.push(game.gamePlayer[i])
        }
    }
    cardsSortList.sort(function (x, y) {//增序排成绩
        if(x.cards !== y.cards){
            return x.cards - y.cards
        }
        if(x.maxCombo !== y.maxCombo){
            return x.maxCombo - y.maxCombo
        }
        return (5*x.joker + 4*x.wukong + 3*x.bajie + 2*x.shaseng  + x.tangseng) - (5*y.joker + 4*y.wukong + 3*y.bajie + 2*y.shaseng  + y.tangseng)   
    })
    losePlayer = cardsSortList[cardsSortList.length -1].id
    winPlayer = cardsSortList[0].id
    maxCards = cardsSortList[cardsSortList.length -1].cards
    minCards = cardsSortList[0].cards
    cardsSortList.sort(function (x, y) {//排最大combo
        return x.maxCombo - y.maxCombo
    })
    maxCombo = cardsSortList[cardsSortList.length -1].maxCombo
    redis.set(gameKey, JSON.stringify(game), function(err){
        if (err) {return console.error('error redis response - ' + err)}
        game.remainCards = 0
        game.messages = ['游戏结束，正在结算...']
        let gameStr = JSON.stringify(game)
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                client.send(JSON.stringify({type: 'game', action: 'update', data: gameStr}))
            }
        })
        setTimeout(function(){
            saveGameData(game, wss, losePlayer, winPlayer, minCards, maxCards, maxCombo)
        }, 1500)
    })
    setTimeout(function(){
        deleteGame(game, wss, losePlayer, winPlayer)
    }, 3000)
}

function deleteGame(game, wss, losePlayer, winPlayer){
    let gameRoomKey = conf.redisCache.gameRoomPrefix + game.id
    let gameKey = conf.redisCache.gamePrefix + game.id
    redis.del(gameKey, function(err){
        if (err) {return console.error('error redis response - ' + err)}
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                client.send(JSON.stringify({type: 'game', action: 'delete'}))//删除游戏
            }
        })
        redis.get(gameRoomKey, function(err, res){
            if (err) {return console.error('error redis response - ' + err)}
            let gameRoom = JSON.parse(res)
            gameRoom.status = 0
            for(let i = 0; i < Object.keys(gameRoom.playerList).length; i++){
                if(gameRoom.playerList[i].id === game.gamePlayer[i].id){
                    gameRoom.playerList[i].ready = false
                    gameRoom.playerList[i].cards = gameRoom.playerList[i].cards + game.gamePlayer[i].cards
                    if(gameRoom.playerList[i].id === losePlayer){
                        gameRoom.playerList[i].loss = gameRoom.playerList[i].loss + 1
                        gameRoom.lastLoser = gameRoom.playerList[i].id
                    }
                    else if(gameRoom.playerList[i].id === winPlayer){
                        gameRoom.playerList[i].win = gameRoom.playerList[i].win + 1
                    }
                }
            }
            redis.set(gameRoomKey, JSON.stringify(gameRoom), function(err){
                if (err) {return console.error('error redis response - ' + err)}
                redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
                    if (err) {return console.error('error redis response - ' + err)}
                    redis.mget(list, function(err, gameRoomList){
                        if (err) {return console.error('error redis response - ' + err)}
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))//更新游戏列表
                            }
                        })
                    })
                })
            })
        })
        let changePlayerList = []
        game.gamePlayerId.forEach( id => { changePlayerList.push(conf.redisCache.playerPrefix + id) })
        if(changePlayerList.length === 0) return
        redis.mget( changePlayerList, function(err, resList){
            if (err) {return console.error('error redis response - ' + err)}
            if(resList.length === 0) return
            let redisMSetStr = []
            resList.forEach( playerItem => {
                let player = JSON.parse(playerItem)
                if( !player || player === null || Object.keys(player).length === 0) return
                player.player_status = 1
                redisMSetStr.push(conf.redisCache.playerPrefix + player.id)
                redisMSetStr.push(JSON.stringify(player))
            })
            redis.mset(redisMSetStr, function(err){
                if (err) {return console.error('error redis response - ' + err)}
                redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                    if (err) {return console.error('error redis response - ' + err)}
                    redis.mget(list, function(err, playerList){
                        if (err) {return console.error('error redis response - ' + err)}
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({type: 'playerList', data: playerList}))//更新玩家列表
                            }
                        })
                    })
                })
            })
        })
    })
}

async function saveGameData(game, wss, losePlayer, winPlayer, minCards, maxCards, maxCombo){
    const t = await sequelize.transaction()
        try{
            const Player = models.player
            const Game = models.game
            const Account = models.account
            let insertPlayersInfo = []
            let playerExpList = []
            let accounts = await Account.findAll({where:{ id: {[Op.in]: game.gamePlayerId}}})
            for(let i = 0; i < Object.keys(game.gamePlayer).length; i++){
                let player = game.gamePlayer[i]
                for(let j = 0; j < accounts.length; j++){
                    if( player.id === accounts[j].id){
                        let addExp = await calRecord( player, accounts[j], Math.floor(game.cardNum * 54 / game.gamePlayerId.length), losePlayer, winPlayer, game.gamePlayerId.length )
                        playerExpList.push({id: player.id, exp: addExp})
                        insertPlayersInfo.push({
                            nickname : player.nickname,
                            avatar_id : player.avatar_id,
                            cards : player.cards,
                            max_combo : player.maxCombo,
                            wukong : player.wukong,
                            bajie : player.bajie,
                            shaseng : player.shaseng,
                            tangseng : player.tangseng,
                            joker : player.joker,
                            seat_index : i,
                            accountId : accounts[j].id,
                        })
                        break
                    }
                }
            }
            let gameInfo = {
                max_cards : maxCards,
                min_cards : minCards,
                player_num : game.gamePlayerId.length,
                cardNum : game.cardNum,
                max_combo : maxCombo,
            }
            let insertedPlayers = await Player.bulkCreate(insertPlayersInfo)
            let insertedGame = await Game.create(gameInfo)
            insertedGame.addPlayers(insertedPlayers)
            let winPlayerNickname = ''
            let losePlayerNickname = ''
            let maxComboPlayer = ''
            insertedPlayers.forEach( insertedPlayer => {
                if(insertedPlayer.max_combo === maxCombo){
                    if(maxComboPlayer.length > 0){
                        maxComboPlayer = maxComboPlayer + ', ' + insertedPlayer.nickname
                    }
                    else{
                        maxComboPlayer = insertedPlayer.nickname
                    }
                }
                if(insertedPlayer.accountId === winPlayer){
                    winPlayerNickname = insertedPlayer.nickname
                }
                else if(insertedPlayer.accountId === losePlayer){
                    losePlayerNickname = insertedPlayer.nickname
                }
            })
            insertedGame.winner = winPlayerNickname
            insertedGame.loser = losePlayerNickname
            insertedGame.max_combo_player = maxComboPlayer
            let gameResultDto = {
                id: insertedGame.id,
                winnerNickname: winPlayerNickname,
                winnerCards: minCards,
                loserNickname: losePlayerNickname,
                loserCards: maxCards,
                cardsNum: game.cardNum,
                playersNum: game.gamePlayerId.length,
                maxCombo: maxCombo,
                maxComboPlayer: maxComboPlayer,
                gameResultList:[]
            }
            insertPlayersInfo.forEach( player => {
                gameResultDto.gameResultList.push({
                    id: player.accountId,
                    nickname: player.nickname,
                    avatar_id: player.avatar_id,
                    cards: player.cards,
                    seatIndex: player.seat_index, 
                    maxCombo: player.max_combo,
                    wukong: player.wukong, 
                    bajie: player.bajie, 
                    shaseng: player.shaseng, 
                    tangseng: player.tangseng, 
                    joker: player.joker
                })
            })
            let gameResultStr = JSON.stringify(gameResultDto)
            //各玩家获得的经验值数组
            gameResultDto.playerExpList = playerExpList
            let gameResultWithExpStr = JSON.stringify(gameResultDto)
            wss.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                    client.send(JSON.stringify({type: 'game', action: 'result', data: gameResultWithExpStr}))
                }
            })
            await insertedGame.save()
            t.afterCommit(() => {
                redis.multi()
                .set(conf.redisCache.gameRecordPrefix + insertedGame.id, gameResultStr)
                .expire(conf.redisCache.gameRecordPrefix + insertedGame.id, conf.redisCache.expire)
                .exec( function(err){
                    if (err) {return console.error('error redis response - ' + err)}
                })
            })
            await t.commit()
        }
        catch(e){
            console.error(e)
            await t.rollback()
        }
}

async function calRecord(player, playerInstance, averageCard, losePlayer, winPlayer, playerNum){
    let playerRecord = await playerInstance.getRecord()
    let exp = 50
    playerRecord.num_of_game = playerRecord.num_of_game + 1
    playerRecord.experienced_cards = playerRecord.experienced_cards + player.cards
    if(losePlayer === playerInstance.id){
        playerRecord.most_game = playerRecord.most_game + 1
        exp = 0
    }
    else if(winPlayer === playerInstance.id){
        playerRecord.least_game = playerRecord.least_game + 1
        exp = exp + (5 * playerNum)
    }
    if(player.maxCombo > playerRecord.max_combo){
        playerRecord.max_combo = player.maxCombo
    }
    let cardShareAverage = player.cards / averageCard
    let cardSharePoint = Math.floor( 50 * cardShareAverage)
    if(cardSharePoint < 100){
        exp = exp + 100 - cardSharePoint
    }
    playerRecord.experience = playerRecord.experience + exp
    if(cardShareAverage < 1){
        if(playerRecord.min_card_amount === 0 || cardShareAverage < (playerRecord.min_card / playerRecord.min_card_amount)){
            playerRecord.min_card_amount = averageCard
            playerRecord.min_card = player.cards
        }
    }
    else{
        if(playerRecord.max_card_amount === 0 || cardShareAverage > (playerRecord.max_card / playerRecord.max_card_amount)){
            playerRecord.max_card_amount = averageCard
            playerRecord.max_card = player.cards
        }
    }
    redis.exists(conf.redisCache.playerRecordPrefix + playerInstance.id, function(err, res){
        if (err) {return console.error('error redis response - ' + err)}
        /* 如果redis中有缓存则刷新该缓存中数据；如果没有则不必做任何处理，因为查询没缓存玩家的战绩时会自动从数据库中读取最新数据 */
        if(res === 1){
            redis.multi()
            .set(conf.redisCache.playerRecordPrefix + playerInstance.id, JSON.stringify(playerRecord, null, 4))
            .expire(conf.redisCache.playerRecordPrefix + playerInstance.id, conf.redisCache.expire)
            .exec(function(err){
                if (err) {return console.error('error redis response - ' + err)}
            })
        }
    })
    await playerRecord.save()
    return exp
}
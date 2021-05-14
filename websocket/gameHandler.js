const redis = require('../database/redis')
const WebSocket = require('ws')
const conf = require('../config/')
const poker = require('../common/poker')
const errors = require('../common/errors')
const models = require('../common/models')
const sequelize = require('../database/mysql').sequelize
const { Op } = require("sequelize");
const logger = require('../common/log')

module.exports = function(data ,wss, ws){
    try{
        let gameRoomKey = conf.redisCache.gameRoomPrefix + data.id
        let gameKey = conf.redisCache.gamePrefix + data.id
        if(data.action === 'initialize'){
            redis.watch(gameKey, gameRoomKey, function(err){
                if (err) {return logger.error('error redis response - ' + err)}
                try{
                    redis.get(gameKey, function(err, res){
                        if (err) {return logger.error('error redis response - ' + err)}
                        try{
                            if(res !== null)return
                            redis.get(gameRoomKey, function(err, gameRoomRes){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
                                    redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        try{
                                            redis.mget(list, function(err, playerListRes){
                                                if (err) {return logger.error('error redis response - ' + err)}
                                                try{
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
                                                    if(gameRoom.metamorphoseNum > 0){//插入变身牌
                                                        let addMetamorphoseNum = 0
                                                        for(let i = 0; i < pokers.length && addMetamorphoseNum < gameRoom.metamorphoseNum * gameRoom.cardNum; i++){
                                                            if(pokers[i] === 52 || pokers[i] === 53){
                                                                continue
                                                            }
                                                            else{
                                                                pokers[i] = pokers[i] + 100
                                                                addMetamorphoseNum = addMetamorphoseNum + 1
                                                            }
                                                        }
                                                        pokers = poker.shuffle(pokers)
                                                    }
                                                    let timer = setTimeout( function(){intervalCheckCard(wss, this, data.id)} , poker.waitTime)
                                                    let game = {
                                                        id: data.id,
                                                        clockwise: false,
                                                        currentPlayer: -1, //座位号
                                                        currentCard: [],
                                                        currentCardPlayer: -1,
                                                        jokerCard: [],
                                                        jokerCardPlayer: -1,
                                                        cardNum: gameRoom.cardNum,
                                                        metamorphoseNum: gameRoom.metamorphoseNum,
                                                        currentCombo: 0,
                                                        version: 0, //数据版本
                                                        timesCombo: 0, //多牌连击次数
                                                        timesCard: 0 , //多牌得到的额外牌数
                                                        timer: timer[Symbol.toPrimitive](),
                                                        gamePlayer: {
                                                            0: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0},
                                                            1: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0},
                                                            2: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0},
                                                            3: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0},
                                                            4: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0},
                                                            5: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0},
                                                            6: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0},
                                                            7: {id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0},
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
                                                        if (err) {return logger.error('error redis response - ' + err)}
                                                        try{
                                                            if(results === null){
                                                                ws.send(JSON.stringify({type: 'message', subType:'error', player_loc: data.id , text: errors.SET_ONLINE_ERROR.message}))
                                                            }
                                                            redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                                                                if (err) {return logger.error('error redis response - ' + err)}
                                                                try{
                                                                    redis.mget(list, function(err, playerList){
                                                                        if (err) {return logger.error('error redis response - ' + err)}
                                                                        wss.clients.forEach(function each(client) {
                                                                            if (client.readyState === WebSocket.OPEN) {
                                                                                client.send(JSON.stringify({type: 'playerList', data: playerList}))
                                                                            }
                                                                        })
                                                                    })
                                                                }
                                                                catch(e){
                                                                    logger.error(e)
                                                                }
                                                            })
                                                            redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
                                                                if (err) {return logger.error('error redis response - ' + err)}
                                                                try{
                                                                    redis.mget(list, function(err, gameRoomList){
                                                                        if (err) {return logger.error('error redis response - ' + err)}
                                                                        wss.clients.forEach(function each(client) {
                                                                            if (client.readyState === WebSocket.OPEN) {
                                                                                client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
                                                                            }
                                                                        })
                                                                    })
                                                                }
                                                                catch(e){
                                                                    logger.error(e)
                                                                }
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
                                                        }
                                                        catch(e){
                                                            logger.error(e)
                                                        }
                                                    })
                                                }
                                                catch(e){
                                                    logger.error(e)
                                                }
                                            })
                                        }
                                        catch(e){
                                            logger.error(e)
                                        }
                                    })
                                }
                                catch(e){
                                    logger.error(e)
                                }
                            })
                        }
                        catch(e){
                            logger.error(e)
                        }
                    })
                }
                catch(e){
                    logger.error(e)
                }
            })
        }
        else if(data.action === 'get'){
            redis.get( gameKey, function(err, res){
                if (err) {return logger.error('error redis response - ' + err)}
                try{
                    let game = JSON.parse(res)
                    game.remainCards = game.remainCards.length
                    game.messages = []
                    game.messages.push( '重新连接...')
                    game.messages.push( '等待 ' + game.gamePlayer[game.currentPlayer].nickname + ' 出牌...')
                    ws.send(JSON.stringify({type: 'game', action:'get', data: JSON.stringify(game)}))
                }
                catch(e){
                    logger.error(e)
                }
            })
        }
        else if(data.action === 'play'){
            redis.get( gameKey, function(err, res){
                if (err) {return logger.error('error redis response - ' + err)}
                try{
                    let game = JSON.parse(res)
                    if(game.currentPlayer === data.seatIndex){
                        let playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 打出了' + poker.getIndexOfCardList(data.playCard[0]).name
                        let numOfBianshen = 0
                        game.gamePlayer[game.currentPlayer].online = true
                        game.gamePlayer[game.currentPlayer].offLineTime = 0
                        clearTimeout(game.timer)
                        game.gamePlayer[data.seatIndex].remainCards = data.remainCards
                        if(data.playCard.length > 1){//多牌暴击
                            game.timesCombo = game.timesCombo + 1
                            let timesAddCard = game.timesCombo * data.playCard.length
                            game.timesCard = game.timesCard + timesAddCard
                            game.currentCombo = game.currentCombo + timesAddCard
                            if(game.timesCombo === 1){
                                game.timesCombo = data.playCard.length - 1 //2张从2起爆，3张从3开始，依次类推
                            }
                            data.playCard.forEach(n => {//记录变身牌，前端会把原形牌变为小于100，变身牌变为大于等于100，所以在此可以通过100来判断
                                if(n >= 100){
                                    game.gamePlayer[data.seatIndex].bianshen = game.gamePlayer[data.seatIndex].bianshen + 1
                                    numOfBianshen = numOfBianshen + 1
                                }
                            })
                        }
                        else{
                            game.currentCombo = game.currentCombo + data.playCard.length
                        }
                        if(game.currentCombo > game.maxCombo){
                            game.maxCombo = game.currentCombo
                        }
                        if(game.jokerCard.length > 0){
                            game.jokerCard = []
                            game.jokerCardPlayer = -1
                        }
                        if(poker.getIndexOfCardList(data.playCard[0]).num === 100){//反弹牌
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
                            if(poker.getIndexOfCardList(data.playCard[0]).num === 21){
                                game.gamePlayer[data.seatIndex].shaseng = game.gamePlayer[data.seatIndex].shaseng + data.playCard.length - numOfBianshen
                            }
                            else if(poker.getIndexOfCardList(data.playCard[0]).num === 22){
                                game.gamePlayer[data.seatIndex].bajie = game.gamePlayer[data.seatIndex].bajie + data.playCard.length - numOfBianshen
                            }
                            else if(poker.getIndexOfCardList(data.playCard[0]).num === 23){
                                game.gamePlayer[data.seatIndex].wukong = game.gamePlayer[data.seatIndex].wukong + data.playCard.length - numOfBianshen
                            }
                            else if(poker.getIndexOfCardList(data.playCard[0]).num === 31){
                                game.gamePlayer[data.seatIndex].tangseng = game.gamePlayer[data.seatIndex].tangseng + data.playCard.length - numOfBianshen
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
                        let timer = setTimeout( function(){intervalCheckCard(wss, this, game.id)} , getWaitTime(game))
                        game.timer = timer[Symbol.toPrimitive]()
                        sendGameInfo(gameKey, game, wss, 'update',[ playCardText ])
                    }
                    else{
                        ws.send(JSON.stringify({type: 'error', player_loc: data.id , text: errors.POKER_TIMER_EXPIRED.message}))
                    }
                }
                catch(e){
                    logger.error(e)
                }
            })
        }
        else if(data.action === 'discard'){
            redis.get( gameKey, function(err, res){
                if (err) {return logger.error('error redis response - ' + err)}
                try{
                    let game = JSON.parse(res)
                    if(game.currentPlayer === data.seatIndex){
                        game.gamePlayer[game.currentPlayer].online = true
                        game.gamePlayer[game.currentPlayer].offLineTime = 0
                        clearTimeout(game.timer)
                        if(game.currentCombo > game.gamePlayer[game.currentPlayer].maxCombo){
                            game.gamePlayer[game.currentPlayer].maxCombo = game.currentCombo
                        }
                        let playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 收下 ' + game.currentCombo + ' 张牌'
                        game.jokerCard = []
                        game.jokerCardPlayer = -1
                        game.gamePlayer[game.currentPlayer].cards = game.gamePlayer[game.currentPlayer].cards + game.currentCombo
                        game.currentCombo = 0
                        game.timesCombo = 0
                        game.currentCard = []
                        game.currentCardPlayer = -1
                        game.version = game.version + 1
                        let timer = setTimeout( function(){intervalCheckCard(wss, this, game.id)} , getWaitTime(game))
                        game.timer = timer[Symbol.toPrimitive]()
                        sendGameInfo(gameKey, game, wss, 'update', [playCardText])
                    }
                    else{
                        ws.send(JSON.stringify({type: 'error', player_loc: data.id , text: errors.POKER_TIMER_EXPIRED.message}))
                    }
                }
                catch(e){
                    logger.error(e)
                }
            })
        }
        else if(data.action === 'shiftOnline'){
            try{
                redis.watch( gameKey, function(err){
                    if (err) {return logger.error('error redis response - ' + err)}
                    redis.get( gameKey, function(err, res){
                        if (err) {return logger.error('error redis response - ' + err)}
                        try{
                            let game = JSON.parse(res)
                            game.gamePlayer[data.seatIndex].online = !game.gamePlayer[data.seatIndex].online
                            game.gamePlayer[data.seatIndex].offLineTime = 0
                            // game.version = game.version + 1  设置托管不更新数据版本
                            redis.multi()
                            .set(gameKey, JSON.stringify(game))
                            .exec(function(err, results){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
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
                                }
                                catch(e){
                                    logger.error(e)
                                }
                            })
                        }
                        catch(e){
                            logger.error(e)
                        }
                    })
                })
            }
            catch(e){
                logger.error(e)
            }
        }
        else if(data.action === 'textToPlayer'){
            redis.get( gameKey, function(err, res){
                if (err) {return logger.error('error redis response - ' + err)}
                try{
                    let game = JSON.parse(res)
                    wss.clients.forEach(function each(client) {
                        if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                            client.send(JSON.stringify({type: 'game', action: 'textToPlayer', data: {source: data.source, target: data.target, sourceId: data.sourceId, targetId: data.targetId, text: data.text, soundSrc: data.soundSrc} }))
                        }
                    })
                }
                catch(e){
                    logger.error(e)
                }
            })
        }
    }
    catch(e){
        logger.error(e)
    }
}

function intervalCheckCard(wss, thisTimer, id){
    try{
        let gameKey = conf.redisCache.gamePrefix + id
        redis.get( gameKey, function(err, res){
            if (err) {return logger.error('error redis response - ' + err)}
            try{
                let game = JSON.parse(res)
                if(thisTimer[Symbol.toPrimitive]() !== game.timer){
                    clearTimeout(game.timer)
                    wss.clients.forEach(function each(client) {
                        if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                            client.send(JSON.stringify({type: 'message', subType:'error', player_loc: id , text: errors.SERVER_BAD_STATUS.message}))
                        }
                    })
                }
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
                        if( poker.getIndexOfCardList(a).num === poker.getIndexOfCardList(b).num){
                            return poker.getIndexOfCardList(a).suit - poker.getIndexOfCardList(b).suit
                        }
                        else{
                            return poker.getIndexOfCardList(a).num - poker.getIndexOfCardList(b).num
                        }
                    })
                    game.currentCombo = 1
                    let playCard = game.gamePlayer[game.currentPlayer].remainCards.shift()
                    playCard = playCard < 100 ? playCard : playCard - 100
                    let playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 打出了' + poker.getIndexOfCardList(playCard).name
                    if(poker.getIndexOfCardList(playCard).num === 100){//反弹牌
                        game.gamePlayer[game.currentPlayer].joker = game.gamePlayer[game.currentPlayer].joker + 1
                        game.clockwise = !game.clockwise
                    }
                    else{
                        if(poker.getIndexOfCardList(playCard).num === 21){
                            game.gamePlayer[game.currentPlayer].shaseng = game.gamePlayer[game.currentPlayer].shaseng + 1
                        }
                        else if(poker.getIndexOfCardList(playCard).num === 22){
                            game.gamePlayer[game.currentPlayer].bajie = game.gamePlayer[game.currentPlayer].bajie + 1
                        }
                        else if(poker.getIndexOfCardList(playCard).num === 23){
                            game.gamePlayer[game.currentPlayer].wukong = game.gamePlayer[game.currentPlayer].wukong + 1
                        }
                        else if(poker.getIndexOfCardList(playCard).num === 31){
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
                    let timer = setTimeout( function(){intervalCheckCard(wss, this, game.id )} , getWaitTime(game))
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
                    game.timesCombo = 0
                    game.currentCard = []
                    game.currentCardPlayer = -1
                    game.version = game.version + 1
                    let timer = setTimeout( function(){intervalCheckCard(wss, this, game.id )} , getWaitTime(game))
                    game.timer = timer[Symbol.toPrimitive]()
                    sendGameInfo(gameKey, game, wss, 'update', [playCardText])
                }
            }
            catch(e){
                logger.error(e)
            }
        })
    }
    catch(e){
        logger.error(e)
    }
}

function sendGameInfo(gameKey, game, wss, action, messageList){
    redis.set(gameKey, JSON.stringify(game), function(err){
        if (err) {return logger.error('error redis response - ' + err)}
        try{
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
        }
        catch(e){
            logger.error(e)
        }
    })
}

function getWaitTime(game){
    try{
        if(game.gamePlayer[game.currentPlayer].online === false){
            return poker.offLineWaitTime
        }
        else{
            return poker.waitTime
        }
    }
    catch(e){
        logger.error(e)
    }
}

function gameover(gameKey, game, wss){
    try{
        game.currentPlayer = -1
        game.currentCard = []
        game.currentCardPlayer = -1
        game.jokerCard = []
        game.jokerCardPlayer = -1
        game.currentCombo = 0
        game.timesCombo = 0
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
            if (err) {return logger.error('error redis response - ' + err)}
            try{
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
            }
            catch(e){
                logger.error(e)
            }
        })
        setTimeout(function(){
            deleteGame(game, wss, losePlayer, winPlayer)
        }, 3000)
    }
    catch(e){
        logger.error(e)
    }
}

function deleteGame(game, wss, losePlayer, winPlayer){
    try{
        let gameRoomKey = conf.redisCache.gameRoomPrefix + game.id
        let gameKey = conf.redisCache.gamePrefix + game.id
        redis.del(gameKey, function(err){
            if (err) {return logger.error('error redis response - ' + err)}
            try{
                wss.clients.forEach(function each(client) {
                    if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                        client.send(JSON.stringify({type: 'game', action: 'delete'}))//删除游戏
                    }
                })
                redis.get(gameRoomKey, function(err, res){
                    if (err) {return logger.error('error redis response - ' + err)}
                    try{
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
                            if (err) {return logger.error('error redis response - ' + err)}
                            try{
                                redis.keys(conf.redisCache.gameRoomPrefix + '*', function(err, list){
                                    if (err) {return logger.error('error redis response - ' + err)}
                                    redis.mget(list, function(err, gameRoomList){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        wss.clients.forEach(function each(client) {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))//更新游戏列表
                                            }
                                        })
                                    })
                                })
                            }
                            catch(e){
                                logger.error(e)
                            }
                        })
                    }
                    catch(e){
                        logger.error(e)
                    }
                })
                let changePlayerList = []
                game.gamePlayerId.forEach( id => { changePlayerList.push(conf.redisCache.playerPrefix + id) })
                if(changePlayerList.length === 0) return
                redis.mget( changePlayerList, function(err, resList){
                    if (err) {return logger.error('error redis response - ' + err)}
                    try{
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
                            if (err) {return logger.error('error redis response - ' + err)}
                            try{
                                redis.keys(conf.redisCache.playerPrefix + '*', function(err, list){
                                    if (err) {return logger.error('error redis response - ' + err)}
                                    redis.mget(list, function(err, playerList){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        try{
                                            wss.clients.forEach(function each(client) {
                                                if (client.readyState === WebSocket.OPEN) {
                                                    client.send(JSON.stringify({type: 'playerList', data: playerList}))//更新玩家列表
                                                }
                                            })
                                        }
                                        catch(e){
                                            logger.error(e)
                                        }
                                    })
                                })
                            }
                            catch(e){
                                logger.error(e)
                            }
                        })
                    }
                    catch(e){
                        logger.error(e)
                    }
                })
            }
            catch(e){
                logger.error(e)
            }
        })
    }
    catch(e){
        logger.error(e)
    }
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
                        let addExp = await calRecord( player, accounts[j], Math.floor((game.cardNum * 54  + game.timesCard )/ game.gamePlayerId.length), losePlayer, winPlayer, game.gamePlayerId.length )
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
                            bianshen : player.bianshen,
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
                    joker: player.joker,
                    bianshen: player.bianshen
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
                    if (err) {return logger.error('error redis response - ' + err)}
                })
            })
            await t.commit()
        }
        catch(e){
            logger.error(e)
            await t.rollback()
        }
}

async function calRecord(player, playerInstance, averageCard, losePlayer, winPlayer, playerNum){
    try{
        let playerRecord = await playerInstance.getRecord()
        let exp = 50
        playerRecord.num_of_game = playerRecord.num_of_game + 1
        playerRecord.experienced_cards = playerRecord.experienced_cards + player.cards
        /* 吃鸡拉跨 */
        if(losePlayer === playerInstance.id){
            playerRecord.most_game = playerRecord.most_game + 1
            exp = 0
        }
        else if(winPlayer === playerInstance.id){
            playerRecord.least_game = playerRecord.least_game + 1
            exp = exp + (5 * playerNum)
        }
        /* 单次最大 */
        if(player.maxCombo > playerRecord.max_combo){
            playerRecord.max_combo = player.maxCombo
        }
        /* 最多最少收牌数 */
        if(playerRecord.least_cards === -1 || playerRecord.least_cards > player.cards){
            playerRecord.least_cards = player.cards
        }
        if(playerRecord.most_cards < player.cards){
            playerRecord.most_cards = player.cards
        }
    
        /* 最低最高占比 */
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
            if (err) {return logger.error('error redis response - ' + err)}
            /* 如果redis中有缓存则刷新该缓存中数据；如果没有则不必做任何处理，因为查询没缓存玩家的战绩时会自动从数据库中读取最新数据 */
            try{
                if(res === 1){
                    redis.multi()
                    .set(conf.redisCache.playerRecordPrefix + playerInstance.id, JSON.stringify(playerRecord, null, 4))
                    .expire(conf.redisCache.playerRecordPrefix + playerInstance.id, conf.redisCache.expire)
                    .exec(function(err){
                        if (err) {return logger.error('error redis response - ' + err)}
                    })
                }
            }
            catch(e){
                logger.error(e)
            }
        })
        await playerRecord.save()
        return exp
    }
    catch(e){
        logger.error(e)
        return 0
    }
}
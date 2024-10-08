const WebSocket = require('ws')
const { asyncGet, asyncSet, asyncExists, asyncMget, asyncKeys, asyncMset, asyncDel, asyncWatch, asyncMultiExec } = require('../database/redis')
const conf = require('../config/')
const poker = require('../common/poker')
const errors = require('../common/errors')
const Player = require('../models/player')
const AiPlayer = require('../models/aiPlayer')
const Account = require('../models/account')
const Game = require('../models/game')
const sequelize = require('../database/mysql').sequelize
const { Op } = require("sequelize");
const logger = require('../common/log')
const { aiPlay, aiPlayerMetaData } = require('../ai/playCard')
/**
 * @typedef {import('../types/record').SequelizedModelRecord}
 * @typedef {import('../types/room.js').RedisCacheRoomInfo}
 * @typedef {import('../types/player.js').RedisCachePlayer}
 * @typedef {import('../types/player.js').RedisCachePlayerInGame}
 * @typedef {import('../types/game.js').GamePlayerSeatIndex}
 * @typedef {import('../types/game.js').RedisCacheGame}
 * @typedef {import('../types/game.js').PlayerExp}
 * @typedef {import('../types/game.js').GameResultDto}
 * @typedef {import('../types/game.js').GameWebsocketRequestData}
 * @typedef {import('../types/websocket.js').WebSocketServerInfo}
 * @typedef {import('../types/websocket.js').WebSocketInfo}
 * @typedef {import('../types/player').SequelizedModelAccount}
 * @typedef {import('../types/player').SequelizedModelGame}
 * @typedef {import('../types/player').SequelizedModelPlayer}
 * @typedef {import('../types/player').SequelizedModelAiPlayer}
 */

/**
 * @param {GameWebsocketRequestData} data 游戏的前端请求信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {WebSocketInfo} ws 单一玩家的WebSocket连接(附带玩家信息)。
 * @returns {Promise<void>}
 */
module.exports = async function (data, wss, ws) {
    try {
        const gameRoomKey = conf.redisCache.gameRoomPrefix + data.id
        const gameKey = conf.redisCache.gamePrefix + data.id
        if (data.action === 'initialize') {
            await asyncWatch(gameKey, gameRoomKey)
            const gameRes = await asyncGet(gameKey)
            if (gameRes !== null) {
                return
            }
            const gameRoomRes = await asyncGet(gameRoomKey)
            const playerKeys = await asyncKeys(conf.redisCache.playerPrefix + '*')
            const playerListRes = await asyncMget(playerKeys)
            /** @type {RedisCacheRoomInfo} */
            const gameRoom = JSON.parse(gameRoomRes) //游戏房间
            /** @type {string[]} */
            const redisMSetStrList = [] //mSet批量改变玩家游戏状态的redis语句
            /** @type {RedisCachePlayerInGame[]} */
            const gamePlayerList = []  //player:列表
            /** @type {number[]} */
            const pokers = [] //扑克牌数字列表
            for (let i = 0; i < gameRoom.cardNum; i++) {
                for (let j = 0; j < 54; j++) {
                    pokers.push(j)
                }
            }
            poker.shuffle(pokers)
            if (gameRoom.metamorphoseNum > 0) {//插入变身牌
                let addMetamorphoseNum = 0
                for (let i = 0; i < pokers.length && addMetamorphoseNum < gameRoom.metamorphoseNum * gameRoom.cardNum; i++) {
                    if (pokers[i] === 52 || pokers[i] === 53) {
                        continue
                    }
                    else {
                        pokers[i] = pokers[i] + 100
                        addMetamorphoseNum = addMetamorphoseNum + 1
                    }
                }
                poker.shuffle(pokers)
            }
            const game = {
                id: data.id,
                clockwise: false,
                /** @type {GamePlayerSeatIndex} */
                currentPlayer: -1, //座位号
                /** @type {number[]} */
                currentCard: [],
                /** @type {GamePlayerSeatIndex} */
                currentCardPlayer: -1,
                /** @type {number[]} */
                jokerCard: [],
                /** @type {GamePlayerSeatIndex} */
                jokerCardPlayer: -1,
                cardNum: gameRoom.cardNum,
                metamorphoseNum: gameRoom.metamorphoseNum,
                currentCombo: 0,
                version: 0, //数据版本
                timesCombo: 0, //多牌连击次数
                timesCard: 0, //多牌得到的额外牌数
                timer: null,
                gamePlayer: {
                    0: { id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0 },
                    1: { id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0 },
                    2: { id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0 },
                    3: { id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0 },
                    4: { id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0 },
                    5: { id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0 },
                    6: { id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0 },
                    7: { id: 0, nickname: '', avatar_id: 0, cards: 0, remainCards: [], maxCombo: 0, online: false, offLineTime: 0, offLinePlayCard: 0, wukong: 0, bajie: 0, shaseng: 0, tangseng: 0, joker: 0, bianshen: 0 },
                },
                /** @type {number[]} */
                gamePlayerId: [],
                /** @type {number[]} */
                remainCards: pokers, //发送给玩家时只发送长度,
                /** @type {string[]} */
                messages: []
            }
            for (let i = 0; i < playerListRes.length; i++) {
                /** @type {RedisCachePlayerInGame} */
                const player = JSON.parse(playerListRes[i])
                gamePlayerList.push(player)
            }
            for (let i = 0; i < Object.keys(gameRoom.playerList).length; i++) {
                /** @type {GamePlayerSeatIndex} */
                const iSeatIndex = i
                if (gameRoom.playerList[iSeatIndex].id !== 0) {
                    game.gamePlayerId.push(gameRoom.playerList[iSeatIndex].id)
                    if (game.currentPlayer === -1) {
                        game.currentPlayer = iSeatIndex
                    }
                    for (let j = 0; j < gamePlayerList.length; j++) {
                        /** 是否该给改玩家发牌 */
                        let shouldDeal = false
                        /** @type {GamePlayerSeatIndex} */
                        const jSeatIndex = j
                        /* 某玩家在房间中，获取该玩家昵称，设置信息，并改变其在玩家列表中的状态 */
                        if (gameRoom.playerList[iSeatIndex].id === gamePlayerList[jSeatIndex].id) {
                            game.gamePlayer[iSeatIndex].id = gamePlayerList[jSeatIndex].id
                            game.gamePlayer[iSeatIndex].nickname = gamePlayerList[jSeatIndex].nickname
                            game.gamePlayer[iSeatIndex].avatar_id = gamePlayerList[jSeatIndex].avatar_id
                            game.gamePlayer[iSeatIndex].online = true
                            gamePlayerList[jSeatIndex].player_status = 2
                            redisMSetStrList.push(conf.redisCache.playerPrefix + gamePlayerList[jSeatIndex].id)
                            redisMSetStrList.push(JSON.stringify(gamePlayerList[jSeatIndex]))
                            shouldDeal = true
                        }
                        else if (gameRoom.playerList[iSeatIndex].id < 0) { // 电脑玩家
                            const aiPlayer = aiPlayerMetaData[-1 * (gameRoom.playerList[iSeatIndex].id + 1)]
                            game.gamePlayer[iSeatIndex].id = aiPlayer.id
                            game.gamePlayer[iSeatIndex].nickname = aiPlayer.nickname
                            game.gamePlayer[iSeatIndex].avatar_id = aiPlayer.avatar_id
                            game.gamePlayer[iSeatIndex].online = true
                            shouldDeal = true
                        }
                        if (shouldDeal) {
                            /* 发牌 */
                            while (game.gamePlayer[iSeatIndex].remainCards.length < 5) {
                                game.gamePlayer[iSeatIndex].remainCards.push(game.remainCards.pop())
                            }
                            if (gameRoom.playerList[iSeatIndex].id === gameRoom.lastLoser && gameRoom.lastLoser !== 0) {
                                game.currentPlayer = iSeatIndex
                            }
                            break
                        }
                    }
                }
            }
            const timer = getPlayCardTimer(game, game.currentPlayer, wss, poker.waitTime)
            game.timer = timer[Symbol.toPrimitive]()
            gameRoom.status = 1
            await asyncMultiExec([['mset', ...redisMSetStrList], ['set', gameRoomKey, JSON.stringify(gameRoom)], ['set', gameKey, JSON.stringify(game)]])()
            const newPlayerKeys = await asyncKeys(conf.redisCache.playerPrefix + '*')
            const newPlayerList = await asyncMget(newPlayerKeys)
            const newGameRoomKeys = await asyncKeys(conf.redisCache.gameRoomPrefix + '*')
            const newGameRoomList = await asyncMget(newGameRoomKeys)
            const newPlayerListStr = JSON.stringify({ type: 'playerList', data: newPlayerList })
            const newGameRoomListStr = JSON.stringify({ type: 'gameRoomList', data: newGameRoomList })
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(newPlayerListStr)
                    client.send(newGameRoomListStr)
                }
            })
            game.remainCards = game.remainCards.length
            game.messages = []
            /** @type {string[]} */
            const messageList = ['游戏开始']
            messageList.forEach(text => game.messages.push(text))
            game.messages.push('等待 ' + game.gamePlayer[game.currentPlayer].nickname + ' 出牌...')
            const gameStr = JSON.stringify(game)
            const initializeGameStr = JSON.stringify({ type: 'game', action: 'initialize', data: gameStr })
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                    client.send(initializeGameStr)
                }
            })
        }
        else if (data.action === 'get') {
            const gameRes = await asyncGet(gameKey)
            /** @type {RedisCacheGame} */
            const game = JSON.parse(gameRes)
            game.remainCards = game.remainCards.length
            game.messages = []
            game.messages.push('重新连接...')
            game.messages.push('等待 ' + game.gamePlayer[game.currentPlayer].nickname + ' 出牌...')
            ws.send(JSON.stringify({ type: 'game', action: 'get', data: JSON.stringify(game) }))

        }
        else if (data.action === 'play') {
            const gameRes = await asyncGet(gameKey)
            /** @type {RedisCacheGame} */
            const game = JSON.parse(gameRes)
            if (game.currentPlayer === data.seatIndex) {
                const playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 打出了' + poker.getIndexOfCardList(data.playCard[0]).name
                let numOfBianshen = 0
                game.gamePlayer[game.currentPlayer].online = true
                game.gamePlayer[game.currentPlayer].offLineTime = 0
                clearTimeout(game.timer)
                game.gamePlayer[data.seatIndex].remainCards = data.remainCards
                if (data.playCard.length > 1) {//多牌连击
                    game.timesCombo = game.timesCombo + 1
                    const timesComboFromPlayer = Math.min(game.timesCombo * data.playCard.length, game.gamePlayer[game.currentPlayer].cards)
                    const timesAddCard = data.playCard.length + timesComboFromPlayer //连击所附加的牌出自玩家的收牌
                    game.gamePlayer[game.currentPlayer].cards -= timesComboFromPlayer
                    game.timesCard = game.timesCard + timesAddCard
                    game.currentCombo = game.currentCombo + timesAddCard
                    data.playCard.forEach(n => {//记录变身牌，前端会把原形牌变为小于100，变身牌变为大于等于100，所以在此可以通过100来判断
                        if (n >= 100) {
                            /** @type {GamePlayerSeatIndex} */
                            const dataSeatIndex = data.seatIndex
                            game.gamePlayer[dataSeatIndex].bianshen = game.gamePlayer[dataSeatIndex].bianshen + 1
                            numOfBianshen = numOfBianshen + 1
                        }
                    })
                }
                else {
                    game.currentCombo = game.currentCombo + data.playCard.length
                }
                if (game.jokerCard.length > 0) {
                    game.jokerCard = []
                    game.jokerCardPlayer = -1
                }
                if (poker.getIndexOfCardList(data.playCard[0]).num === 100) {//反弹牌
                    game.gamePlayer[data.seatIndex].joker = game.gamePlayer[data.seatIndex].joker + data.playCard.length
                    game.clockwise = !game.clockwise
                    if (game.currentCard.length === 0) {
                        game.currentCard = data.playCard
                        game.currentCardPlayer = data.seatIndex
                    }
                    else {
                        game.jokerCard = data.playCard
                        game.jokerCard.sort()
                        game.jokerCardPlayer = data.seatIndex
                    }
                }
                else {
                    game.currentCard = data.playCard
                    game.currentCardPlayer = data.seatIndex
                    if (poker.getIndexOfCardList(data.playCard[0]).num === 21) {
                        game.gamePlayer[data.seatIndex].shaseng = game.gamePlayer[data.seatIndex].shaseng + data.playCard.length - numOfBianshen
                    }
                    else if (poker.getIndexOfCardList(data.playCard[0]).num === 22) {
                        game.gamePlayer[data.seatIndex].bajie = game.gamePlayer[data.seatIndex].bajie + data.playCard.length - numOfBianshen
                    }
                    else if (poker.getIndexOfCardList(data.playCard[0]).num === 23) {
                        game.gamePlayer[data.seatIndex].wukong = game.gamePlayer[data.seatIndex].wukong + data.playCard.length - numOfBianshen
                    }
                    else if (poker.getIndexOfCardList(data.playCard[0]).num === 31) {
                        game.gamePlayer[data.seatIndex].tangseng = game.gamePlayer[data.seatIndex].tangseng + data.playCard.length - numOfBianshen
                    }
                }
                if (game.remainCards.length <= 0 && game.gamePlayer[game.currentPlayer].cards >= 1) { // 无牌补时，连击数+1
                    game.currentCombo += 1
                    game.gamePlayer[game.currentPlayer].cards -= 1
                }
                while (game.gamePlayer[data.seatIndex].remainCards.length < 5 && game.remainCards.length > 0) {//补牌
                    game.gamePlayer[data.seatIndex].remainCards.push(game.remainCards.pop())
                }
                let hasPlayerPlayCard = false
                const step = game.clockwise ? -1 : 1
                /** @type {GamePlayerSeatIndex} */
                let nextSeatIndex = data.seatIndex + step
                for (let i = 0; i < 7; i++) {
                    if (nextSeatIndex > 7) {
                        nextSeatIndex = 0
                    }
                    else if (nextSeatIndex < 0) {
                        nextSeatIndex = 7
                    }
                    if (game.gamePlayer[nextSeatIndex].remainCards.length > 0) {
                        hasPlayerPlayCard = true
                        game.currentPlayer = nextSeatIndex
                        break
                    }
                    nextSeatIndex = nextSeatIndex + step
                }
                game.version = game.version + 1
                if (!hasPlayerPlayCard) {
                    await sendGameInfo(gameKey, game, wss, 'update', [playCardText])
                    await gameover(gameKey, game, wss)
                    return
                }
                const timer = getPlayCardTimer(game, game.currentPlayer, wss, getWaitTime(game))
                game.timer = timer[Symbol.toPrimitive]()
                await sendGameInfo(gameKey, game, wss, 'update', [playCardText])
            }
            else {
                ws?.send(JSON.stringify({ type: 'error', player_loc: data.id, text: errors.POKER_TIMER_EXPIRED.message }))
            }
        }
        else if (data.action === 'discard') {
            const { cheerChatHandler } = require('../ai/chat.js')
            const gameRes = await asyncGet(gameKey)
            /** @type {RedisCacheGame} */
            const game = JSON.parse(gameRes)
            cheerChatHandler(game)
            if (game.currentPlayer === data.seatIndex) {
                game.gamePlayer[game.currentPlayer].online = true
                game.gamePlayer[game.currentPlayer].offLineTime = 0
                clearTimeout(game.timer)
                if (game.currentCombo > game.gamePlayer[game.currentPlayer].maxCombo) {
                    game.gamePlayer[game.currentPlayer].maxCombo = game.currentCombo
                }
                const playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 收下 ' + game.currentCombo + ' 张牌'
                game.jokerCard = []
                game.jokerCardPlayer = -1
                game.gamePlayer[game.currentPlayer].cards = game.gamePlayer[game.currentPlayer].cards + game.currentCombo
                game.currentCombo = 0
                game.timesCombo = 0
                game.currentCard = []
                game.currentCardPlayer = -1
                game.version = game.version + 1
                const timer = getPlayCardTimer(game, game.currentPlayer, wss, getWaitTime(game))
                game.timer = timer[Symbol.toPrimitive]()
                await sendGameInfo(gameKey, game, wss, 'update', [playCardText])
            }
            else {
                ws?.send(JSON.stringify({ type: 'error', player_loc: data.id, text: errors.POKER_TIMER_EXPIRED.message }))
            }

        }
        else if (data.action === 'shiftOnline') {
            await asyncWatch(gameKey)
            const gameRes = await asyncGet(gameKey)
            /** @type {RedisCacheGame} */
            const game = JSON.parse(gameRes)
            /** @type {RedisCachePlayerInGame} */
            const player = game.gamePlayer[data.seatIndex]
            player.online = !player.online
            player.offLineTime = 0
            // game.version = game.version + 1  设置托管不更新数据版本
            await asyncSet(gameKey, JSON.stringify(game))
            if (player.online) {
                ws.send(JSON.stringify({ type: 'message', subType: 'success', player_loc: data.id, text: '已取消托管' }))
            }
            else {
                ws.send(JSON.stringify({ type: 'message', subType: 'warning', player_loc: data.id, text: '已托管' }))
            }
            const shiftOnlineStr = JSON.stringify({ type: 'game', action: 'shiftOnline', seatIndex: data.seatIndex, online: player.online })
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                    client.send(shiftOnlineStr)
                }
            })
        }
        else if (data.action === 'textToPlayer') {
            const gameRes = await asyncGet(gameKey)
            /** @type {RedisCacheGame} */
            const game = JSON.parse(gameRes)
            const textToPlayerStr = JSON.stringify({ type: 'game', action: 'textToPlayer', data: { source: data.source, target: data.target, sourceId: data.sourceId, targetId: data.targetId, text: data.text, soundSrc: data.soundSrc } })
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                    client.send(textToPlayerStr)
                }
            })
        }
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}

/**
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {NodeJS.Timeout} thisTimer 计时器。
 * @param {number} id 游戏id。
 * @returns {Promise<void>}
 */
async function intervalCheckCard(wss, thisTimer, id) {
    try {
        const gameKey = conf.redisCache.gamePrefix + id
        const gameRes = await asyncGet(gameKey)
        /** @type {RedisCacheGame} */
        const game = JSON.parse(gameRes)
        if (thisTimer[Symbol.toPrimitive]() !== game.timer) {
            clearTimeout(game.timer)
            const messageStr = JSON.stringify({ type: 'message', subType: 'error', player_loc: id, text: errors.SERVER_BAD_STATUS.message })
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                    client.send(messageStr)
                }
            })
        }
        game.gamePlayer[game.currentPlayer].offLineTime = game.gamePlayer[game.currentPlayer].offLineTime + 1 //玩家超时次数
        game.gamePlayer[game.currentPlayer].offLinePlayCard = game.gamePlayer[game.currentPlayer].offLinePlayCard + 1 //玩家托管打出的牌数
        if (game.gamePlayer[game.currentPlayer].offLineTime > 1 && game.gamePlayer[game.currentPlayer].online) {
            game.gamePlayer[game.currentPlayer].online = false //托管
            const messageStr = JSON.stringify({ type: 'message', subType: 'warning', player_loc: id, text: '无操作响应，进入托管状态' })
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && game.gamePlayer[game.currentPlayer].id === client.userId) {
                    client.send(messageStr)
                }
            })
        }
        /* 现在牌池没有牌的情况 */
        if (game.currentCard.length === 0) {
            game.gamePlayer[game.currentPlayer].remainCards.sort((a, b) => {
                if (poker.getIndexOfCardList(a).num === poker.getIndexOfCardList(b).num) {
                    return poker.getIndexOfCardList(a).suit - poker.getIndexOfCardList(b).suit
                }
                else {
                    return poker.getIndexOfCardList(a).num - poker.getIndexOfCardList(b).num
                }
            })
            game.currentCombo = 1
            let playCard = game.gamePlayer[game.currentPlayer].remainCards.shift()
            playCard = playCard < 100 ? playCard : playCard - 100
            const playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 打出了' + poker.getIndexOfCardList(playCard).name
            if (poker.getIndexOfCardList(playCard).num === 100) {//反弹牌
                game.gamePlayer[game.currentPlayer].joker = game.gamePlayer[game.currentPlayer].joker + 1
                game.clockwise = !game.clockwise
            }
            else {
                if (poker.getIndexOfCardList(playCard).num === 21) {
                    game.gamePlayer[game.currentPlayer].shaseng = game.gamePlayer[game.currentPlayer].shaseng + 1
                }
                else if (poker.getIndexOfCardList(playCard).num === 22) {
                    game.gamePlayer[game.currentPlayer].bajie = game.gamePlayer[game.currentPlayer].bajie + 1
                }
                else if (poker.getIndexOfCardList(playCard).num === 23) {
                    game.gamePlayer[game.currentPlayer].wukong = game.gamePlayer[game.currentPlayer].wukong + 1
                }
                else if (poker.getIndexOfCardList(playCard).num === 31) {
                    game.gamePlayer[game.currentPlayer].tangseng = game.gamePlayer[game.currentPlayer].tangseng + 1
                }
            }
            game.currentCardPlayer = game.currentPlayer
            game.currentCard = []
            game.currentCard.push(playCard)
            if (game.remainCards.length > 0) {
                game.gamePlayer[game.currentPlayer].remainCards.push(game.remainCards.pop())
            }
            let hasPlayerPlayCard = false
            const step = game.clockwise ? -1 : 1
            let nextSeatIndex = game.currentPlayer + step
            for (let i = 0; i < 7; i++) {
                if (nextSeatIndex > 7) {
                    nextSeatIndex = 0
                }
                else if (nextSeatIndex < 0) {
                    nextSeatIndex = 7
                }
                if (game.gamePlayer[nextSeatIndex].remainCards.length > 0) {
                    hasPlayerPlayCard = true
                    game.currentPlayer = nextSeatIndex
                    break
                }
                nextSeatIndex = nextSeatIndex + step
            }
            game.version = game.version + 1
            if (!hasPlayerPlayCard) {
                await sendGameInfo(gameKey, game, wss, 'update', [playCardText])
                await gameover(gameKey, game, wss)
                return
            }
            const timer = getPlayCardTimer(game, game.currentPlayer, wss, getWaitTime(game))
            game.timer = timer[Symbol.toPrimitive]()
            await sendGameInfo(gameKey, game, wss, 'update', [playCardText])
        }
        /* 牌池有牌的情况 */
        else {
            if (game.currentCombo > game.gamePlayer[game.currentPlayer].maxCombo) {
                game.gamePlayer[game.currentPlayer].maxCombo = game.currentCombo
            }
            const playCardText = game.gamePlayer[game.currentPlayer].nickname + ' 收下 ' + game.currentCombo + ' 张牌'
            game.jokerCard = []
            game.jokerCardPlayer = -1
            game.gamePlayer[game.currentPlayer].cards = game.gamePlayer[game.currentPlayer].cards + game.currentCombo
            game.currentCombo = 0
            game.timesCombo = 0
            game.currentCard = []
            game.currentCardPlayer = -1
            game.version = game.version + 1
            const timer = getPlayCardTimer(game, game.currentPlayer, wss, getWaitTime(game))
            game.timer = timer[Symbol.toPrimitive]()
            await sendGameInfo(gameKey, game, wss, 'update', [playCardText])
        }
    } catch (e) {
        logger.error(e)
    }
}

/**
 * @param {string} gamekey Redis中的游戏key。
 * @param {RedisCacheGame} game Redis中的游戏信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {string} action 具体操作。
 * @param {string[]} messageList 游戏信息。
 * @returns {Promise<void>}
 */
async function sendGameInfo(gameKey, game, wss, action, messageList) {
    try {
        await asyncSet(gameKey, JSON.stringify(game))
        game.remainCards = game.remainCards.length
        game.messages = []
        messageList.forEach(text => game.messages.push(text))
        game.messages.push('等待 ' + game.gamePlayer[game.currentPlayer].nickname + ' 出牌...')
        const gameStr = JSON.stringify(game)
        const gameInfoStr = JSON.stringify({ type: 'game', action: action, data: gameStr })
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                client.send(gameInfoStr)
            }
        })
    } catch (e) {
        logger.error(e)
    }
}

/**
 * @param {RedisCacheGame} game Redis中的游戏信息。
 * @returns {number} 计时器等待时间。
 */
function getWaitTime(game) {
    if (game.gamePlayer[game.currentPlayer].online === false) {
        return poker.offLineWaitTime
    }
    return poker.waitTime
}

/**
 * @param {string} gameKey Redis中游戏key。
 * @param {RedisCacheGame} game Redis中的游戏信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @returns {Promise<void>}
 */
async function gameover(gameKey, game, wss) {
    try {
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
        let maxCombo = 0
        /** @type {RedisCachePlayerInGame[]} */
        const cardsSortList = []
        for (let i = 0; i < Object.keys(game.gamePlayer).length; i++) {
            /** @type {GamePlayerSeatIndex} */
            const seatIndex = i
            game.gamePlayer[seatIndex].remainCards = []
            if (game.gamePlayer[seatIndex].id !== 0) {
                cardsSortList.push(game.gamePlayer[seatIndex])
            }
        }
        cardsSortList.sort(function (x, y) {//增序排成绩
            if (x.cards !== y.cards) {
                return x.cards - y.cards
            }
            if (x.maxCombo !== y.maxCombo) {
                return x.maxCombo - y.maxCombo
            }
            return (5 * x.joker + 4 * x.wukong + 3 * x.bajie + 2 * x.shaseng + x.tangseng) - (5 * y.joker + 4 * y.wukong + 3 * y.bajie + 2 * y.shaseng + y.tangseng)
        })
        losePlayer = cardsSortList[cardsSortList.length - 1].id
        winPlayer = cardsSortList[0].id
        maxCards = cardsSortList[cardsSortList.length - 1].cards
        minCards = cardsSortList[0].cards
        cardsSortList.sort(function (x, y) {//排最大combo
            return x.maxCombo - y.maxCombo
        })
        maxCombo = cardsSortList[cardsSortList.length - 1].maxCombo
        await asyncSet(gameKey, JSON.stringify(game))
        game.remainCards = 0
        game.messages = ['游戏结束，正在结算...']
        const gameStr = JSON.stringify(game)
        const updateGameInfoStr = JSON.stringify({ type: 'game', action: 'update', data: gameStr })
        setTimeout(function () {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                    client.send(updateGameInfoStr)
                }
            })
        }, 1000)
        setTimeout(function () {
            saveGameData(game, wss, losePlayer, winPlayer, minCards, maxCards, maxCombo)
        }, 2000)
        setTimeout(function () {
            deleteGame(game, wss, losePlayer, winPlayer)
        }, 3000)
    } catch (e) {
        logger.error(e)
    }
}

/**
 * @param {RedisCacheGame} game Redis中的游戏信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {number} losePlayer 拉跨玩家id
 * @param {number} winPlayer 吃鸡玩家id
 * @returns {Promise<void>}
 */
async function deleteGame(game, wss, losePlayer, winPlayer) {
    try {
        const gameRoomKey = conf.redisCache.gameRoomPrefix + game.id
        const gameKey = conf.redisCache.gamePrefix + game.id
        await asyncDel(gameKey)
        const deleteGameStr = JSON.stringify({ type: 'game', action: 'delete' })
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                client.send(deleteGameStr)//删除游戏
            }
        })
        const gameRoomRes = await asyncGet(gameRoomKey)
        await asyncGet(gameRoomKey)
        /** @type {RedisCacheRoomInfo} */
        const gameRoom = JSON.parse(gameRoomRes)
        gameRoom.status = 0
        for (let i = 0; i < Object.keys(gameRoom.playerList).length; i++) {
            /** @type {GamePlayerSeatIndex} */
            const seatIndex = i
            if (gameRoom.playerList[seatIndex].id === game.gamePlayer[seatIndex].id) {
                gameRoom.playerList[seatIndex].ready = gameRoom.playerList[seatIndex].id < 0
                gameRoom.playerList[seatIndex].cards = gameRoom.playerList[seatIndex].cards + game.gamePlayer[seatIndex].cards
                if (gameRoom.playerList[seatIndex].id === losePlayer) {
                    gameRoom.playerList[seatIndex].loss = gameRoom.playerList[seatIndex].loss + 1
                    gameRoom.lastLoser = gameRoom.playerList[seatIndex].id
                }
                else if (gameRoom.playerList[seatIndex].id === winPlayer) {
                    gameRoom.playerList[seatIndex].win = gameRoom.playerList[seatIndex].win + 1
                    gameRoom.lastWinner = gameRoom.playerList[seatIndex].id
                }
            }
        }
        await asyncSet(gameRoomKey, JSON.stringify(gameRoom))
        const gameRoomKeys = await asyncKeys(conf.redisCache.gameRoomPrefix + '*')
        const gameRoomList = await asyncMget(gameRoomKeys)
        const gameRoomListStr = JSON.stringify({ type: 'gameRoomList', data: gameRoomList })
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(gameRoomListStr)//更新游戏列表
            }
        })
        /** @type {string[]} 玩家key的列表字符串，用于mGet */
        const changePlayerList = []
        game.gamePlayerId.forEach(id => { if (id > 0) changePlayerList.push(conf.redisCache.playerPrefix + id) })
        if (changePlayerList.length === 0) return
        const changePlayerListRes = await asyncMget(changePlayerList)
        if (changePlayerListRes.length === 0) return
        /** @type {string[]} 玩家信息字符串，用于mSet */
        const redisMSetStrList = []
        changePlayerListRes.forEach(playerItem => {
            /** @type {RedisCachePlayer} */
            const player = JSON.parse(playerItem)
            if (!player || player === null || Object.keys(player).length === 0) return
            player.player_status = 1
            redisMSetStrList.push(conf.redisCache.playerPrefix + player.id)
            redisMSetStrList.push(JSON.stringify(player))
        })
        await asyncMset(redisMSetStrList)
        const playerKeys = await asyncKeys(conf.redisCache.playerPrefix + '*')
        const playerList = await asyncMget(playerKeys)
        const playerListStr = JSON.stringify({ type: 'playerList', data: playerList })
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(playerListStr)//更新玩家列表
            }
        })
    } catch (e) {
        logger.error(e)
    }
}

/**
 * @param {RedisCacheGame} game Redis中的游戏信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {number} losePlayer 拉跨玩家id
 * @param {number} winPlayer 吃鸡玩家id
 * @param {number} minCards 吃鸡玩家收牌数
 * @param {number} maxCards 拉跨玩家收牌数
 * @param {number} maxCombo 最大连接数
 * @returns {void}
 */
async function saveGameData(game, wss, losePlayer, winPlayer, minCards, maxCards, maxCombo) {
    const t = await sequelize.transaction()
    try {
        /** @type {SequelizedModelPlayer[]} */
        const insertPlayersInfo = []
        /** @type {SequelizedModelAiPlayer[]} */
        const insertAiPlayersInfo = []
        /** @type {PlayerExp[]} */
        const playerExpList = []
        /** 人类玩家的玩家id数组 */
        const humanPlayerIdList = game.gamePlayerId.filter(id => id > 0)
        /** @type {SequelizedModelAccount[]} */
        const accounts = await Account.findAll({ where: { id: { [Op.in]: humanPlayerIdList } } })
        for (let i = 0; i < Object.keys(game.gamePlayer).length; i++) {
            /** @type {GamePlayerSeatIndex} */
            const seatKey = i
            /** @type {RedisCachePlayerInGame} */
            const player = game.gamePlayer[seatKey]
            if (player.id < 0) { // 电脑玩家不需增加经验
                insertAiPlayersInfo.push({
                    ai_player_id: player.id,
                    cards: player.cards,
                    max_combo: player.maxCombo,
                    wukong: player.wukong,
                    bajie: player.bajie,
                    shaseng: player.shaseng,
                    tangseng: player.tangseng,
                    joker: player.joker,
                    bianshen: player.bianshen,
                    seat_index: seatKey,
                })
            }
            else {
                for (let j = 0; j < accounts.length; j++) {
                    if (player.id === accounts[j].id) {
                        let addExp = await calRecord(player, accounts[j], Math.floor((game.cardNum * 54 + game.timesCard) / game.gamePlayerId.length), losePlayer, winPlayer, game.gamePlayerId.length)
                        playerExpList.push({ id: player.id, exp: addExp })
                        insertPlayersInfo.push({
                            nickname: player.nickname,
                            avatar_id: player.avatar_id,
                            cards: player.cards,
                            max_combo: player.maxCombo,
                            wukong: player.wukong,
                            bajie: player.bajie,
                            shaseng: player.shaseng,
                            tangseng: player.tangseng,
                            joker: player.joker,
                            bianshen: player.bianshen,
                            seat_index: seatKey,
                            accountId: player.id,
                        })
                        break
                    }
                }
            }
        }
        /** @type {SequelizedModelGame} */
        const gameInfo = {
            max_cards: maxCards,
            min_cards: minCards,
            player_num: game.gamePlayerId.length,
            cardNum: game.cardNum,
            max_combo: maxCombo,
        }
        /** @type {SequelizedModelPlayer[]} */
        const insertedPlayers = await Player.bulkCreate(insertPlayersInfo)
        /** @type {SequelizedModelAiPlayer[]} */
        const insertedAiPlayers = await AiPlayer.bulkCreate(insertAiPlayersInfo)
        /** @type {SequelizedModelGame} */
        const insertedGame = await Game.create(gameInfo)
        insertedGame.addPlayers(insertedPlayers)
        insertedGame.addAiPlayers(insertedAiPlayers)
        let winPlayerNickname = ''
        let losePlayerNickname = ''
        let maxComboPlayer = ''
        /** @type {(SequelizedModelPlayer|SequelizedModelAiPlayer)[]} */
        const allPlayers = insertedPlayers.concat(insertedAiPlayers)
        allPlayers.forEach(insertedPlayer => {
            const playerId = insertedPlayer.accountId || insertedPlayer.ai_player_id
            const nickname = insertedPlayer.nickname || aiPlayerMetaData[-1 * (insertedPlayer.ai_player_id + 1)].nickname
            if (insertedPlayer.max_combo === maxCombo) {
                if (maxComboPlayer.length > 0) {
                    maxComboPlayer = maxComboPlayer + ', ' + nickname
                }
                else {
                    maxComboPlayer = nickname
                }
            }
            if (playerId === winPlayer) {
                winPlayerNickname = nickname
            }
            else if (playerId === losePlayer) {
                losePlayerNickname = nickname
            }
        })
        insertedGame.winner = winPlayerNickname
        insertedGame.loser = losePlayerNickname
        insertedGame.max_combo_player = maxComboPlayer
        /** @type {GameResultDto} */
        const gameResultDto = {
            id: insertedGame.id,
            winnerNickname: winPlayerNickname,
            winnerCards: minCards,
            loserNickname: losePlayerNickname,
            loserCards: maxCards,
            cardsNum: game.cardNum,
            playersNum: game.gamePlayerId.length,
            maxCombo: maxCombo,
            maxComboPlayer: maxComboPlayer,
            gameResultList: [],
            playerExpList: [],
        }
        allPlayers.forEach(player => {
            const playerId = player.accountId || player.ai_player_id
            const nickname = player.nickname || aiPlayerMetaData[-1 * (player.ai_player_id + 1)].nickname
            const avatarId = player.avatar_id || aiPlayerMetaData[-1 * (player.ai_player_id + 1)].avatar_id
            gameResultDto.gameResultList.push({
                id: playerId,
                nickname: nickname,
                avatar_id: avatarId,
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
        const gameResultStr = JSON.stringify(gameResultDto)
        //各玩家获得的经验值数组
        gameResultDto.playerExpList = playerExpList
        const gameResultWithExpStr = JSON.stringify(gameResultDto)
        const resultStr = JSON.stringify({ type: 'game', action: 'result', data: gameResultWithExpStr })
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && game.gamePlayerId.includes(client.userId)) {
                client.send(resultStr)
            }
        })
        await insertedGame.save()
        t.afterCommit(async () => await asyncMultiExec([['set', conf.redisCache.gameRecordPrefix + insertedGame.id, gameResultStr], ['expire', conf.redisCache.gameRecordPrefix + insertedGame.id, conf.redisCache.expire]]))
        await t.commit()
    } catch (e) {
        logger.error(e)
        await t.rollback()
    }
}

/**
 * @param {RedisCachePlayerInGame} player Redis中的在游戏中的玩家信息。对应key:game。
 * @param {SequelizedModelAccount} playerInstance Player的Model。
 * @param {number} averageCard 平均收牌数。
 * @param {number} losePlayer 拉跨玩家id。
 * @param {number} winPlayer 吃鸡玩家id。
 * @param {number} playerNum 玩家数。
 * @returns {Promise<number>} 经验值。
 */
async function calRecord(player, playerInstance, averageCard, losePlayer, winPlayer, playerNum) {
    try {
        /** @type {SequelizedModelRecord} */
        const playerRecord = await playerInstance.getRecord()
        let exp = 50
        playerRecord.num_of_game = playerRecord.num_of_game + 1
        playerRecord.experienced_cards = playerRecord.experienced_cards + player.cards
        /* 吃鸡拉跨 */
        if (losePlayer === playerInstance.id) {
            playerRecord.most_game = playerRecord.most_game + 1
            exp = 0
        }
        else if (winPlayer === playerInstance.id) {
            playerRecord.least_game = playerRecord.least_game + 1
            exp = exp + (5 * playerNum)
        }
        /* 单次最大 */
        if (player.maxCombo > playerRecord.max_combo) {
            playerRecord.max_combo = player.maxCombo
        }
        /* 最多最少收牌数 */
        if (playerRecord.least_cards === -1 || playerRecord.least_cards > player.cards) {
            playerRecord.least_cards = player.cards
        }
        if (playerRecord.most_cards < player.cards) {
            playerRecord.most_cards = player.cards
        }
        /* 最低最高占比 */
        const cardShareAverage = player.cards / averageCard
        const cardSharePoint = Math.floor(50 * cardShareAverage)
        if (cardSharePoint < 100) {
            exp = exp + 100 - cardSharePoint
        }
        playerRecord.experience = playerRecord.experience + exp
        if (cardShareAverage < 1) {
            if (playerRecord.min_card_amount === 0 || cardShareAverage < (playerRecord.min_card / playerRecord.min_card_amount)) {
                playerRecord.min_card_amount = averageCard
                playerRecord.min_card = player.cards
            }
        }
        else {
            if (playerRecord.max_card_amount === 0 || cardShareAverage > (playerRecord.max_card / playerRecord.max_card_amount)) {
                playerRecord.max_card_amount = averageCard
                playerRecord.max_card = player.cards
            }
        }
        const res = await asyncExists(conf.redisCache.playerRecordPrefix + playerInstance.id)
        /* 如果redis中有缓存则刷新该缓存中数据；如果没有则不必做任何处理，因为查询没缓存玩家的战绩时会自动从数据库中读取最新数据 */
        if (res === 1) { await asyncMultiExec([['set', conf.redisCache.playerRecordPrefix + playerInstance.id, JSON.stringify(playerRecord, null, 4)], ['expire', conf.redisCache.playerRecordPrefix + playerInstance.id, conf.redisCache.expire]]) }
        await playerRecord.save()
        return exp
    } catch (e) {
        logger.error(e)
        return 0
    }
}

/**
 * @param {RedisCacheGame} game Redis中的游戏信息。
 * @param {GamePlayerSeatIndex} currentPlayer 出牌玩家的ID。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {number} delay 计时器时间(ms)
 * @returns {NodeJS.Timeout}
 */
function getPlayCardTimer(game, currentPlayer, wss, delay) {
    const currentPlayerId = game.gamePlayer[currentPlayer].id
    const playCardTimerKey = conf.redisCache.aiChatPrefix + game.id + ':' + conf.redisCache.playCardTimerKeyStr
    if (currentPlayerId > 0) {
        asyncMultiExec([['set', playCardTimerKey, 0], ['pexpire', playCardTimerKey, game.gamePlayer[currentPlayer].online ? delay : 99999]])() // 此处不必等回调，所以没有加await, 玩家在线时才催促，托管时无须催促
        return setTimeout(async function () { await intervalCheckCard(wss, this, game.id) }, delay)
    }
    else if (currentPlayerId < 0) {
        asyncMultiExec([['set', playCardTimerKey, 0], ['pexpire', playCardTimerKey, 99999]])() // 电脑玩家不必催促所以仅设定一个较长时间
        return setTimeout(function () {
            const playCardWebSocketRequestData = aiPlay(game)
            /** 
             * module.exports = {@link module}  即调用module导出的function。
             * */
            module.exports(playCardWebSocketRequestData, wss, null)
        }, poker.aiPlayBasicWaitTime + (Math.random() * poker.aiPlayerRandomWaitTime))
    }
    return null
}
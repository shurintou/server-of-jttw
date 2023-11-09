const conf = require('../config/')
const { asyncSet, asyncMget, asyncKeys, asyncDel, asyncTtl, asyncGet } = require('../database/redis')
const logoutHandler = require('./logoutHandler')
const WebSocket = require('ws')
const logger = require('../common/log')

/**
 * @typedef {import('../types/websocket.js').WebSocketServerInfo}
 * @typedef {import('../types/websocket.js').RedisCacheWebsocketInfo}
 * @typedef {import('../types/room.js').RedisCacheRoomInfo}
 */

/**
 * @summary 定期清除失活的连接，session，player
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @returns {Promise<void>}
 */
async function clearHandler(wss) {
    try {
        const clearHandlerTimer = setInterval(async function checkConnections() {
            wss.clients.forEach(ws => {
                if (ws.isAlive === false) {
                    ws.terminate()
                    logger.warn('clearHandler terminated the websocket of user' + ws.userId)
                    logoutHandler(wss, ws)
                }
                ws.isAlive = false
            })
            const sessionKeys = await asyncKeys(conf.redisCache.sessionPrefix + '*')
            if (sessionKeys.length === 0) {
                /* 没有任何session存在了直接清空所有数据 */
                const gameRoomKeys = await asyncKeys(conf.redisCache.gameRoomPrefix + '*')
                if (gameRoomKeys.length > 0) {
                    logger.warn('clearHandler cleared all game rooms.')
                    gameRoomKeys.forEach(async gameRoomKey => { await clearGameRoom(gameRoomKey) })
                }
                const playerKeys = await asyncKeys(conf.redisCache.playerPrefix + '*')
                if (playerKeys.length > 0) {
                    logger.warn('clearHandler cleared all players.')
                    playerKeys.forEach(playerKey => { asyncDel(playerKey) })
                }
                return
            }
            const sessionList = await asyncMget(sessionKeys)
            /** @type {RedisCacheWebsocketInfo[]} */
            const sessions = []
            sessionList.forEach(item => { sessions.push(JSON.parse(item)) })
            for (let i = 0; i < sessions.length; i++) {
                if (!sessions[i]) continue
                const ttl = await asyncTtl(conf.redisCache.sessionPrefix + sessions[i].sessionID)
                if (ttl < conf.ws.deadTtl) {
                    logger.warn('clearHandler cleared deadTtl user' + sessions[i].userId)
                    logoutHandler(wss, sessions[i])
                }
            }
            /** @type {number[]} */
            const stillAlivePlayerIdList = []
            for (let i = 0; i < sessions.length; i++) {
                if (!sessions[i]) continue
                stillAlivePlayerIdList.push(sessions[i].userId)
            }
            /* 清理房间 */
            const gameRoomKeys = await asyncKeys(conf.redisCache.gameRoomPrefix + '*')
            if (gameRoomKeys.length === 0) {
                return
            }
            const gameRoomList = await asyncMget(gameRoomKeys)
            gameRoomList.forEach(async item => {
                /** @type {RedisCacheRoomInfo} */
                const gameRoom = JSON.parse(item)
                if (gameRoom.status === 1) { return } //房间正在游戏中，不清理
                let stillHasPlayer = false
                /* 对房间每个位置进行检查 */
                for (let i = 0; i < Object.keys(gameRoom.playerList).length; i++) {
                    if (gameRoom.playerList[i].id !== 0) {
                        /* 该位置玩家还有session则还存在玩家 */
                        if (stillAlivePlayerIdList.indexOf(gameRoom.playerList[i].id) !== -1) {
                            stillHasPlayer = true
                        }
                        /* 该位置玩家不是机器人且没有session则把该位置清空 */
                        else {
                            if (gameRoom.playerList[i].id > 0) {
                                gameRoom.playerList[i] = { id: 0, cards: 0, win: 0, loss: 0, ready: false }
                            }
                        }
                    }
                }
                /* 房间还有玩家，则不删除房间 */
                if (stillHasPlayer) {
                    /* 如果房主不在房间了则换房主 */
                    if (stillAlivePlayerIdList.indexOf(gameRoom.owner) === -1) {
                        gameRoom.owner = stillAlivePlayerIdList[0]
                    }
                    asyncSet(conf.redisCache.gameRoomPrefix + gameRoom.id, JSON.stringify(gameRoom))
                    const gameRoomKeys = await asyncKeys(conf.redisCache.gameRoomPrefix + '*')
                    if (gameRoomKeys.length === 0) {
                        const noDataStr = JSON.stringify({ type: 'gameRoomList', data: [] })
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(noDataStr)
                            }
                        })
                        return
                    }
                    const gameRoomList = await asyncMget(gameRoomKeys)
                    const gameRoomListStr = JSON.stringify({ type: 'gameRoomList', data: gameRoomList })
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(gameRoomListStr)
                        }
                    })
                    return
                }
                /* 否则删除房间 */
                logger.warn('clearHandler cleared game room' + gameRoom.id)
                await clearGameRoom(conf.redisCache.gameRoomPrefix + gameRoom.id)
                const gameRoomKeys = await asyncKeys(conf.redisCache.gameRoomPrefix + '*')
                if (gameRoomKeys.length === 0) {
                    const noDataStr = JSON.stringify({ type: 'gameRoomList', data: [] })
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(noDataStr)
                        }
                    })
                    return
                }
                const gameRoomList = await asyncMget(gameRoomKeys)
                const gameRoomListStr = JSON.stringify({ type: 'gameRoomList', data: gameRoomList })
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(gameRoomListStr)
                    }
                })
            })
        }, conf.ws.checkPeriod)
        //将计时器绑定到wss上，wss关闭时删除计时器
        wss.clearHandlerTimerId = clearHandlerTimer[Symbol.toPrimitive]()
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}

/**
 * @summary 清除游戏房间并删除绑定游戏房间的定时器
 * @param {string} gameRoomKey 游戏房间ID。
 * @returns {Promise<void>}
 */
async function clearGameRoom(gameRoomKey) {
    try {
        const res = await asyncGet(gameRoomKey)
        if (res === null) {
            return
        }
        /** @type {RedisCacheRoomInfo} */
        const gameRoom = JSON.parse(res)
        clearInterval(gameRoom.chatInterval)
        await asyncDel(gameRoomKey)
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}

module.exports = {
    clearHandler: clearHandler,
    clearGameRoom: clearGameRoom,
}
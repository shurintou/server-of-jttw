const conf = require('../config/')
const redis = require('../database/redis')
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
 * @returns {void}
 */
module.exports = function (wss) {
    try {
        var clearHandlerTimer = setInterval(function checkConnections() {
            wss.clients.forEach(function each(ws) {
                if (ws.isAlive === false) {
                    ws.terminate()
                    logger.warn('clearHandler terminated the websocket of user' + ws.userId)
                    logoutHandler(wss, ws)
                }
                ws.isAlive = false;
            })
            redis.keys(conf.redisCache.sessionPrefix + '*', function (err, list) {
                if (err) { return logger.error('error redis response - ' + err) }
                if (list.length === 0) {
                    /* 没有任何session存在了直接清空所有数据 */
                    redis.keys(conf.redisCache.gameRoomPrefix + '*', function (err, list) {
                        if (err) { return logger.error('error redis response - ' + err) }
                        if (list.length === 0) { return }
                        try {
                            logger.warn('clearHandler cleared all game rooms.')
                            list.forEach(game => { redis.del(game) })
                        }
                        catch (e) {
                            logger.error(e)
                        }
                    })
                    redis.keys(conf.redisCache.playerPrefix + '*', function (err, list) {
                        if (err) { return logger.error('error redis response - ' + err) }
                        if (list.length === 0) { return }
                        try {
                            logger.warn('clearHandler cleared all players.')
                            list.forEach(player => { redis.del(player) })
                        }
                        catch (e) {
                            logger.error(e)
                        }
                    })
                    return
                }
                redis.mget(list, function (err, res) {
                    if (err) { return logger.error('error redis response - ' + err) }
                    try {
                        /** @type {RedisCacheWebsocketInfo[]} */
                        let sessions = []
                        res.forEach(item => { sessions.push(JSON.parse(item)) })
                        for (let i = 0; i < sessions.length; i++) {
                            if (!sessions[i]) continue
                            redis.ttl(conf.redisCache.sessionPrefix + sessions[i].sessionID, function (err, res) {
                                if (err) { return logger.error('error redis response - ' + err) }
                                if (res < conf.ws.deadTtl) {
                                    logger.warn('clearHandler cleared deadTtl user' + sessions[i].userId)
                                    logoutHandler(wss, sessions[i])
                                }
                            })
                        }
                        /** @type {number[]} */
                        let stillAlivePlayerIdList = []
                        for (let i = 0; i < sessions.length; i++) {
                            if (!sessions[i]) continue
                            stillAlivePlayerIdList.push(sessions[i].userId)
                        }
                        /* 清理房间 */
                        redis.keys(conf.redisCache.gameRoomPrefix + '*', function (err, list) {
                            if (err) { return logger.error('error redis response - ' + err) }
                            if (list.length === 0) {
                                return
                            }
                            redis.mget(list, function (err, gameRoomList) {
                                if (err) { return logger.error('error redis response - ' + err) }
                                try {
                                    gameRoomList.forEach(item => {
                                        /** @type {RedisCacheRoomInfo} */
                                        let gameRoom = JSON.parse(item)
                                        if (gameRoom.status === 1) { return } //房间正在游戏中，不清理
                                        let stillHasPlayer = false
                                        /* 对房间每个位置进行检查 */
                                        for (let i = 0; i < Object.keys(gameRoom.playerList).length; i++) {
                                            if (gameRoom.playerList[i].id !== 0) {
                                                /* 该位置玩家还有session则还存在玩家 */
                                                if (stillAlivePlayerIdList.indexOf(gameRoom.playerList[i].id) !== -1) {
                                                    stillHasPlayer = true
                                                }
                                                /* 该位置玩家没有session则把该位置清空 */
                                                else {
                                                    gameRoom.playerList[i] = { id: 0, cards: 0, win: 0, loss: 0, ready: false }
                                                }
                                            }
                                        }
                                        /* 房间还有玩家，则不删除房间 */
                                        if (stillHasPlayer) {
                                            /* 如果房主不在房间了则换房主 */
                                            if (stillAlivePlayerIdList.indexOf(gameRoom.owner) === -1) {
                                                gameRoom.owner = stillAlivePlayerIdList[0]
                                            }
                                            redis.set(conf.redisCache.gameRoomPrefix + gameRoom.id, JSON.stringify(gameRoom), function (err) {
                                                if (err) { return logger.error('error redis response - ' + err) }
                                                redis.keys(conf.redisCache.gameRoomPrefix + '*', function (err, list) {
                                                    if (err) { return logger.error('error redis response - ' + err) }
                                                    try {
                                                        if (list.length === 0) {
                                                            wss.clients.forEach(function each(client) {
                                                                if (client.readyState === WebSocket.OPEN) {
                                                                    client.send(JSON.stringify({ type: 'gameRoomList', data: [] }))
                                                                }
                                                            })
                                                            return
                                                        }
                                                        redis.mget(list, function (err, gameRoomList) {
                                                            if (err) { return logger.error('error redis response - ' + err) }
                                                            try {
                                                                wss.clients.forEach(function each(client) {
                                                                    if (client.readyState === WebSocket.OPEN) {
                                                                        client.send(JSON.stringify({ type: 'gameRoomList', data: gameRoomList }))
                                                                    }
                                                                })
                                                            }
                                                            catch (e) {
                                                                logger.error(e)
                                                            }
                                                        })
                                                    }
                                                    catch (e) {
                                                        logger.error(e)
                                                    }
                                                })
                                            })
                                            return
                                        }
                                        /* 否则删除房间 */
                                        logger.warn('clearHandler cleared game room' + gameRoom.id)
                                        redis.del(conf.redisCache.gameRoomPrefix + gameRoom.id, function (err) {
                                            if (err) { return logger.error('error redis response - ' + err) }
                                            redis.keys(conf.redisCache.gameRoomPrefix + '*', function (err, list) {
                                                if (err) { return logger.error('error redis response - ' + err) }
                                                try {
                                                    if (list.length === 0) {
                                                        wss.clients.forEach(function each(client) {
                                                            if (client.readyState === WebSocket.OPEN) {
                                                                client.send(JSON.stringify({ type: 'gameRoomList', data: [] }))
                                                            }
                                                        })
                                                        return
                                                    }
                                                    redis.mget(list, function (err, gameRoomList) {
                                                        if (err) { return logger.error('error redis response - ' + err) }
                                                        try {
                                                            wss.clients.forEach(function each(client) {
                                                                if (client.readyState === WebSocket.OPEN) {
                                                                    client.send(JSON.stringify({ type: 'gameRoomList', data: gameRoomList }))
                                                                }
                                                            })
                                                        }
                                                        catch (e) {
                                                            logger.error(e)
                                                        }
                                                    })
                                                }
                                                catch (e) {
                                                    logger.error(e)
                                                }
                                            })
                                        })
                                    })
                                }
                                catch (e) {
                                    logger.error(e)
                                }
                            })
                        })
                    }
                    catch (e) {
                        logger.error(e)
                    }
                })
            })
        }, conf.ws.checkPeriod)
        //将计时器绑定到wss上，wss关闭时删除计时器
        wss.clearHandlerTimerId = clearHandlerTimer[Symbol.toPrimitive]()
    }
    catch (e) {
        logger.error(e)
    }
}
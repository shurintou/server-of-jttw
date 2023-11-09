const WebSocket = require('ws')
const { asyncGet, asyncSet, asyncKeys, asyncMget } = require('../database/redis')
const conf = require('../config/')
const errors = require('../common/errors')
const logger = require('../common/log')
const { clearGameRoom } = require('../websocket/clearHandler')
const { chatIntervalHandler } = require('../ai/chat.js')

/** @todo 返回给前端的房间列表中带有password信息未删除。 */

/**
 * @typedef {import('../types/room.js').RedisCacheRoomInfo}
 * @typedef {import('../types/room.js').RoomWebsocketRequestData}
 * @typedef {import('../types/websocket.js').WebSocketServerInfo}
 * @typedef {import('../types/websocket.js').WebSocketInfo}
 * @typedef {import("../types/common.js").GamePlayerSeatIndex}
 */

/**
 * @param {RoomWebsocketRequestData} data 游戏房间的前端请求信息。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @param {WebSocketInfo} ws 单一玩家的WebSocket连接(附带玩家信息)。
 * @returns {Promise<void>}
 */
module.exports = async function (data, wss, ws) {
    try {
        const gameRoomKey = conf.redisCache.gameRoomPrefix + '*'
        /* id是0则直接获取现在的游戏房间列表 */
        if (data.id === 0) {
            const gameRoomKeys = await asyncKeys(gameRoomKey)
            if (gameRoomKeys.length === 0) {
                ws.send(JSON.stringify({ type: 'gameRoomList', data: [] }))
                return
            }
            const gameRoomList = await asyncMget(gameRoomKeys)
            ws.send(JSON.stringify({ type: 'gameRoomList', data: gameRoomList }))
        }
        /* id为NaN是新建的房间，需要分配一个id */
        else if (data.id === null || data.id === NaN) {
            const gameRoomKeys = await asyncKeys(gameRoomKey)
            let freeIndex = 0
            const idOfList = []
            if (gameRoomKeys.length === 0) {
                freeIndex = 1
            }
            else {
                gameRoomKeys.forEach(item => { idOfList.push(parseInt(item.split(conf.redisCache.gameRoomPrefix)[1])) })
                idOfList.sort()
                /* 分配的房间号 */
                for (let i = 0; i < idOfList.length; i++) {
                    if (idOfList[i] !== i + 1) {
                        freeIndex = i + 1
                        break
                    }
                }
                if (freeIndex === 0) { freeIndex = idOfList.length + 1 }
            }
            const chatInterval = setInterval(() => chatIntervalHandler(freeIndex, wss), 1000)
            /** @type {RedisCacheRoomInfo} */
            const newRoomData = {
                id: freeIndex,
                name: data.name,
                status: data.status,
                needPassword: data.needPassword,
                password: data.password,
                cardNum: data.cardNum,
                metamorphoseNum: data.metamorphoseNum,
                owner: data.owner,
                lastLoser: data.lastLoser,
                lastWinner: data.lastWinner,
                chatInterval: chatInterval[Symbol.toPrimitive](),
                playerList: data.playerList
            }
            await asyncSet(conf.redisCache.gameRoomPrefix + freeIndex, JSON.stringify(newRoomData))
            const gameRoomLength = gameRoomKeys.push(conf.redisCache.gameRoomPrefix + freeIndex)
            let duplicateOwner = false
            const gameRoomList = await asyncMget(gameRoomKeys)
            if (gameRoomLength > 1) {
                for (let i = 0; i < gameRoomLength - 1; i++) {
                    /** @type {RedisCacheRoomInfo} */
                    const room = JSON.parse(gameRoomList[i])
                    if (room.owner === data.owner) {
                        duplicateOwner = true
                        break
                    }
                }
                if (duplicateOwner) {
                    await clearGameRoom(conf.redisCache.gameRoomPrefix + freeIndex)
                    gameRoomList.pop()
                    const gameRoomListStr = JSON.stringify({ type: 'gameRoomList', data: gameRoomList })
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(gameRoomListStr)
                        }
                    })
                    return
                }
            }
            const gameRoomListStr = JSON.stringify({ type: 'gameRoomList', data: gameRoomList })
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(gameRoomListStr)
                }
            })
        }
        else if (data.id < 0) {
            const roomId = conf.redisCache.gameRoomPrefix + (-1 * data.id)
            /* 小于0，某玩家离开了房间 */
            const roomRes = await asyncGet(roomId)
            if (roomRes === null) { return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST) }
            /** @type {GamePlayerSeatIndex} */
            const seatIndex = data.seatIndex
            /** @type {RedisCacheRoomInfo} */
            const room = JSON.parse(roomRes)
            const deleteId = room.playerList[seatIndex].id
            let remainId = 0
            if (ws.userId !== room.owner && ws.userId !== deleteId) {
                return // 如果不是房主踢人或玩家自行离开，则本次请求无效，终止后续处理。
            }
            /* 删掉离开的玩家 */
            room.playerList[seatIndex] = { id: 0, cards: 0, win: 0, loss: 0, ready: false }
            let stillHasPlayer = false
            for (let i = 0; i < Object.keys(room.playerList).length; i++) {
                /** @type {GamePlayerSeatIndex} */
                const seatKey = i
                if (room.playerList[seatKey].id > 0) {
                    stillHasPlayer = true
                    remainId = room.playerList[seatKey].id
                    break
                }
            }
            /* 如果还有玩家在房间中则保留房间并广播 */
            if (stillHasPlayer) {
                /* 如果退出的是房主则换房主 */
                if (room.owner === deleteId) {
                    room.owner = remainId
                    const playerRes = await asyncGet(conf.redisCache.playerPrefix + remainId)
                    const becomeOwnerStr = JSON.stringify({ type: 'system', player_loc: (-1 * data.id), text: '你 成为了房主' })
                    const changeOwnerStr = JSON.stringify({ type: 'system', player_loc: (-1 * data.id), text: '玩家 ' + JSON.parse(playerRes).nickname + ' 成为了房主' })
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN && client !== ws) {
                            if (client.userId === remainId) {
                                client.send(becomeOwnerStr)
                                return
                            }
                            client.send(changeOwnerStr)
                        }
                    })
                }
                await asyncSet(roomId, JSON.stringify(room))
                const gameRoomKeys = await asyncKeys(gameRoomKey)
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
            }
            /* 否则删除房间并广播 */
            else {
                await clearGameRoom(roomId)
                const gameRoomKeys = await asyncKeys(gameRoomKey)
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
            }
        }
        /* 大于0，属于对某个房间的操作 */
        else {
            const roomId = conf.redisCache.gameRoomPrefix + data.id
            /* 加入房间 */
            if (data.action === 'enter') {
                const roomRes = await asyncGet(roomId)
                if (roomRes === null) { return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST) }
                /** @type {GamePlayerSeatIndex} */
                const seatIndex = data.seatIndex
                /** @type {RedisCacheRoomInfo} */
                const room = JSON.parse(roomRes)
                const enterPlayerId = data.aiPlayerId < 0 ? data.aiPlayerId : ws.userId
                for (let i = 0; i < Object.keys(room.playerList).length; i++) {
                    /** @type {GamePlayerSeatIndex} */
                    const seatKey = i
                    if (room.playerList[seatKey].id === enterPlayerId) {
                        ws.send(JSON.stringify({ type: 'error', player_loc: 0, text: errors.ALREADY_IN_ROOM.message }))
                        return
                    }
                }
                /** @type {GamePlayerSeatIndex} */
                let freeSeatIndex = 0
                /* 不指定位置 */
                if (seatIndex === -1) {
                    freeSeatIndex = -1
                    for (let i = 0; i < Object.keys(room.playerList).length; i++) {
                        /** @type {GamePlayerSeatIndex} */
                        const seatKey = i
                        if (room.playerList[seatKey].id === 0) {
                            freeSeatIndex = i
                            break
                        }
                    }
                    if (freeSeatIndex === -1) {
                        ws.send(JSON.stringify({ type: 'error', player_loc: 0, text: errors.ROOM_FULL.message }))
                        return
                    }
                }
                /* 指定位置 */
                else {
                    if (room.playerList[seatIndex].id === 0) {
                        freeSeatIndex = seatIndex
                    }
                    else {
                        ws.send(JSON.stringify({ type: 'error', player_loc: 0, text: errors.SEAT_FULL.message }))
                        return
                    }
                }
                if (enterPlayerId >= 0 && room.needPassword) { // 一般玩家才需要验证密码
                    if (data.password !== room.password) {
                        ws.send(JSON.stringify({ type: 'error', player_loc: 0, text: errors.WRONG_PASSWORD.message }))
                        return
                    }
                }
                room.playerList[freeSeatIndex] = { id: enterPlayerId, cards: 0, win: 0, loss: 0, ready: enterPlayerId < 0 }
                await asyncSet(roomId, JSON.stringify(room))
                const gameRoomKeys = await asyncKeys(gameRoomKey)

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
            }
            /* 准备 */
            else if (data.action === 'ready') {
                const roomRes = await asyncGet(roomId)
                if (roomRes === null) { return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST) }
                /** @type {RedisCacheRoomInfo} */
                const room = JSON.parse(roomRes)
                for (let i = 0; i < Object.keys(room.playerList).length; i++) {
                    /** @type {GamePlayerSeatIndex} */
                    const seatKey = i
                    if (room.playerList[seatKey].id === ws.userId) {
                        room.playerList[seatKey].ready = !room.playerList[seatKey].ready
                        break
                    }
                }
                await asyncSet(roomId, JSON.stringify(room))
                const gameRoomKeys = await asyncKeys(gameRoomKey)
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
            }
            /* 修改房间设置 */
            else if (data.action === 'edit') {
                const roomRes = await asyncGet(roomId)
                if (roomRes === null) { return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST) }
                /** @type {RedisCacheRoomInfo} */
                const room = JSON.parse(roomRes)
                room.name = data.name
                room.needPassword = data.needPassword
                room.password = data.password
                room.cardNum = data.cardNum
                room.metamorphoseNum = data.metamorphoseNum
                await asyncSet(roomId, JSON.stringify(room))
                const gameRoomKeys = await asyncKeys(gameRoomKey)
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
            }
            /* 换位置 */
            else if (data.action === 'changeSeat') {
                const roomRes = await asyncGet(roomId)
                if (roomRes === null) { return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST) }
                /** @type {RedisCacheRoomInfo} */
                const room = JSON.parse(roomRes)
                /** @type {GamePlayerSeatIndex} */
                const sourceSeatIndex = data.sourceSeatIndex
                /** @type {GamePlayerSeatIndex} */
                const targetSeatIndex = data.targetSeatIndex
                if (room.status === 1) return
                /* 确保玩家信息没有发生改变 */
                if (room.playerList[targetSeatIndex].id !== data.targetId || room.playerList[sourceSeatIndex].id !== data.sourceId) {
                    return
                }
                /* 目标位置没有玩家或是电脑玩家则直接换 */
                if (room.playerList[targetSeatIndex].id <= 0) {
                    const temporaryPlayer = room.playerList[targetSeatIndex]
                    room.playerList[targetSeatIndex] = room.playerList[sourceSeatIndex]
                    if (temporaryPlayer.id < 0) { // 目标位置是电脑玩家则将其设置到换位置请求的玩家座位上
                        room.playerList[sourceSeatIndex] = temporaryPlayer
                    }
                    else {
                        room.playerList[sourceSeatIndex] = { id: 0, cards: 0, win: 0, loss: 0, ready: false }
                    }
                    await asyncSet(roomId, JSON.stringify(room))
                    const gameRoomKeys = await asyncKeys(gameRoomKey)
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
                }
                /* 有玩家则向该玩家发送请求 */
                else {
                    if (data.confirm) {
                        const tempPlayerInfo = room.playerList[targetSeatIndex]
                        room.playerList[targetSeatIndex] = room.playerList[sourceSeatIndex]
                        room.playerList[sourceSeatIndex] = tempPlayerInfo
                        await asyncSet(roomId, JSON.stringify(room))
                        const gameRoomKeys = await asyncKeys(gameRoomKey)
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
                    }
                    else {
                        const changeSeatDataStr = JSON.stringify({ type: 'askChangeSeat', data: data })
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN && client.userId === data.targetId) {
                                client.send(changeSeatDataStr)
                            }
                        })
                    }
                }
            }
            /* 拒绝换位 */
            else if (data.action === 'disagreeChangeSeat') {
                const roomRes = await asyncGet(roomId)
                if (roomRes === null) { return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST) }
                /** @type {RedisCacheRoomInfo} */
                const room = JSON.parse(roomRes)
                if (room.status === 1) return
                const disagreeChangeSeatStr = JSON.stringify({ type: 'system', player_loc: data.id, text: '玩家 ' + data.refusePlayerNickname + ' 拒绝了你的请求' })
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN && client.userId === data.playerId) {
                        client.send(disagreeChangeSeatStr)
                    }
                })
            }
        }
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}
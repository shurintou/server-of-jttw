const redis = require('../database/redis')
const WebSocket = require('ws')
const conf = require('../config/')
const errors = require('../common/errors')
const logger = require('../common/log')

module.exports = function(data ,wss, ws){
    try{
        var allRooms = conf.redisCache.gameRoomPrefix + '*'
        /* id是0则直接获取现在的游戏房间列表 */
        if(data.id === 0){
            redis.keys(allRooms, function(err, list){
                if (err) {return logger.error('error redis response - ' + err)}
                try{
                    if(list.length === 0){ 
                        ws.send(JSON.stringify({type: 'gameRoomList', data: [] }))
                        return 
                    }
                    redis.mget(list, function(err, gameRoomList){
                        if (err) {return logger.error('error redis response - ' + err)}
                        try{
                            ws.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
        /* id为NaN是新建的房间，需要分配一个id */
        else if(data.id === null || data.id === NaN){
            redis.keys(allRooms, function(err, list){
                if (err) {return logger.error('error redis response - ' + err)}
                try{
                    var freeIndex = 0
                    var idOfList = []
                    if( list.length === 0){
                        freeIndex = 1
                    }
                    else{
                        list.forEach( item => { idOfList.push(parseInt(item.split(conf.redisCache.gameRoomPrefix)[1]))})
                        idOfList.sort()
                        /* 分配的房间号 */
                        for(var i = 0; i < idOfList.length; i++){
                            if( idOfList[i] !== i + 1 ){
                                freeIndex = i + 1
                                break
                            }
                        }
                        if(freeIndex === 0){ freeIndex = idOfList.length + 1 }
                    }
                    redis.set(conf.redisCache.gameRoomPrefix + freeIndex, JSON.stringify({
                    id: freeIndex,
                    name: data.name,
                    status: data.status,
                    needPassword: data.needPassword,
                    password: data.password,
                    cardNum: data.cardNum,
                    metamorphoseNum: data.metamorphoseNum,
                    owner: data.owner,
                    lastLoser: data.lastLoser,
                    playerList: data.playerList
                    }), 
                    function(err){
                        if (err) {return logger.error('error redis response - ' + err)}
                        try{
                            const gameRoomLength =  list.push(conf.redisCache.gameRoomPrefix + freeIndex)
                            let duplicateOwner = false
                            redis.mget(list, function(err, gameRoomList){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
                                    if (gameRoomLength > 1){
                                        for( let i = 0; i < gameRoomLength - 1; i++ ){
                                            if( JSON.parse(gameRoomList[i]).owner === data.owner ){
                                                duplicateOwner = true
                                                break
                                            }
                                        }
                                        if(duplicateOwner){
                                            redis.del( conf.redisCache.gameRoomPrefix + freeIndex, function(err){
                                                if (err) {return logger.error('error redis response - ' + err)}
                                                try{
                                                    gameRoomList.pop()
                                                    wss.clients.forEach(function each(client) {
                                                        if (client.readyState === WebSocket.OPEN) {
                                                            client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
                                                        }
                                                    })
                                                }
                                                catch(e){
                                                    logger.error(e)
                                                }
                                            })
                                            return
                                        }
                                    }
                                    wss.clients.forEach(function each(client) {
                                        if (client.readyState === WebSocket.OPEN) {
                                            client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
        else if(data.id < 0){
            let roomId = conf.redisCache.gameRoomPrefix + (-1 * data.id)
            /* 小于0，某玩家离开了房间 */
            redis.get(roomId, function(err, res){
                if (err) {return logger.error('error redis response - ' + err)}
                try{
                    if(res === null){ return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST)}
                    let room = JSON.parse(res)
                    let deleteId = room.playerList[data.seatIndex].id
                    let remainId = 0
                    /* 删掉离开的玩家 */
                    room.playerList[data.seatIndex] = {id: 0, cards: 0, win: 0, loss: 0, ready: false}
                    let stillHasPlayer = false
                    for( let i = 0; i < Object.keys(room.playerList).length; i++){
                        if(room.playerList[i].id !== 0){
                            stillHasPlayer = true
                            remainId = room.playerList[i].id
                            break
                        }
                    }
                    /* 如果还有玩家在房间中则保留房间并广播 */
                    if(stillHasPlayer){
                        /* 如果退出的是房主则换房主 */
                        if(room.owner === deleteId){
                            room.owner = remainId
                            redis.get(conf.redisCache.playerPrefix + remainId, function(err, res){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
                                    wss.clients.forEach(function each(client) {
                                        if (client.readyState === WebSocket.OPEN && client !== ws) {
                                            if( client.userId === remainId ){
                                                client.send(JSON.stringify({type: 'system', player_loc: (-1 * data.id) , text: '你 成为了房主'}))
                                                return
                                            }
                                            client.send(JSON.stringify({type: 'system', player_loc: (-1 * data.id) , text: '玩家 ' + JSON.parse(res).nickname + ' 成为了房主'}))
                                        }
                                    })
                                }
                                catch(e){
                                    logger.error(e)
                                }
                            })
                        }
                        redis.set(roomId, JSON.stringify(room), function(err){
                            if (err) {return logger.error('error redis response - ' + err)}
                            redis.keys(allRooms, function(err, list){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
                                    if(list.length === 0){ 
                                        wss.clients.forEach(function each(client) {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({type: 'gameRoomList', data: [] }))
                                            }
                                        })
                                        return
                                    }
                                    redis.mget(list, function(err, gameRoomList){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        try{
                                            wss.clients.forEach(function each(client) {
                                                if (client.readyState === WebSocket.OPEN) {
                                                    client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
                    /* 否则删除房间并广播 */
                    else{
                        redis.del(roomId, function(err){
                            if (err) {return logger.error('error redis response - ' + err)}
                            redis.keys(allRooms, function(err, list){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
                                    if(list.length === 0){ 
                                        wss.clients.forEach(function each(client) {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({type: 'gameRoomList', data: [] }))
                                            }
                                        })
                                        return
                                    }
                                    redis.mget(list, function(err, gameRoomList){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        try{
                                            wss.clients.forEach(function each(client) {
                                                if (client.readyState === WebSocket.OPEN) {
                                                    client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
                }
                catch(e){
                    logger.error(e)
                }
            })
        }
        /* 大于0，属于对某个房间的操作 */
        else{
            let roomId = conf.redisCache.gameRoomPrefix + data.id
            /* 加入房间 */
            if(data.action === 'enter'){
                redis.get(roomId, function(err, res){
                    if (err) {return logger.error('error redis response - ' + err)}
                    try{
                        if(res === null){ return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST)}
                        let room = JSON.parse(res)
                        for( let i = 0; i < Object.keys(room.playerList).length; i++ ){
                            if( room.playerList[i].id === ws.userId ){
                                ws.send(JSON.stringify({type: 'error', player_loc: 0 , text: errors.ALREADY_IN_ROOM.message}))
                                return
                            }
                        }
                        let freeSeatIndex = 0
                        /* 不指定位置 */
                        if(data.seatIndex === -1){
                            freeSeatIndex = -1
                            for( let i = 0; i < Object.keys(room.playerList).length; i++){
                                if(room.playerList[i].id === 0 ){
                                    freeSeatIndex = i
                                    break
                                }
                            }
                            if(freeSeatIndex === -1){
                                ws.send(JSON.stringify({type: 'error', player_loc: 0 , text: errors.ROOM_FULL.message}))
                                return
                            }
                        }
                        /* 指定位置 */
                        else{
                            if(room.playerList[data.seatIndex].id === 0 ){
                                freeSeatIndex = data.seatIndex
                            }
                            else{
                                ws.send(JSON.stringify({type: 'error', player_loc: 0 , text: errors.SEAT_FULL.message}))
                                return
                            }
                        }
                        if(room.needPassword){
                            if(data.password !== room.password){
                                ws.send(JSON.stringify({type: 'error', player_loc: 0 , text: errors.WRONG_PASSWORD.message}))
                                return
                            }
                        }
                        room.playerList[freeSeatIndex] = {id: ws.userId, cards: 0, win: 0, loss: 0, ready: false}
                        redis.set(roomId, JSON.stringify(room), function(err){
                            if (err) {return logger.error('error redis response - ' + err)}
                            redis.keys(allRooms, function(err, list){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
                                    if(list.length === 0){ 
                                        wss.clients.forEach(function each(client) {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({type: 'gameRoomList', data: [] }))
                                            }
                                        })
                                        return
                                    }
                                    redis.mget(list, function(err, gameRoomList){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        try{
                                            wss.clients.forEach(function each(client) {
                                                if (client.readyState === WebSocket.OPEN) {
                                                    client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
                })
            }
            /* 准备 */
            else if(data.action === 'ready'){
                redis.get(roomId, function(err, res){
                    if (err) {return logger.error('error redis response - ' + err)}
                    try{
                        if(res === null){ return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST)}
                        let room = JSON.parse(res)
                        for( let i = 0; i < Object.keys(room.playerList).length; i++){
                            if(room.playerList[i].id === ws.userId){
                                room.playerList[i].ready = !room.playerList[i].ready
                                break
                            }
                        }
                        redis.set(roomId, JSON.stringify(room), function(err){
                            if (err) {return logger.error('error redis response - ' + err)}
                            redis.keys(allRooms, function(err, list){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
                                    if(list.length === 0){ 
                                        wss.clients.forEach(function each(client) {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({type: 'gameRoomList', data: [] }))
                                            }
                                        })
                                        return
                                    }
                                    redis.mget(list, function(err, gameRoomList){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        try{
                                            wss.clients.forEach(function each(client) {
                                                if (client.readyState === WebSocket.OPEN) {
                                                    client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
                })
            }
            /* 修改房间设置 */
            else if(data.action === 'edit'){
                redis.get(roomId, function(err, res){
                    if (err) {return logger.error('error redis response - ' + err)}
                    try{
                        if(res === null){ return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST)}
                        let room = JSON.parse(res)
                        room.name = data.name
                        room.needPassword = data.needPassword
                        room.password = data.password
                        room.cardNum = data.cardNum
                        room.metamorphoseNum = data.metamorphoseNum
                        redis.set(roomId, JSON.stringify(room), function(err){
                            if (err) {return logger.error('error redis response - ' + err)}
                            redis.keys(allRooms, function(err, list){
                                if (err) {return logger.error('error redis response - ' + err)}
                                try{
                                    if(list.length === 0){ 
                                        wss.clients.forEach(function each(client) {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({type: 'gameRoomList', data: [] }))
                                            }
                                        })
                                        return
                                    }
                                    redis.mget(list, function(err, gameRoomList){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        try{
                                            wss.clients.forEach(function each(client) {
                                                if (client.readyState === WebSocket.OPEN) {
                                                    client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
                })
            }
            /* 换位置 */
            else if(data.action === 'changeSeat'){
                redis.get(roomId, function(err, res){
                    if (err) {return logger.error('error redis response - ' + err)}
                    try{
                        if(res === null){ return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST)}
                        let room = JSON.parse(res)
                        if(room.status === 1) return
                        /* 确保玩家信息没有发生改变 */
                        if(room.playerList[data.targetSeatIndex].id !== data.targetId || room.playerList[data.sourceSeatIndex].id !== data.sourceId){
                            return
                        }
                        /* 目标位置没有玩家则直接换 */
                        if(room.playerList[data.targetSeatIndex].id === 0){
                            room.playerList[data.targetSeatIndex] = room.playerList[data.sourceSeatIndex]
                            room.playerList[data.sourceSeatIndex] = {id: 0, cards: 0, win: 0, loss: 0, ready: false}
                            redis.set(roomId, JSON.stringify(room), function(err){
                                if (err) {return logger.error('error redis response - ' + err)}
                                redis.keys(allRooms, function(err, list){
                                    if (err) {return logger.error('error redis response - ' + err)}
                                    try{
                                        if(list.length === 0){ 
                                            wss.clients.forEach(function each(client) {
                                                if (client.readyState === WebSocket.OPEN) {
                                                    client.send(JSON.stringify({type: 'gameRoomList', data: [] }))
                                                }
                                            })
                                            return
                                        }
                                        redis.mget(list, function(err, gameRoomList){
                                            if (err) {return logger.error('error redis response - ' + err)}
                                            try{
                                                wss.clients.forEach(function each(client) {
                                                    if (client.readyState === WebSocket.OPEN) {
                                                        client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
                        /* 有玩家则向该玩家发送请求 */
                        else{
                            if(data.confirm){
                                let tempPlayerInfo = room.playerList[data.targetSeatIndex]
                                room.playerList[data.targetSeatIndex] = room.playerList[data.sourceSeatIndex]
                                room.playerList[data.sourceSeatIndex] = tempPlayerInfo
                                redis.set(roomId, JSON.stringify(room), function(err){
                                    if (err) {return logger.error('error redis response - ' + err)}
                                    redis.keys(allRooms, function(err, list){
                                        if (err) {return logger.error('error redis response - ' + err)}
                                        try{
                                            if(list.length === 0){ 
                                                wss.clients.forEach(function each(client) {
                                                    if (client.readyState === WebSocket.OPEN) {
                                                        client.send(JSON.stringify({type: 'gameRoomList', data: [] }))
                                                    }
                                                })
                                                return
                                            }
                                            redis.mget(list, function(err, gameRoomList){
                                                if (err) {return logger.error('error redis response - ' + err)}
                                                try{
                                                    wss.clients.forEach(function each(client) {
                                                        if (client.readyState === WebSocket.OPEN) {
                                                            client.send(JSON.stringify({type: 'gameRoomList', data: gameRoomList}))
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
                            else{
                                wss.clients.forEach(function each(client) {
                                    if (client.readyState === WebSocket.OPEN && client.userId === data.targetId) {
                                        client.send(JSON.stringify({type: 'askChangeSeat', data: data}))
                                    }
                                })
                            }
                        }
                    }
                    catch(e){
                        logger.error(e)
                    }
                })
            }
            /* 拒绝换位 */
            else if(data.action === 'disagreeChangeSeat'){
                redis.get(roomId, function(err, res){
                    if (err) {return logger.error('error redis response - ' + err)}
                    try{
                        if(res === null){ return logger.error('gameRoom:' + roomId + errors.CACHE_DOES_NOT_EXIST)}
                        let room = JSON.parse(res)
                        if(room.status === 1) return
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN && client.userId === data.playerId) {
                                client.send(JSON.stringify({type: 'system', player_loc:  data.id , text: '玩家 ' + data.refusePlayerNickname + ' 拒绝了你的请求'}))
                            }
                        })
                    }
                    catch(e){
                        logger.error(e)
                    }
                })
            }
        }
    }
    catch(e){
        logger.error(e)
    }
}
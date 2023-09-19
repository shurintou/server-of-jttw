const Account = require('../models/account')
const Record = require('../models/record')
const logger = require('../common/log')
const redis = require('../database/redis')
const conf = require('../config/')
const { Op } = require("sequelize");
const errors = require('../common/errors')
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/http').RankRequestQuery}
 * @typedef {import('../types/http').ResponseRank}
 * @typedef {import('../types/record').RankType}
 * @typedef {import('../types/record').RedisWrapperResult}
 * @typedef {import('../types/record').ResponseRank}
 * @typedef {import('../types/record').RedisCacheRankPlayer}
 * @typedef {import('../types/player').SequelizedModelAccount}
 */

module.exports = {
    /** @type {(req: ClientRequest) => Promise<{code:number, message:string, type:RankType, result:ResponseRank}>} */
    getRankInfo: async function (req) {
        const rankPrefix = conf.redisCache.rankPrefix
        let order = 1
        /** @type {RankRequestQuery} */
        const query = req.query
        if (query.type === 'lowest_rate' || query.type === 'least_cards') {
            order = 0
        }
        try {
            /** @type {RedisWrapperResult} */
            let getRedisWrapperResult = await checkGetRedisWrapper(query.type, order, query.id) //判断缓存存在并取得排序结果: 0增序，1减序
            if (getRedisWrapperResult.result) {
            }
            else {
                /** @type {SequelizedModelRecord[]} */
                const records = await Record.findAll({ where: { num_of_game: { [Op.gte]: 5 } } }) // 寻找游戏场数大于5的玩家
                if (records.length < 1) {//样本数量不足时
                    return Promise.resolve({ code: 200, message: '', type: query.type, result: { rankList: [], playerInfo: null } })
                }
                /** @type {string[]} 形式是["100","1","105","2"...],即玩家分数,玩家id...交替的形式。 */
                let zaddList = []
                let redisKey = rankPrefix + query.type
                records.forEach(record => {
                    if (query.type === 'level') {
                        zaddList.push(record.experience)
                    }
                    else if (query.type === 'winner') {
                        zaddList.push(record.least_game)
                    }
                    else if (query.type === 'loser') {
                        zaddList.push(record.most_game)
                    }
                    else if (query.type === 'sum') {
                        zaddList.push(record.experienced_cards)
                    }
                    else if (query.type === 'combo') {
                        zaddList.push(record.max_combo)
                    }
                    else if (query.type === 'highest_rate') {
                        let insertRecord = record.max_card_amount === 0 ? 0 : (record.max_card * 100 / record.max_card_amount).toFixed(1)
                        zaddList.push(insertRecord * 10)
                    }
                    else if (query.type === 'lowest_rate') {
                        let insertRecord = record.min_card_amount === 0 ? 0 : (record.min_card * 100 / record.min_card_amount).toFixed(1)
                        zaddList.push(insertRecord * 10)
                    }
                    else if (query.type === 'least_cards') {
                        zaddList.push(record.least_cards)
                    }
                    else if (query.type === 'most_cards') {
                        zaddList.push(record.most_cards)
                    }
                    zaddList.push(record.accountId)
                })
                /** @type {RedisWrapperResult} */
                getRedisWrapperResult = await setGetRedisWrapper(redisKey, zaddList, query.id, order)//添加缓存并取得排序结果
            }
            let topThreeList = getRedisWrapperResult.topThreeList
            /** @type {number[]} 玩家id列表。*/
            let idList = []
            /** @type {number[]} 分数列表。*/
            let scoreList = []
            /** @type {ResponseRank} */
            let resultDto = { rankList: [], playerInfo: {} }
            idList = topThreeList.filter((item, index) => index % 2 === 0)
            scoreList = topThreeList.filter((item, index) => index % 2 === 1)
            // let accounts = await Account.findAll({where:{ id: {[Op.in]: idList}}}) in条件查找是无序的，故弃用
            for (let i = 0; i < idList.length; i++) {
                let getRedisWrapperPlayer = await getTopPlayer(idList[i])
                /* 缓存中是否有前三名玩家的信息 */
                if (getRedisWrapperPlayer.result) {
                    resultDto.rankList.push({ id: idList[i], rank: i + 1, avatarId: getRedisWrapperPlayer.player.avatar_id, nickname: getRedisWrapperPlayer.player.nickname, record: scoreList[i] })
                }
                else {
                    /** @type {SequelizedModelAccount[]} */
                    let account = await Account.findAll({ where: { id: idList[i] } })
                    setTopPlayer(idList[i], account[0].avatar_id, account[0].nickname)
                    resultDto.rankList.push({ id: idList[i], rank: i + 1, avatarId: account[0].avatar_id, nickname: account[0].nickname, record: scoreList[i] })
                }
            }
            let resList = getRedisWrapperResult.resList
            if (resList === null) {
                resultDto.playerInfo = null
            }
            else {
                resultDto.playerInfo.id = resList[0]
                resultDto.playerInfo.record = resList[1]
                resultDto.playerInfo.rank = getRedisWrapperResult.resRank + 1
            }
            return Promise.resolve({ code: 200, message: '', type: query.type, result: resultDto })
        }
        catch (e) {
            logger.error(e)
            return Promise.reject({ message: e })
        }
    }
}

/** 
 * @param {RankType} keyword - 获取排行的类型。
 * @param {0|1} order - 0增序1降序
 * @param {number} id - 获取排序的玩家id。
 * @returns {Promise<{result:boolean, topThreeList:string[], resList:string[]|null, resRank:number}>} topThreeList和resList的形式是["1","100","2","105"...],即玩家id,玩家分数...交替的形式。
 */
function checkGetRedisWrapper(keyword, order, id) {
    const redisKey = conf.redisCache.rankPrefix + keyword
    return new Promise((resolve, reject) => {
        redis.exists(redisKey, function (err, res) {
            if (err) { return reject({ message: 'error redis response - ' + err }) }
            /* 有缓存 */
            if (res === 1) {
                /* 增序 */
                if (order === 0) {
                    /* 前三名，即对应参数中的0~2 */
                    redis.zrange(redisKey, 0, 2, "WITHSCORES", function (err, topThreeList) {
                        if (err) { return reject({ message: 'error redis response - ' + err }) }
                        /* 获得指定玩家的排名 */
                        redis.zrank(redisKey, id, function (err, res) {
                            if (err) { return reject({ message: 'error redis response - ' + err }) }
                            /* 若指定玩家不拥有排名则提前返回结果 */
                            if (res === null) {
                                return resolve({ result: true, topThreeList: topThreeList, resList: null, resRank: -1 })
                            }
                            /* 获得该排行榜指定玩家排名的信息并返回结果，即对应参数中的res~res */
                            redis.zrange(redisKey, res, res, "WITHSCORES", function (err, resList) {
                                if (err) { return reject({ message: 'error redis response - ' + err }) }
                                return resolve({ result: true, topThreeList: topThreeList, resList: resList, resRank: res })
                            })
                        })
                    })
                }
                /* 减序 */
                else {
                    redis.zrevrange(redisKey, 0, 2, "WITHSCORES", function (err, topThreeList) {
                        if (err) { return reject({ message: 'error redis response - ' + err }) }
                        redis.zrevrank(redisKey, id, function (err, res) {
                            if (err) { return reject({ message: 'error redis response - ' + err }) }
                            if (res === null) {
                                return resolve({ result: true, topThreeList: topThreeList, resList: null, resRank: -1 })
                            }
                            redis.zrevrange(redisKey, res, res, "WITHSCORES", function (err, resList) {
                                if (err) { return reject({ message: 'error redis response - ' + err }) }
                                return resolve({ result: true, topThreeList: topThreeList, resList: resList, resRank: res })
                            })
                        })
                    })
                }
            }
            else {
                return resolve({ result: false })
            }
        })
    })
}

/** 
 * @param {string} redisKey - 插入排行的类型。
 * @param {string[]} zaddList - 插入排行数据，形式是["100","1","105","2"...],即玩家分数,玩家id...交替的形式。。
 * @param {0|1} order - 0增序1降序
 * @param {number} id - 获取排序的玩家id。
 * @returns {Promise<{result:boolean, topThreeList:string[], resList:string[]|null, resRank:number}>} topThreeList和resList的形式是["1","100","2","105"...],即玩家id,玩家分数...交替的形式。
 */
function setGetRedisWrapper(redisKey, zaddList, id, order) {
    return new Promise((resolve, reject) => {
        redis.watch(redisKey, function (err) {
            if (err) { return reject({ message: 'error redis response - ' + err }) }
            redis.multi()
                .zadd(redisKey, zaddList)
                .expire(redisKey, conf.redisCache.expire)
                .exec(function (err, results) {
                    if (err) { return reject({ message: 'error redis response - ' + err }) }
                    if (results === null) {
                        return reject({ message: errors.SET_ONLINE_ERROR })
                    }
                    if (order === 0) {
                        redis.zrange(redisKey, 0, 2, "WITHSCORES", function (err, topThreeList) {
                            if (err) { return reject({ message: 'error redis response - ' + err }) }
                            redis.zrank(redisKey, id, function (err, res) {
                                if (err) { return reject({ message: 'error redis response - ' + err }) }
                                if (res === null) {
                                    return resolve({ result: true, topThreeList: topThreeList, resList: null, resRank: -1 })
                                }
                                redis.zrange(redisKey, res, res, "WITHSCORES", function (err, resList) {
                                    if (err) { return reject({ message: 'error redis response - ' + err }) }
                                    return resolve({ result: true, topThreeList: topThreeList, resList: resList, resRank: res })
                                })
                            })
                        })
                    }
                    else {
                        redis.zrevrange(redisKey, 0, 2, "WITHSCORES", function (err, topThreeList) {
                            if (err) { return reject({ message: 'error redis response - ' + err }) }
                            redis.zrevrank(redisKey, id, function (err, res) {
                                if (err) { return reject({ message: 'error redis response - ' + err }) }
                                if (res === null) {
                                    return resolve({ result: true, topThreeList: topThreeList, resList: null, resRank: -1 })
                                }
                                redis.zrevrange(redisKey, res, res, "WITHSCORES", function (err, resList) {
                                    if (err) { return reject({ message: 'error redis response - ' + err }) }
                                    return resolve({ result: true, topThreeList: topThreeList, resList: resList, resRank: res })
                                })
                            })
                        })
                    }
                })
        })
    })
}

/** 
 * @param {number} id - 获取缓存的TOP排序的玩家id。
 * @returns {Promise<{result:boolean, player:RedisCacheRankPlayer}>}
 */
function getTopPlayer(id) {
    const topPlayerKey = conf.redisCache.rankPrefix + 'topPlayersList:' + id
    return new Promise((resolve, reject) => {
        redis.exists(topPlayerKey, function (err, res) {
            if (err) { return reject({ message: 'error redis response - ' + err }) }
            if (res === 1) {
                redis.get(topPlayerKey, function (err, player) {
                    if (err) { return reject({ message: 'error redis response - ' + err }) }
                    /** @type {RedisCacheRankPlayer} */
                    const topPlayer = JSON.parse(player)
                    return resolve({ result: true, player: topPlayer })
                })
            }
            else {
                return resolve({ result: false })
            }
        })
    })
}

/** 
 * @param {string} keyId - 需要缓存的TOP排序的玩家id。
 * @param {number} avatarId - 需要缓存的TOP排序的玩家的头像id。
 * @param {number} nickname - 需要缓存的TOP排序的玩家昵称。
 * @returns {void}
 */
function setTopPlayer(keyId, avatarId, nickname) {
    const topPlayerKey = conf.redisCache.rankPrefix + 'topPlayersList:' + keyId
    redis.multi()
        .set(topPlayerKey, JSON.stringify({ avatar_id: avatarId, nickname: nickname }))
        .expire(topPlayerKey, conf.redisCache.expire)
        .exec(function (err) {
            if (err) { return logger.error('error redis response - ' + err) }
        })
}
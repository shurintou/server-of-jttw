const Account = require('../models/account')
const Record = require('../models/record')
const logger = require('../common/log')
const { asyncGet, asyncExists, asyncZrange, asyncZrank, asyncZrevrank, asyncZrevrange, asyncWatch, asyncMultiExec } = require('../database/redis')
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
        try {
            const rankPrefix = conf.redisCache.rankPrefix
            let order = 1
            /** @type {RankRequestQuery} */
            const query = req.query
            if (query.type === 'lowest_rate' || query.type === 'least_cards') {
                order = 0
            }
            const redisKey = rankPrefix + query.type
            /** @type {RedisWrapperResult} */
            let getRankResult = await getRank(redisKey, order, query.id) //判断缓存存在并取得排序结果: 0增序，1减序
            if (!getRankResult.result) {
                /** @type {SequelizedModelRecord[]} */
                const records = await Record.findAll({ where: { num_of_game: { [Op.gte]: 5 } } }) // 寻找游戏场数大于5的玩家
                if (records.length < 1) {//样本数量不足时
                    return { code: 200, message: '', type: query.type, result: { rankList: [], playerInfo: null } }
                }
                /** @type {string[]} 形式是["100","1","105","2"...],即玩家分数,玩家id...交替的形式。 */
                const zaddList = []
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
                        const insertRecord = record.max_card_amount === 0 ? 0 : (record.max_card * 100 / record.max_card_amount).toFixed(1)
                        zaddList.push(insertRecord * 10)
                    }
                    else if (query.type === 'lowest_rate') {
                        const insertRecord = record.min_card_amount === 0 ? 0 : (record.min_card * 100 / record.min_card_amount).toFixed(1)
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
                getRankResult = await setRank(redisKey, zaddList, query.id, order)//添加缓存并取得排序结果
            }
            const topThreeList = getRankResult.topThreeList
            /** @type {ResponseRank} */
            const resultDto = { rankList: [], playerInfo: {} }
            /** @type {number[]} 玩家id列表。*/
            const idList = [] = topThreeList.filter((item, index) => index % 2 === 0)
            /** @type {number[]} 分数列表。*/
            const scoreList = topThreeList.filter((item, index) => index % 2 === 1)
            // let accounts = await Account.findAll({where:{ id: {[Op.in]: idList}}}) in条件查找是无序的，故弃用
            for (let i = 0; i < idList.length; i++) {
                const topPlayers = await getTopPlayer(idList[i])
                /* 缓存中是否有前三名玩家的信息 */
                if (topPlayers.result) {
                    resultDto.rankList.push({ id: idList[i], rank: i + 1, avatarId: topPlayers.player.avatar_id, nickname: topPlayers.player.nickname, record: scoreList[i] })
                }
                else {
                    /** @type {SequelizedModelAccount[]} */
                    const account = await Account.findAll({ where: { id: idList[i] } })
                    setTopPlayer(idList[i], account[0].avatar_id, account[0].nickname)
                    resultDto.rankList.push({ id: idList[i], rank: i + 1, avatarId: account[0].avatar_id, nickname: account[0].nickname, record: scoreList[i] })
                }
            }
            const resList = getRankResult.resList
            if (resList === null) {
                resultDto.playerInfo = null
            }
            else {
                resultDto.playerInfo.id = resList[0]
                resultDto.playerInfo.record = resList[1]
                resultDto.playerInfo.rank = getRankResult.resRank + 1
            }
            return { code: 200, message: '', type: query.type, result: resultDto }
        } catch (e) {
            logger.error(e)
            throw new Error({ message: e })
        }
    }
}

/** 
 * @param {RankType} redisKey - 获取排行的类型。
 * @param {0|1} order - 0增序1降序
 * @param {number} id - 获取排序的玩家id。
 * @returns {Promise<{result:boolean, topThreeList:string[], resList:string[]|null, resRank:number}>} topThreeList和resList的形式是["1","100","2","105"...],即玩家id,玩家分数...交替的形式。
 */
async function getRank(redisKey, order, id) {
    try {
        const existRes = await asyncExists(redisKey)
        /* 有缓存 */
        if (existRes === 1) {
            /* 增序 */
            if (order === 0) {
                /* 前三名，即对应参数中的0~2 */
                const topThreeList = await asyncZrange(redisKey, 0, 2, "WITHSCORES")
                /* 获得指定玩家的排名 */
                const rankRes = await asyncZrank(redisKey, id)
                /* 若指定玩家不拥有排名则提前返回结果 */
                if (rankRes === null) {
                    return { result: true, topThreeList: topThreeList, resList: null, resRank: -1 }
                }
                /* 获得该排行榜指定玩家排名的信息并返回结果，即对应参数中的res~res */
                const resList = await asyncZrange(redisKey, rankRes, rankRes, "WITHSCORES")
                return { result: true, topThreeList: topThreeList, resList: resList, resRank: rankRes }
            }
            /* 减序 */
            const topThreeList = await asyncZrevrange(redisKey, 0, 2, "WITHSCORES")
            const revrankRes = await asyncZrevrank(redisKey, id)
            if (revrankRes === null) {
                return { result: true, topThreeList: topThreeList, resList: null, resRank: -1 }
            }
            const resList = await asyncZrevrange(redisKey, revrankRes, revrankRes, "WITHSCORES")
            return { result: true, topThreeList: topThreeList, resList: resList, resRank: revrankRes }
        }
        return { result: false, topThreeList: [], resList: null, resRank: -1 }
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}

/** 
 * @param {string} redisKey - 插入排行的类型。
 * @param {string[]} zaddList - 插入排行数据，形式是["100","1","105","2"...],即玩家分数,玩家id...交替的形式。。
 * @param {0|1} order - 0增序1降序
 * @param {number} id - 获取排序的玩家id。
 * @returns {Promise<{result:boolean, topThreeList:string[], resList:string[]|null, resRank:number}>} topThreeList和resList的形式是["1","100","2","105"...],即玩家id,玩家分数...交替的形式。
 */
async function setRank(redisKey, zaddList, id, order) {
    try {
        await asyncWatch(redisKey)
        const results = await asyncMultiExec([['zadd', redisKey, ...zaddList], ['expire', redisKey, conf.redisCache.expire]])()
        if (results === null) {
            throw new Error({ message: errors.SET_ONLINE_ERROR })
        }
        return await getRank(redisKey, order, id)
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}

/** 
 * @param {number} id - 获取缓存的TOP排序的玩家id。
 * @returns {Promise<{result:boolean, player:RedisCacheRankPlayer}>}
 */
async function getTopPlayer(id) {
    try {
        const topPlayerKey = conf.redisCache.rankSubTopPlayersListPrefix + id
        const res = await asyncExists(topPlayerKey)
        if (res === 1) {
            const player = await asyncGet(topPlayerKey,)
            /** @type {RedisCacheRankPlayer} */
            const topPlayer = JSON.parse(player)
            return { result: true, player: topPlayer }
        }
        return { result: false }
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}

/** 
 * @param {string} keyId - 需要缓存的TOP排序的玩家id。
 * @param {number} avatarId - 需要缓存的TOP排序的玩家的头像id。
 * @param {number} nickname - 需要缓存的TOP排序的玩家昵称。
 * @returns {Promise<void>}
 */
async function setTopPlayer(keyId, avatarId, nickname) {
    try {
        const topPlayerKey = conf.redisCache.rankSubTopPlayersListPrefix + keyId
        const results = await asyncMultiExec([['set', topPlayerKey, JSON.stringify({ avatar_id: avatarId, nickname: nickname })], ['expire', topPlayerKey, conf.redisCache.expire]])()
        if (results === null) {
            throw new Error({ message: errors.SET_ONLINE_ERROR })
        }
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}
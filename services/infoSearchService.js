const Player = require('../models/player')
const Record = require('../models/record')
const { asyncGet, asyncMultiExec } = require('../database/redis')
const Game = require('../models/game')
const conf = require('../config/')
const logger = require('../common/log')
const { aiPlayerMetaData } = require('../ai/playCard')
const errors = require('../common/errors')

/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/record').BasicRedisCachePlayerRecord}
 * @typedef {import('../types/record').SequelizedModelRecord}
 * @typedef {import('../types/game.js').SequelizedModelGame}
 * @typedef {import('../types/game.js').GameResultDto}
 * @typedef {import('../types/player').SequelizedModelPlayer}
 * @typedef {import('../types/player').SequelizedModelAiPlayer}
 */

module.exports = {
    /** @type {(req: ClientRequest) => Promise<{code:number, message:string, record:BasicRedisCachePlayerRecord}>} */
    getPlayerRecord: async function (req) {
        try {
            const playerRecordId = conf.redisCache.playerRecordPrefix + req.params.id
            const checkResult = await getRecord(playerRecordId)
            if (checkResult.result) {
                /* 缓存中有record的话直接读取 */
                return { code: 200, message: '', record: checkResult.record }
            }
            /* 没有record的话从数据库读取数据返回结果，并同时缓存到redis */
            /** @type {SequelizedModelRecord[]} */
            const records = await Record.findAll({ where: { accountId: req.params.id } })
            const record = records[0]
            const results = await asyncMultiExec([['set', playerRecordId, JSON.stringify(record, null, 4)], ['expire', playerRecordId, conf.redisCache.expire]])()
            if (results === null) {
                throw new Error({ message: errors.SET_ONLINE_ERROR })
            }
            return { code: 200, message: '', record: record.toJSON() }
        } catch (e) {
            logger.error(e)
            throw new Error({ message: e })
        }
    },

    /** @type {(req: ClientRequest) => Promise<{code:number, message:string, pageNum:number, list:SequelizedModelPlayer[]}>} */
    getGameRecordsList: async function (req) {
        try {
            const playersRecordNum = await Player.count({ where: { accountId: req.query.id } })
            /** @type {SequelizedModelPlayer} */
            const playerRecords = await Player.findAll({
                order: [['id', 'DESC']],
                where: { accountId: req.query.id },
                offset: (req.query.page - 1) * 5,
                limit: 5
            })
            return { code: 200, message: '', pageNum: playersRecordNum, list: playerRecords }
        } catch (e) {
            logger.error(e)
            throw new Error({ message: e })
        }
    },

    /** @type {(req: ClientRequest) => Promise<{code:number, message:string, gameResult:GameResultDto}>} */
    getGameRecord: async function (req) {
        try {
            const gameRecordId = conf.redisCache.gameRecordPrefix + req.params.id
            const checkResult = await getRecord(gameRecordId)
            if (checkResult.result) {
                /* 缓存中有record的话直接读取 */
                return { code: 200, message: '', gameResult: checkResult.record }
            }
            /* 没有record的话从数据库读取数据返回结果，并同时缓存到redis */
            /** @type {SequelizedModelGame[]} */
            const games = await Game.findAll({ where: { id: req.params.id } })
            const game = games[0]
            /** @type {SequelizedModelPlayer[]} */
            const gamePlayerList = await game.getPlayers()
            /** @type {SequelizedModelAiPlayer[]} */
            const gameAiPlayerList = await game.getAiPlayers()
            /** @type {GameResultDto} */
            const gameResultDto = {
                id: game.id,
                winnerNickname: game.winner,
                winnerCards: game.min_cards,
                loserNickname: game.loser,
                loserCards: game.max_cards,
                cardsNum: game.cardNum,
                playersNum: game.player_num,
                maxCombo: game.max_combo,
                maxComboPlayer: game.max_combo_player,
                gameResultList: []
            }
            gamePlayerList.forEach(player => {
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
            gameAiPlayerList.forEach(player => {
                const { nickname, avatar_id } = aiPlayerMetaData[-1 * (player.ai_player_id + 1)]
                gameResultDto.gameResultList.push({
                    id: player.ai_player_id,
                    nickname: nickname,
                    avatar_id: avatar_id,
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
            const results = await asyncMultiExec([['set', gameRecordId, JSON.stringify(gameResultDto)], ['expire', gameRecordId, conf.redisCache.expire]])()
            if (results === null) {
                throw new Error({ message: errors.SET_ONLINE_ERROR })
            }
            return { code: 200, message: '', gameResult: gameResultDto }
        } catch (e) {
            logger.error(e)
            throw new Error({ message: e })
        }
    }
}

/** 
 * @param {string} recordId
 * @returns {Promise<{result:boolean, record?: BasicRedisCachePlayerRecord | GameResultDto}>}
 */
async function getRecord(recordId) {
    try {
        /* 查询redis中是否有缓存，并返回结果 */
        const res = await asyncGet(recordId)
        if (res === null) {
            return { result: false }
        }
        return { result: true, record: JSON.parse(res) }
    } catch (e) {
        logger.error(e)
        throw new Error({ message: e })
    }
}
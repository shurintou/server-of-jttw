const models = require('../common/models')
const redis = require('../database/redis')
const conf = require('../config/')
const logger = require('../common/log')

module.exports = {
    getPlayerRecord: async function(req){
        var playerRecordId = conf.redisCache.playerRecordPrefix + req.params.id
        try{
            var checkResult = await redisWrapper(playerRecordId)
            if(checkResult.result){
                /* 缓存中有record的话直接读取 */
                return Promise.resolve({code: 200, message: '', record: checkResult.record})
            }
            else{
                /* 没有record的话从数据库读取数据返回结果，并同时缓存到redis */
                const Record = models.record
                var records = await Record.findAll({where:{ accountId : req.params.id }})
                var record = records[0]
                redis.multi()
                .set(playerRecordId, JSON.stringify(record, null, 4))
                .expire(playerRecordId, conf.redisCache.expire)
                .exec( function(err){
                    if (err) {return logger.error('error redis response - ' + err)}
                })
                return Promise.resolve({code: 200, message: '', record: record.toJSON()})
            }
        }
        catch(e){
            logger.error(e)
            return Promise.reject({message: e})
        }
    },

    getGameRecordsList: async function(req){
        try{
            const Player = models.player
            var playersRecordNum = await Player.count({
                where: {
                    accountId : req.query.id
                }
            })
            var playerRecords = await Player.findAll({
                order: [ ['id' , 'DESC'] ],
                where: {
                    accountId : req.query.id
                },
                offset: (req.query.page - 1) * 5,
                limit: 5
            })
            return Promise.resolve({code: 200, message: '', pageNum: playersRecordNum, list: playerRecords })
        }
        catch(e){
            logger.error(e)
            return Promise.reject({message: e})
        }
    },

    getGameRecord: async function(req){
        var gameRecordId = conf.redisCache.gameRecordPrefix + req.params.id
        try{
            var checkResult = await redisWrapper(gameRecordId)
            if(checkResult.result){
                /* 缓存中有record的话直接读取 */
                return Promise.resolve({code: 200, message: '', gameResult: checkResult.record})
            }
            else{
                /* 没有record的话从数据库读取数据返回结果，并同时缓存到redis */
                const Game = models.game
                var games = await Game.findAll({where:{ id : req.params.id }})
                var game = games[0]
                var gamePlayerList = await game.getPlayers()
                let gameResultDto = {
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
                gamePlayerList.forEach( player => {
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
                redis.multi()
                .set(gameRecordId, JSON.stringify(gameResultDto))
                .expire(gameRecordId, conf.redisCache.expire)
                .exec( function(err){
                    if (err) {return logger.error('error redis response - ' + err)}
                })
                return Promise.resolve({code: 200, message: '', gameResult: gameResultDto})
            }
        }
        catch(e){
            logger.error(e)
            return Promise.reject({message: e})
        }
    }
}

function redisWrapper(recordId){
    return new Promise((resolve, reject) => {
        /* 查询redis中是否有缓存，并返回结果 */
        redis.get(recordId, function(err, res){
            if (err) {return reject({message: 'error redis response - ' + err })}
            if(res === null){
                return resolve({result: false})
            }
            else{
                return resolve({result: true, record: JSON.parse(res)})
            }
        })
    })  
}
/* 玩家模型 */

const db = require('../database/mysql')
const Game = require('./game')

const AiPlayer = db.defineModel('aiPlayer',
    {
        /* 电脑玩家的id */
        ai_player_id:
        {
            type: db.dataTypes.INTEGER(2),
            defaultValue: 0
        },
        /* 座位 */
        seat_index:
        {
            type: db.dataTypes.INTEGER(1),
            defaultValue: 0
        },
        /* 总收牌数 */
        cards:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 最大收牌 */
        max_combo:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 悟空 */
        wukong:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 八戒 */
        bajie:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 沙僧 */
        shaseng:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 唐僧 */
        tangseng:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 反弹 */
        joker:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 变身 */
        bianshen:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
    })

Game.hasMany(AiPlayer)
AiPlayer.belongsTo(Game)

module.exports = AiPlayer
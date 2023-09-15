/* 游戏模型 */

const db = require('../database/mysql')

const Game = db.defineModel('game',
    {
        /* 赢家player nickname */
        winner:
        {
            type: db.dataTypes.STRING(20),
            defaultValue: ''
        },
        /* 最少收牌 */
        min_cards:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 输家playernickname */
        loser:
        {
            type: db.dataTypes.STRING(20),
            defaultValue: ''
        },
        /* 最多收牌 */
        max_cards:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 玩家数量 */
        player_num:
        {
            type: db.dataTypes.INTEGER(2),
            defaultValue: 0
        },
        /* 使用牌副数 */
        cardNum:
        {
            type: db.dataTypes.INTEGER(2),
            defaultValue: 0
        },
        /* 最大连击数 */
        max_combo:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 最大连击数玩家 */
        max_combo_player:
        {
            type: db.dataTypes.STRING(50),
            defaultValue: ''
        }
    })

module.exports = Game

const db = require('../database/mysql')

const Game = db.defineModel('game', 
{
    /* 赢家playerid */
    winner: 
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    /* 最少收牌 */
    min_cards:
    {
        type: db.dataTypes.INTEGER(4),
        defaultValue: 0
    },
    /* 输家playerid */
    loser: 
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
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
})

module.exports = Game

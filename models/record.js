/* 游戏记录模型 */

const db = require('../database/mysql')
const Account = require('./account')

const Record = db.defineModel('record',
    {
        /* 总局数 */
        num_of_game:
        {
            type: db.dataTypes.INTEGER(11),
            defaultValue: 0
        },
        /* 牌最多的局数 */
        most_game:
        {
            type: db.dataTypes.INTEGER(11),
            defaultValue: 0
        },
        /* 牌最少的局数 */
        least_game:
        {
            type: db.dataTypes.INTEGER(11),
            defaultValue: 0
        },
        /* 经验值 */
        experience:
        {
            type: db.dataTypes.INTEGER(11),
            defaultValue: 0
        },
        /* 获得的牌总数 */
        experienced_cards:
        {
            type: db.dataTypes.INTEGER(11),
            defaultValue: 0
        },
        /* 最多收牌比时的收牌数 */
        max_card:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 最多收牌比时该局玩家平均收牌数 */
        max_card_amount:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 最少收牌比时的收牌数 */
        min_card:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 最少收牌比时该局玩家平均收牌数 */
        min_card_amount:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 一次获得最多的牌数 */
        max_combo:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
        /* 一局获得最少的牌数 */
        least_cards:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: -1
        },
        /* 一局获得最多的牌数 */
        most_cards:
        {
            type: db.dataTypes.INTEGER(4),
            defaultValue: 0
        },
    })

Account.hasOne(Record)
Record.belongsTo(Account)

module.exports = Record


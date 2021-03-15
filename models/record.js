const db = require('../database/mysql');
const Account = require('../common/models').account

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
    /* 某局最多获牌数 */
    max_card:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    /* 最多牌时一共多少副牌 */
    max_card_amount:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    /* 某局最少获牌数 */
    min_card:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    /* 最少牌时一共多少副牌 */
    min_card_amount:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
});

Account.hasOne(Record)
Record.belongsTo(Account)

module.exports = Record


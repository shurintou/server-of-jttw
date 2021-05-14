const db = require('../database/mysql')
const Account = require('../common/models').account
const Game = require('../common/models').game

const Player = db.defineModel('player', 
{
    nickname: 
    {
        type: db.dataTypes.STRING(20),
        defaultValue: '游客'
    },
    avatar_id: 
    {
        type: db.dataTypes.INTEGER(5),
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

Account.hasMany(Player)
Player.belongsTo(Account)

Game.hasMany(Player)
Player.belongsTo(Game)

module.exports = Player
/* 邀请码模型 */

const db = require('../database/mysql')
module.exports = db.defineModel('invitationCode',
    {
        invitation_code:
        {
            type: db.dataTypes.STRING(20),
            unique: true,
        },
        is_used:
        {
            type: db.dataTypes.BOOLEAN,
            defaultValue: false
        },
        player_id:
        {
            type: db.dataTypes.INTEGER(11),
            defaultValue: 0
        },
    })


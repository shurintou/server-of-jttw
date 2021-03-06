const db = require('../database/mysql');

module.exports = db.defineModel('account', 
{
    username: 
    {
        type: db.dataTypes.STRING(20),
        unique: true,
    },
    password: 
    {
        type: db.dataTypes.STRING(20),
    },
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
});


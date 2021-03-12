const db = require('../database/mysql');
const Account = require('../common/models').account

const Record = db.defineModel('record', 
{
    num_of_game:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    experience:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    max_card:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    max_card_accounts:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    min_card:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
    min_card_accounts:
    {
        type: db.dataTypes.INTEGER(11),
        defaultValue: 0
    },
});

Account.hasOne(Record)
Record.belongsTo(Account)

module.exports = Record


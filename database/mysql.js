
const {Sequelize, DataTypes} = require('sequelize')
const conf = require('../config/')
const dbConf = conf.mysql
const logger = require('../common/log')


var sequelize = new Sequelize(dbConf.database, dbConf.username, dbConf.password, {
    host: dbConf.host,
    dialect: 'mysql',
    port: dbConf.port,
    pool: {
        max: dbConf.pool.max,
        min: dbConf.pool.min,
        idle: dbConf.pool.idle,
    },
    timezone: dbConf.timezone,
    logging: msg => logger.debug(msg)
})

module.exports = {
    defineModel: function(name, attributes) {
        var attrs = {};
        attrs.id = {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        };
        for (let key in attributes) {
            let value = attributes[key];
            if (typeof value === 'object' && value['type']) {
                value.allowNull = value.allowNull || false;
                attrs[key] = value;
            } 
            else {
                attrs[key] = {type: DataTypes[value], allowNull: false };
            }
        }
        return sequelize.define(name, attrs, {
            timestamps: true,
        })
    },

    sync: async function(){
        await sequelize.sync()
    },

    sequelize: sequelize,

    dataTypes: DataTypes

}
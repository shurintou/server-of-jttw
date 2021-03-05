
const {Sequelize, DataTypes} = require('sequelize');
const conf = require('../config/config-development.js');
const dbConf = conf.mysql

var sequelize = new Sequelize(dbConf.database, dbConf.username, dbConf.password, {
    host: dbConf.host,
    dialect: 'mysql',
    port: dbConf.port,
    pool: {
        max: dbConf.pool.max,
        min: dbConf.pool.min,
        idle: dbConf.pool.idle,
    }
})

// sequelize.authenticate()
// .then(() =>{
//     console.log('Connection has been established successfully.')

// })
// .catch (error => {
//     console.error('Unable to connect to the database:', error)
// })
var generateId = function(){
    return 10001
}

module.exports = {
    defineModel: function(name, attributes) {
        var attrs = {};
        for (let key in attributes) {
            let value = attributes[key];
            if (typeof value === 'object' && value['type']) {
                value.allowNull = value.allowNull || false;
                attrs[key] = value;
            } else {
                attrs[key] = {
                    type: DataTypes[value],
                    allowNull: false
                };
            }
        }
        attrs.id = {
            type: DataTypes.INTEGER(11),
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        };
        attrs.createdAt = {
            type: DataTypes.BIGINT,
            allowNull: false,
        };
        attrs.updatedAt = {
            type: DataTypes.BIGINT,
            allowNull: false,
        };
        attrs.version = {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0
        };
        return sequelize.define(name, attrs, {
            tableName: name,
            timestamps: false,
            hooks: {
                beforeValidate: function (obj) {
                    let now = Date.now();
                    if (obj.isNewRecord) {
                        if (!obj.id) {
                            obj.id = generateId();
                        }
                        obj.createdAt = now;
                        obj.updatedAt = now;
                        obj.version = 0;
                    } else {
                        obj.updatedAt = Date.now();
                        obj.version++;
                    }
                }
            }
        });
    },

    sync: async function(){
        await sequelize.sync({alter:true})
    },

    dataTypes: DataTypes

}
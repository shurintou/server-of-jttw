/* 持久层文件通用处理 */

const fs = require('fs')
const db = require('../database/mysql')
const logger = require('./log')

let files = fs.readdirSync('./models')

let js_files = files.filter((f) => {
    return f.endsWith('.js')
}, files)

//需要引入../models/中的文件时，不是直接引入而是通过该模块.model名引入
module.exports = {};

for (let f of js_files) {
    logger.log(`import model from file ${f}`)
    let name = f.substring(0, f.length - 3)
    module.exports[name] = require('../models/' + f)
}

db.sync().then(logger.log('all tables have been updated'))
/* 持久层文件通用处理 */
const fs = require('fs')
const db = require('../database/mysql')
const logger = require('./log')

const files = fs.readdirSync('./models')

const js_files = files.filter((f) => {
    return f.endsWith('.js')
}, files)

/** 
 * @deprecated 因为无法提供类型补全支持，所以在services和handlers中不再使用这种动态export，但models中仍然在使用。
 */
module.exports = {};

for (const f of js_files) {
    logger.log(`import model from file ${f}`)
    const name = f.substring(0, f.length - 3)
    module.exports[name] = require('../models/' + f)
}

db.sync().then(logger.log('all tables have been updated'))
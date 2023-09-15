/* 路由文件通用处理 */

const fs = require('fs')
const logger = require('./log')

let files = fs.readdirSync('./routers')

let js_files = files.filter((f) => {
    return f.endsWith('.js')
}, files)

//需要引入../routers/中的文件时，不是直接引入而是通过该模块.router名引入
module.exports = {};

for (let f of js_files) {
    logger.log(`import router from file ${f}`)
    let name = f.substring(0, f.length - 3)
    module.exports[name] = require('../routers/' + f)
}
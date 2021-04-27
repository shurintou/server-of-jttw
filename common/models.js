const fs = require('fs')
const db = require('../database/mysql')
const logger = require('./log')

let files = fs.readdirSync('./models')

let js_files = files.filter((f)=>{
    return f.endsWith('.js')
}, files)

module.exports = {};

for (let f of js_files) {
    logger.log(`import model from file ${f}`)
    let name = f.substring(0, f.length - 3)
    module.exports[name] = require('../models/' + f)
}

db.sync().then(logger.log('all tables have been updated'))
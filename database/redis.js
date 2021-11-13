/* 缓存层 */

//使用redis作为缓存中间件
const redis = require("redis")
const conf = require('../config/')
module.exports = redis.createClient(conf.redis)
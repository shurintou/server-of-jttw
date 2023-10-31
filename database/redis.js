/* 缓存层 */
//使用redis作为缓存中间件
module.exports = (async function () {
    const { createClient } = require("redis")
    const conf = require('../config/')
    const redisClient = createClient(conf.redis)
    await redisClient.connect()
    return redisClient
})()
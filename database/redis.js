/* 缓存层 */

//使用redis作为缓存中间件
const redis = require("redis")
const conf = require('../config/')
const { promisify } = require("util")
const client = redis.createClient(conf.redis)
const { get, set, getset, mget, mset, keys, ttl, pttl, del, exists, zrange, zrank, zrevrange, zrevrank, expire, pexpire, watch } = client
/** @type {(key: string) => Promise<string | null>} */
const asyncGet = promisify(get).bind(client)
/** @type {(key: string, value: string) => Promise<void>} */
const asyncSet = promisify(set).bind(client)
/** @type {(key: string, value: string) => Promise<string | null>} */
const asyncGetset = promisify(getset).bind(client)
/** @type {(arg: string | string[]) => Promise<string[]>} */
const asyncMget = promisify(mget).bind(client)
/** @type {(arg: string | string[]) => Promise<void>} */
const asyncMset = promisify(mset).bind(client)
/** @type {(arg1: string) => Promise<string[]>} */
const asyncKeys = promisify(keys).bind(client)
/** @type {(arg1: string) => Promise<number>} */
const asyncTtl = promisify(ttl).bind(client)
/** @type {(arg1: string) => Promise<number>} */
const asyncPttl = promisify(pttl).bind(client)
/** @type {(arg: string | string[]) => Promise<void>} */
const asyncDel = promisify(del).bind(client)
/** @type {(arg: string | string[]) => Promise<number>} */
const asyncExists = promisify(exists).bind(client)
/** @type {(key: string, start: number, stop: number, withscores: string) => Promise<string[]>} */
const asyncZrange = promisify(zrange).bind(client)
/** @type {(key: string, member: string) => Promise<number | null>} */
const asyncZrank = promisify(zrank).bind(client)
/** @type {(key: string, start: number, stop: number, withscores: string) => Promise<string[]>} */
const asyncZrevrange = promisify(zrevrange).bind(client)
/** @type {(key: string, member: string) => Promise<number | null>} */
const asyncZrevrank = promisify(zrevrank).bind(client)
/** @type {(key: string, seconds: number) => Promise<void>} */
const asyncExpire = promisify(expire).bind(client)
/** @type {(key: string, milliseconds: number) => Promise<void>} */
const asyncPexpire = promisify(pexpire).bind(client)
/** @type {(arg: string | string[]) => Promise<"OK">} */
const asyncWatch = promisify(watch).bind(client)
/** @type {(arg: string[][]) => Promise<any[]>} */
const asyncMultiExec = commands => {
    const executeMulti = client.multi(commands)
    return promisify(executeMulti.exec).bind(executeMulti)
}
module.exports = {
    redis: client,
    asyncGet: asyncGet,
    asyncSet: asyncSet,
    asyncGetset: asyncGetset,
    asyncMget: asyncMget,
    asyncMset: asyncMset,
    asyncKeys: asyncKeys,
    asyncTtl: asyncTtl,
    asyncPttl: asyncPttl,
    asyncDel: asyncDel,
    asyncExists: asyncExists,
    asyncZrange: asyncZrange,
    asyncZrank: asyncZrank,
    asyncZrevrange: asyncZrevrange,
    asyncZrevrank: asyncZrevrank,
    asyncExpire: asyncExpire,
    asyncPexpire: asyncPexpire,
    asyncWatch: asyncWatch,
    asyncMultiExec: asyncMultiExec,
}
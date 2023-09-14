/**
 * @description Redis中的websocket信息。对应key:sess
 * @typedef RedisCacheWebsocket
 * @type {object}
 * @property {Cookie} cookie - 玩家id
 * @property {string} username -  玩家用户名
 * @property {number} userId - 玩家id
 * @property {string} sessionID - 会话的哈希值
 * @property {string} ip - 玩家ip地址
 * @property {(text:string)=>void} send - 发送websocket信息
 */

/**
 * @description Redis中的cookie信息。对应key:sess
 * @typedef Cookie
 * @type {object}
 * @property {number} originalMaxAge - 会话存活时间(毫秒)
 * @property {string} expires -  会话到期时间(时间戳)
 * @property {boolean} secure - 同cookie-secure
 * @property {boolean} httpOnly - 同cookie-httpOnly
 * @property {string} path - 同cookie-path
 */
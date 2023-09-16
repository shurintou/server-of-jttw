/** 
 * @description 玩家连接的基本信息。
 * @typedef BasicPlayerConnectionInfo
 * @type {object}
 * @property {string} username -  玩家用户名
 * @property {number} userId - 玩家id
 * @property {string} sessionID - 玩家会话的哈希值
 * @property {string} ip - 玩家ip地址
 */

/**
 * @typedef BasicRedisCacheWebsocketInfo
 * @type {object}
 * @property {CookieInfo} cookie - 玩家id
 */

/**
 * @description Redis中的websocket信息。对应key:sess
 * @typedef {BasicRedisCacheWebsocketInfo & BasicPlayerConnectionInfo} RedisCacheWebsocketInfo
 */

/**
 * @description Redis中的cookie信息。对应key:sess
 * @typedef CookieInfo
 * @type {object}
 * @property {number} originalMaxAge - 会话存活时间(毫秒)
 * @property {string} expires -  会话到期时间(时间戳)
 * @property {boolean} secure - 同cookie-secure
 * @property {boolean} httpOnly - 同cookie-httpOnly
 * @property {string} path - 同cookie-path
 */


/** 
 * @description WebSocketServer信息，包含所有玩家的WebSocket连接
 * @typedef {import("ws").WebSocketServer} WebSocketServerRaw
 */

/** 
 * @description WebSocketServer信息，包含所有玩家的WebSocket连接(附带玩家信息)
 * @typedef {{clients: Set<WebSocketInfo>} & WebSocketServerRaw & WebSocketServerMixin} WebSocketServerInfo
 */

/** 
 * @description 单一玩家的WebSocket连接
 * @typedef {import("ws").WebSocket} WebSocketRaw
 */

/** 
 * @description WebSocketServer的附加信息。
 * @typedef WebSocketServerMixin
 * @type {object}
 * @property {NodeJS.Timeout} clearHandlerTimerId - WebSocketServer的计时器Id。
 */

/** 
 * @description WebSocket的附加信息。
 * @typedef WebSocketMixin
 * @type {object}
 * @property {boolean} isAlive - 玩家的Websocket连接是否活跃。
 */

/** 
 * @description 单一玩家的WebSocket连接(附带玩家信息)
 * @typedef {WebSocketRaw & BasicPlayerConnectionInfo & WebSocketMixin} WebSocketInfo
 */

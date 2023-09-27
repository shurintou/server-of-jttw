/** 
 * @typedef BasicPlayerConnectionInfo 玩家连接的基本信息。
 * @type {object}
 * @property {string} username -  玩家用户名
 * @property {number} userId - 玩家id
 * @property {string} sessionID - 玩家会话的哈希值
 * @property {string} ip - 玩家ip地址
 */

/**
 * @typedef BasicRedisCacheWebsocketInfo 玩家缓存在Redis中的基本信息。
 * @type {object}
 * @property {CookieInfo} cookie - 玩家id
 */

/**
 * @typedef {BasicRedisCacheWebsocketInfo & BasicPlayerConnectionInfo} RedisCacheWebsocketInfo Redis中的websocket信息。对应key:sess
 */

/**
 * @typedef CookieInfo Redis中的cookie信息。对应key:sess
 * @type {object}
 * @property {number} originalMaxAge - 会话存活时间(毫秒)
 * @property {string} expires -  会话到期时间(时间戳)
 * @property {boolean} secure - 同cookie-secure
 * @property {boolean} httpOnly - 同cookie-httpOnly
 * @property {string} path - 同cookie-path
 */


/** 
 * @typedef {import("ws").WebSocketServer} WebSocketServerRaw WebSocketServer信息，包含所有玩家的WebSocket连接
 */

/** 
 * @typedef {{clients: Set<WebSocketInfo>} & WebSocketServerRaw & WebSocketServerMixin} WebSocketServerInfo WebSocketServer信息，包含所有玩家的WebSocket连接(附带玩家信息)
 */

/** 
 * @typedef {import("ws").WebSocket} WebSocketRaw 单一玩家的WebSocket连接
 */

/** 
 * @typedef WebSocketServerMixin WebSocketServer的附加信息。
 * @type {object}
 * @property {NodeJS.Timeout} clearHandlerTimerId - WebSocketServer的计时器Id。
 */

/** 
 * @typedef WebSocketMixin WebSocket的附加信息。
 * @type {object}
 * @property {boolean} isAlive - 玩家的Websocket连接是否活跃。
 */

/** 
 * @typedef {WebSocketRaw & BasicPlayerConnectionInfo & WebSocketMixin} WebSocketInfo 单一玩家的WebSocket连接(附带玩家信息)
 */

/** 
 * @typedef WebSocketRequestRawData WebSocket请求的信息（此类只包含最基础信息，其余信息根据type来传给对应的Handler来处理）。
 * @type {object}
 * @property {'ping'|'chat'|'game'|'gameRoomList'|'playerList'} type - 请求类型。
 * @property {number} userId - 发送请求的玩家id。
 */
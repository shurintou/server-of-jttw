/** 
 * @description Request信息
 * @typedef {import("express").Request} ClientRequestRaw
 * @typedef {import("express").Response} ClientResponse
 * /

/** 
 * @description Request中的会话信息(附带玩家信息)
 * @typedef {import("./websocket").RedisCacheWebsocketInfo} RedisCacheWebsocketInfo
 * @typedef {RedisCacheWebsocketInfo} ClientRequestSessionInfo
 */

/** 
 * @description Request信息(附带玩家信息)
 * @typedef {{session: ClientRequestSessionInfo} & ClientRequestRaw} ClientRequest
 */

/**
 * @description register的body信息
 * @typedef RegisterRequestBody
 * @type {object}
 * @property {string} username -  玩家用户名
 * @property {string} password - 玩家密码
 */
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
/** 
 * @description Request信息
 * @typedef {import("express").Request} ClientRequestRaw
 * @typedef {import("express").Response} ClientResponse
 * @typedef {import("./record").ResponseRank} ResponseRank
 * @typedef {import("./record").RankType} RankType
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

/**
 * @description modify的body信息
 * @typedef ModifyRequestBody
 * @type {object}
 * @property {string?} nickname -  新设置的昵称。
 * @property {string?} avatar_id - 新设置的头像id。
 */

/**
 * @description rank的query信息
 * @typedef RankRequestQuery
 * @type {object}
 * @property {number} id - 获取排行的玩家id。
 * @property {RankType} type - 排行类型。
 */

/**
 * @description register的body信息
 * @typedef RegisterRequestBody
 * @type {object}
 * @property {string} nickname -  玩家账号。
 * @property {string} invitationCode -  使用邀请码。
 * @property {string} password - 玩家密码。
 */
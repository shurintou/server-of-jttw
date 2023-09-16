/**
 * @description Redis中的玩家信息。对应key:player。
 * @typedef RedisCachePlayer
 * @type {object}
 * @property {number} id - 玩家id
 * @property {string} username -  玩家用户名
 * @property {string} nickname - 昵称
 * @property {number} player_loc - 玩家所在房间id
 * @property {1|2} player_status - 玩家状态. 1: 空闲, 2: 游戏中
 * @property {number} avatar_id - 玩家头像id
 */

/**
 * @description Redis中的在房间中的玩家信息。对应key:room
 * @typedef RedisCachePlayerInRoom
 * @type {object}
 * @property {number} id - 玩家id
 * @property {number} cards -  总收牌数
 * @property {number} win - 吃鸡局数
 * @property {number} loss - 拉跨局数
 * @property {boolean} ready - 是否已准备
 */

/** 
 * @typedef {import("./common.js").SequelizeCommon}
 */

/**
 * @description 数据库中的玩家信息。对应table:accounts。
 * @typedef ModelPlayer
 * @type {object}
 * @property {number} id - id
 * @property {string} username -  用户名
 * @property {string} password -  密码
 * @property {string} nickname - 昵称
 * @property {number} avatar_id - 玩家头像id
 * @typedef {ModelPlayer & SequelizeCommon} SequelizedModelPlayer
 */
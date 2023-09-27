/** 
 * @typedef {import("./common.js").GamePlayerSeatIndex}
 */

/** 
 * @typedef {PlayerStatus} 玩家状态. 0:空闲，1: 游戏房间等待中, 2: 游戏中
 * @type {0 | 1 | 2}
*/

/**
 * @description Redis中的玩家信息。对应key:player。
 * @typedef RedisCachePlayer
 * @type {object}
 * @property {number} id - 玩家id
 * @property {string} username -  玩家用户名
 * @property {string} nickname - 昵称
 * @property {number} player_loc - 玩家所在房间id
 * @property {PlayerStatus} player_status - 玩家状态. 0:空闲，1: 游戏房间等待中, 2: 游戏中
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
 * @description Redis中的在游戏中的玩家信息。对应key:game
 * @typedef RedisCachePlayerInGame
 * @type {object}
 * @property {number} id - 玩家id。
 * @property {string} nickname - 昵称。
 * @property {string} avatar_id - 玩家头像id。
 * @property {number} cards - 收牌数。
 * @property {number[]} remainCards - 玩家手中余留牌的序号。
 * @property {number} maxCombo - 一次获得最多的牌数。
 * @property {boolean} online - 玩家是否托管。
 * @property {number} offLineTime - 玩家断连次数(自己该出牌时没有出牌的次数)，达到一定次数则进入托管状态。
 * @property {number} offLinePlayCard - 玩家托管时出的牌。
 * @property {number} wukong - 使用悟空数。
 * @property {number} bajie - 使用八戒数。
 * @property {number} shaseng - 使用沙僧数。
 * @property {number} tangseng - 使用师傅数。
 * @property {number} joker - 使用如来、观音牌数。
 * @property {number} bianshen - 使用变身牌数。
 */

/** 
 * @typedef {import("./common.js").SequelizeCommon}
 */

/**
 * @description 数据库中的玩家账号信息。对应table:accounts。
 * @typedef ModelAccount
 * @type {object}
 * @property {number} id - 账号id。主key。
 * @property {string} username -  用户名
 * @property {string} password -  密码
 * @property {string} nickname - 昵称
 * @property {number} avatar_id - 玩家头像id
 * @typedef {ModelAccount & SequelizeCommon} SequelizedModelAccount
 */

/**
 * @description 数据库中的游戏中玩家信息。对应table:players。
 * @typedef ModelPlayer
 * @type {object}
 * @property {number} id - 游戏中玩家id。主key。
 * @property {string} nickname - 昵称。
 * @property {string} avatar_id - 玩家头像id。
 * @property {GamePlayerSeatIndex} seat_index - 座位id，下标0-7。
 * @property {number} cards - 收牌数。
 * @property {number} max_combo - 一次获得最多的牌数。
 * @property {number} wukong - 使用悟空数。
 * @property {number} bajie - 使用八戒数。
 * @property {number} shaseng - 使用沙僧数。
 * @property {number} tangseng - 使用师傅数。
 * @property {number} bianshen - 使用变身牌数。
 * @property {number} joker - 使用如来、观音牌数。
 * @property {number} accountId - 玩家账号id。外键，对应table:accounts。
 * @property {number} gameId - 游戏id。外键，对应table:games。
 * @typedef {ModelPlayer & SequelizeCommon} SequelizedModelPlayer
 */

/** 
 * @description 玩家列表的websocket请求信息。
 * @typedef PlayerListWebsocketRequestData
 * @type {object} 
 * @property {string} nickname - 发送信息玩家昵称。
 * @property {number} player_loc - 玩家所在房间id
 * @property {PlayerStatus} player_status - 玩家状态. 0:空闲，1: 游戏房间等待中, 2: 游戏中
 * @property {number} avatar_id - 玩家头像id
 * @property {string?} action - 请求类型。若不为空，则其余属性应为空。
 */

/**
 * @description 数据库中的邀请码信息。对应table:invitationcodes
 * @typedef ModelInvitationCode
 * @type {object}
 * @property {string} invitation_code -  邀请码。
 * @property {boolean} is_used - 是否已使用。
 * @property {number} player_id - 使用该邀请码的玩家id。
 * @typedef {ModelInvitationCode & SequelizeCommon} SequelizedModelInvitationCode
 */

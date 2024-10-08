/**
 * @typedef {import('./player.js').RedisCachePlayerInRoom}
 * @typedef {import("./common.js").SequelizeCommon}
 * @typedef {import("./common.js").SequelizeCommon}
 * @typedef {import("./common.js").GamePlayerSeatIndex}
 */

/**
 * @typedef RoomPlayers 房间中所有玩家状态。
 * @type {{ [key in GamePlayerSeatIndex]: RedisCachePlayerInRoom }}
 */

/**
 * @typedef RedisCacheRoomInfo Redis中的房间信息。对应key:room
 * @type {object}
 * @property {number} id - 房间id
 * @property {string} name -  房间名 
 * @property {0|1} status - 房间状态 0:等待开始, 1:游戏中
 * @property {boolean} needPassword - 是否需要密码
 * @property {string} password - 密码
 * @property {number} cardNum - 使用牌的副数
 * @property {number} metamorphoseNum - 每副牌变身牌数量
 * @property {number} owner - 房主的玩家id
 * @property {number} lastLoser - 上局拉跨的玩家id
 * @property {number} lastWinner - 上局吃鸡的玩家id
 * @property {number} chatInterval - 控制电脑玩家聊天的定时器
 * @property {RoomPlayers} playerList - 玩家信息列表，下标0~7
 */

/**
 * @typedef RoomWebsocketRequestData 游戏房间的websocket请求信息。
 * @type {object} 
 * @property {number} id - 目标房间id 0为获取所有房间，NaN为创建新房间，小于0为离开目标房间，大于0是对目标房间的操作。
 * @property {string?} name -  房间名。创建房间,edit时不为空。
 * @property {(0|1)?} status - 房间状态 0:等待开始, 1:游戏中。创建房间时不为空。
 * @property {boolean?} needPassword - 是否需要密码。创建房间,edit时不为空。
 * @property {string?} password - 密码。创建房间，须密码enter，edit时不为空。
 * @property {number?} aiPlayerId - 电脑玩家id。enter时一般玩家为0，加入电脑玩家为负数。
 * @property {number?} cardNum - 使用牌的副数。创建房间,edit时不为空。
 * @property {number?} metamorphoseNum - 每副牌变身牌数量。创建房间,edit时不为空。
 * @property {number?} owner - 房主的玩家id。创建房间时不为空。
 * @property {number?} lastLoser - 上局拉跨的玩家id。创建房间时不为空。
 * @property {number?} lastWinner - 上局吃鸡的玩家id。创建房间时不为空。
 * @property {RoomPlayers?} playerList - 玩家信息列表，下标0~7。创建房间时不为空。
 * @property {GamePlayerSeatIndex?} seatIndex - 目标座位号，下标0~7。为-1时则不指定位置。enter,离开房间时不为空。
 * @property {'enter'|'ready'|'edit'|'changeSeat'|'disagreeChangeSeat'} action - 对目标房间操作的动作。id>0时不为空。
 * @property {number?} targetSeatIndex - 更换座位请求玩家的更换目标座位号。changeSeat时不为空。
 * @property {number?} targetId - 更换座位请求目标玩家的的玩家id。changeSeat时不为空。
 * @property {number?} sourceSeatIndex - 更换座位请求玩家的现座位号。changeSeat时不为空。
 * @property {number?} sourceId - 更换座位请求玩家的的玩家id。changeSeat时不为空。
 * @property {boolean?} confirm - 更换座位是否需发送确认请求。changeSeat时不为空。
 * @property {number?} playerId - 被拒绝更换座位的玩家id。disagreeChangeSeat时不为空。
 * @property {string?} refusePlayerNickname - 拒绝更换座位的玩家昵称。disagreeChangeSeat时不为空。
 * @property {string?} nickname - 离开房间的玩家昵称。离开房间时不为空。
 */

/** 
 * @typedef RoomChatWebsocketRequestData 游戏房间聊天的websocket请求信息。
 * @type {object} 
 * @property {string} nickname - 发送信息玩家昵称。
 * @property {string} text - 聊天信息。
 * @property {number} player_loc - 目标房间id。
 */


/**
 * @typedef ModelInvitationCode 数据库中的邀请码信息。对应table:invitationcodes。
 * @type {object}
 * @property {number} id - 邀请码id。主key。
 * @property {string} invitation_code - 邀请码
 * @property {string} is_used -  是否已使用
 * @property {string} player_id - 玩家id
 * @property {number} avatar_id - 玩家头像id
 * @typedef {ModelInvitationCode & SequelizeCommon} SequelizedModelInvitationCode
 */
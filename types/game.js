/** 
 * @typedef {import("./common.js").SequelizeCommon}
 * @typedef {import("./common.js").GamePlayerSeatIndex}
 * @typedef {import("./player.js").RedisCachePlayerInGame}
 */

/**
 * @typedef RedisCacheGame Redis中的游戏信息。对应key:game。
 * @type {object}
 * @property {number} id - 游戏id
 * @property {boolean} clockwise - 游戏进行方向：true为顺时针，false为逆时针。
 * @property {GamePlayerSeatIndex | -1} currentPlayer - 现在出牌玩家的座位号：0~7，初始为-1。
 * @property {number[]} currentCard - 现在牌池中的牌，按花色升序排列。
 * @property {GamePlayerSeatIndex | -1} currentCardPlayer - 打出现在牌池中的牌的玩家的座位号：0~7，初始为-1。
 * @property {number} jokerCard - 现在牌池中的反弹牌。
 * @property {GamePlayerSeatIndex | -1} jokerCardPlayer - 打出现在牌池中的反弹牌的玩家的座位号：0~7，初始为-1。
 * @property {number} cardNum - 使用牌副数。
 * @property {number} metamorphoseNum - 每副牌中变身牌数量。
 * @property {number} currentCombo - 现在的连击数。
 * @property {number} version - 数据的版本，用于确认玩家有没有收到过期数据。
 * @property {number} timesCombo -连击数。
 * @property {number} timesCard - 连击牌得到的额外牌数量。
 * @property {number} timer - 计时器ID。
 * @property {GamePlayers} gamePlayer - 游戏中所有玩家状态。
 * @property {number[]} gamePlayerId - 游戏中所有玩家id。
 * @property {number[] | number} remainCards - 在服务器端时为牌堆中余留的牌序号(number[])，发送给客户端时转为该数组长度的数值牌堆中余留的牌数(number)。
 * @property {string[]} messages - 游戏信息。
 */


/**
 * @typedef ModelGame 数据库中的游戏信息。对应table:games。
 * @type {object}
 * @property {number} id - 游戏id。主key。
 * @property {string} winner -  吃鸡玩家昵称。
 * @property {string} min_cards -  吃鸡玩家收牌数。
 * @property {string} loser - 拉跨玩家昵称。
 * @property {string} max_cards - 拉跨玩家收牌数。
 * @property {string} player_num - 玩家数量。
 * @property {string} cardNum - 使用牌副数。
 * @property {string} max_combo - 一次获得最多的牌数。
 * @property {string} max_combo_player - 一次获得最多的牌数的玩家昵称。
 * @typedef {ModelGame & SequelizeCommon} SequelizedModelGame
 */

/**
 * @typedef Poker 扑克牌。
 * @type {object}
 * @property {number} num - 牌点：如红桃2，为牌点为2。
 * @property {1|2|3|4} suit -  花色点数：黑桃4，红桃3，梅花或大王2，方块或小王1。
 * @property {string} src -  对应图片的source名：数字+字母，其中字母为黑桃A，红桃B，梅花C，方块D。
 * @property {string} name - 扑克牌名。
 */

/**
 * @typedef GamePlayers 游戏中所有玩家状态。
 * @type {{ [key in GamePlayerSeatIndex]: RedisCachePlayerInGame }}
 */

/**
 * @typedef {Poker[]} Pokers 扑克牌的配置,0~53序号。100+序号为变身牌，反弹牌没有变身牌。
 */

/** 
 * @typedef GameWebsocketRequestData 游戏的websocket请求信息。
 * @type {object} 
 * @property {number} id - 目标游戏id。
 * @property {GamePlayerSeatIndex?} seatIndex - 发送请求玩家的座位号：0~7。play,discard,shiftOnline时不为空。
 * @property {number[]?} playCard - 玩家打出的牌。play时不为空。
 * @property {number[]?} remainCards - 玩家手中余留牌的序号。play时不为空。
 * @property {GamePlayerSeatIndex?|-1} target - 发送游戏内信息玩家的目标玩家座位号，-1时向所有玩家发送。textToPlayer时不为空。
 * @property {number?} targetId - 发送游戏内信息目标玩家的的玩家id，0时向所有玩家发送。textToPlayer时不为空。
 * @property {GamePlayerSeatIndex?} source - 发送游戏内信息玩家的座位号。textToPlayer时不为空。
 * @property {number?} sourceId - 发送游戏内信息玩家的的玩家id。textToPlayer时不为空。
 * @property {string?} soundSrc - 发送游戏内信息对应的语音文件路径。textToPlayer时不为空。
 * @property {string?} text - 发送游戏内信息对应的信息。textToPlayer时不为空。
 * @property {'get'|'play'|'discard'|'shiftOnline'|'initialize'|'textToPlayer'} action - 请求类型。
 */


/**
 * @typedef PlayerRecordInGameResult 游戏结果的websocket响应信息。
 * @type {object}
 * @property {number} id - 游戏中玩家id。
 * @property {string} nickname - 昵称。
 * @property {number} avatar_id - 玩家头像id。
 * @property {number} cards - 收牌数。
 * @property {GamePlayerSeatIndex} seatIndex - 座位id，下标0-7。
 * @property {number} maxCombo - 一次获得最多的牌数。
 * @property {number} wukong - 使用悟空数。
 * @property {number} bajie - 使用八戒数。
 * @property {number} shaseng - 使用沙僧数。
 * @property {number} tangseng - 使用师傅数。
 * @property {number} bianshen - 使用变身牌数。
 * @property {number} joker - 使用如来、观音牌数。
 */

/** 
 * @typedef PlayerExp 玩家获得经验值，id：玩家id, exp：获得经验值。
 * @type {object}
 * @property {number} id 玩家id。
 * @property {number} exp 玩家获得经验值。
 */

/**
 * @typedef GameResultDto 游戏结果数据。
 * @type {object}
 * @property {number} id - 游戏id。
 * @property {string} winnerNickname -  吃鸡玩家昵称。
 * @property {number} winnerCards -  吃鸡玩家收牌数。
 * @property {string} loserNickname - 拉跨玩家昵称。
 * @property {number} loserCards - 拉跨玩家收牌数。
 * @property {number} playersNum - 玩家数量。
 * @property {number} cardsNum - 使用牌副数。
 * @property {number} maxCombo - 一次获得最多的牌数。
 * @property {string} maxComboPlayer - 一次获得最多的牌数的玩家昵称。
 * @property {PlayerRecordInGameResult[]} gameResultList - 玩家各项数据列表。
 * @property {PlayerExp[]?} playerExpList - 玩家获得经验值列表。
 */



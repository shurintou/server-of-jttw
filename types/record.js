/** 
 * @typedef {import("./common.js").SequelizeCommon}
 */

/**
 * @typedef BasicRedisCachePlayerRecord Redis中的玩家战绩信息。对应key:playerRecord
 * @type {object}
 * @property {number} id - 玩家战绩id。主key。
 * @property {number} num_of_game -  玩家总局数 
 * @property {number} most_game - 拉跨局数
 * @property {number} least_game - 吃鸡局数
 * @property {number} experience - 经验值
 * @property {number} experienced_cards - 总收牌数
 * @property {number} max_card - 最多收牌比时的收牌数
 * @property {number} max_card_amount - 最多收牌比时该局玩家平均收牌数
 * @property {number} min_card - 最少收牌比时的收牌数
 * @property {number} min_card_amount - 最少收牌比时该局玩家平均收牌数
 * @property {number} max_combo - 一次获得最多的牌数
 * @property {number} least_cards - 一局获得最少的牌数
 * @property {number} most_cards - 一局获得最多的牌数
 * @property {number} accountId - 玩家id。外键，对应table:accounts。
 * @typedef {BasicRedisCachePlayerRecord & SequelizeCommon} RedisCachePlayerRecord
 */

/**
 * @typedef {RedisCachePlayerRecord} SequelizedModelRecord 数据库中的中的玩家战绩信息。对应table:records。结构与RedisCachePlayerRecord一致。
 */

/**
 * @typedef RedisCacheRankPlayer Redis中的玩家信息。对应key:rank-topPlayersList。
 * @type {object}
 * @property {string} nickname - 昵称
 * @property {number} avatar_id - 玩家头像id
 */

/**
 * @typedef RankType rank种类。
 * @type {'level'|'winner'|'loser'|'sum'|'combo'|'highest_rate'|'lowest_rate'|'least_cards'|'most_cards'}
 */

/**
 * @typedef ResponseRank Rank response中的的rank属性值类型。
 * @type {object}
 * @property {ResponseRankPlayerInfo} playerInfo - 请求玩家的排名信息。
 * @property {ResponseRankTopPlayerInfo[]} rankList - 排行玩家信息列表。
 */

/**
 * @typedef ResponseRankPlayerInfo Rank response中的的rank属性值中的playerInfo属性值类型。
 * @type {object}
 * @property {number} id - 玩家id。
 * @property {number} record - 分数。
 * @property {number} rank - 排名。
 */

/**
 * @typedef ResponseRankTopPlayerInfo Rank response中的的rank属性值中的rankList属性值类型。
 * @type {object}
 * @property {number} id - 玩家id。
 * @property {number} record - 分数。
 * @property {number} rank - 排名。 
 * @property {string} nickname - 昵称。
 * @property {number} avatarId - 玩家头像id。
 */

/** 
 * @typedef RedisWrapperResult checkGetRedisWrapper方法的返回值。
 * @type {object}
 * @property {boolean} result - 返回结果。
 * @property {string[]} topThreeList - 前三玩家信息的字符串。
 * @property {string[]|null} resList - 获取排行玩家的排行信息字符串。
 * @property {number} resRank - 获取排行玩家的排行。
 */
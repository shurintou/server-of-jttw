/**
 * @description Redis中的玩家战绩信息。对应key:playerRecord
 * @typedef RedisCachePlayerRecord
 * @type {object}
 * @property {number} id - 玩家战绩id
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
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 * @property {number} accountId - 玩家id
 */




/* 扑克牌配置文件 */
/** 
 * @typedef {import("../types/game.js").Pokers}
 */
/** 
 * @type {Pokers}
 */
const localCardList = [
    // 牌序数为行数-10, 如红桃妖怪2为第11行，则序数为11-10=1
    { num: 2, suit: 4, src: '2A', name: '妖怪2' },
    { num: 2, suit: 3, src: '2B', name: '妖怪2' },
    { num: 2, suit: 2, src: '2C', name: '妖怪2' },
    { num: 2, suit: 1, src: '2D', name: '妖怪2' },
    { num: 4, suit: 4, src: '4A', name: '妖怪4' },
    { num: 4, suit: 3, src: '4B', name: '妖怪4' },
    { num: 4, suit: 2, src: '4C', name: '妖怪4' },
    { num: 4, suit: 1, src: '4D', name: '妖怪4' },
    { num: 6, suit: 4, src: '6A', name: '妖怪6' },
    { num: 6, suit: 3, src: '6B', name: '妖怪6' },
    { num: 6, suit: 2, src: '6C', name: '妖怪6' },
    { num: 6, suit: 1, src: '6D', name: '妖怪6' },
    { num: 7, suit: 4, src: '7A', name: '妖怪7' },
    { num: 7, suit: 3, src: '7B', name: '妖怪7' },
    { num: 7, suit: 2, src: '7C', name: '妖怪7' },
    { num: 7, suit: 1, src: '7D', name: '妖怪7' },
    { num: 9, suit: 4, src: '9A', name: '妖怪9' },
    { num: 9, suit: 3, src: '9B', name: '妖怪9' },
    { num: 9, suit: 2, src: '9C', name: '妖怪9' },
    { num: 9, suit: 1, src: '9D', name: '妖怪9' },
    { num: 11, suit: 4, src: '11A', name: '妖怪J' },
    { num: 11, suit: 3, src: '11B', name: '妖怪J' },
    { num: 11, suit: 2, src: '11C', name: '妖怪J' },
    { num: 11, suit: 1, src: '11D', name: '妖怪J' },
    { num: 12, suit: 4, src: '12A', name: '妖怪Q' },
    { num: 12, suit: 3, src: '12B', name: '妖怪Q' },
    { num: 12, suit: 2, src: '12C', name: '妖怪Q' },
    { num: 12, suit: 1, src: '12D', name: '妖怪Q' },
    { num: 13, suit: 4, src: '13A', name: '妖怪K' },
    { num: 13, suit: 3, src: '13B', name: '妖怪K' },
    { num: 13, suit: 2, src: '13C', name: '妖怪K' },
    { num: 13, suit: 1, src: '13D', name: '妖怪K' },
    { num: 14, suit: 4, src: '1A', name: '妖怪A' },
    { num: 14, suit: 3, src: '1B', name: '妖怪A' },
    { num: 14, suit: 2, src: '1C', name: '妖怪A' },
    { num: 14, suit: 1, src: '1D', name: '妖怪A' },
    { num: 21, suit: 4, src: '3A', name: '沙僧' },
    { num: 21, suit: 3, src: '3B', name: '沙僧' },
    { num: 21, suit: 2, src: '3C', name: '沙僧' },
    { num: 21, suit: 1, src: '3D', name: '沙僧' },
    { num: 22, suit: 4, src: '8A', name: '八戒' },
    { num: 22, suit: 3, src: '8B', name: '八戒' },
    { num: 22, suit: 2, src: '8C', name: '八戒' },
    { num: 22, suit: 1, src: '8D', name: '八戒' },
    { num: 23, suit: 4, src: '5A', name: '悟空' },
    { num: 23, suit: 3, src: '5B', name: '悟空' },
    { num: 23, suit: 2, src: '5C', name: '悟空' },
    { num: 23, suit: 1, src: '5D', name: '悟空' },
    { num: 31, suit: 4, src: '10A', name: '唐僧' },
    { num: 31, suit: 3, src: '10B', name: '唐僧' },
    { num: 31, suit: 2, src: '10C', name: '唐僧' },
    { num: 31, suit: 1, src: '10D', name: '唐僧' },
    { num: 100, suit: 1, src: 'black-joker', name: '反弹' },
    { num: 100, suit: 2, src: 'red-joker', name: '反弹' },
]

module.exports = {
    /** 扑克牌数组。 */
    cardList: localCardList,

    /** 
     * @description 获取扑克牌的信息
     * @param {number} index 序号
     * @returns {Poker} 除去可能存在的变身牌+100后的牌信息
     */
    getIndexOfCardList: function (index) {
        if (index < 100) {
            return localCardList[index]
        }
        return localCardList[index - 100]
    },

    /** 
     * @description 洗牌处理
     * @param {number[]} array 扑克牌序号数组
     * @param {number} size 洗牌后的数组大小，默认为array的长度
     * @returns {void}
     */
    shuffle: function (array, size) {
        let index = -1
        const length = array.length
        const lastIndex = length - 1

        size = size === undefined ? length : size
        while (++index < size) {
            const rand = index + Math.floor(Math.random() * (lastIndex - index + 1))
            value = array[rand]
            array[rand] = array[index]
            array[index] = value
        }
        array.length = size
    },

    /** 
    * @summary 获取给定范围中的随机整数。
    * @param {number} min 最小值
    * @param {number} max 最大值
    * @returns {number} 最小值与最大值之间闭区间的整数值。
    */
    getRandom: function (min, max) {
        const floatRandom = Math.random()

        const difference = max - min

        // 介于 0 和差值之间的随机数
        const random = Math.round(difference * floatRandom)

        const randomWithinRange = random + min

        return randomWithinRange
    },

    /** 每一轮出牌等待的时间 */
    waitTime: 20000,
    /** 玩家托管时等待的时间 */
    offLineWaitTime: 1000,
    /** 电脑玩家出牌时等待的基础时间 */
    aiPlayBasicWaitTime: 1500,
    /** 电脑玩家出牌时等待的附加时间的随机值 */
    aiPlayerRandomWaitTime: 1000,
}
const poker = require('./poker')

/**
* @typedef {import('../types/game.js').RedisCacheGame}
*/
/** 
 * @summary 排列或组合多个元素
 * @param {number[]} allElements 所有元素
 * @param {number} count 需要选取的元素个数
 * @param {boolean} [isPermutation = true] 默认TRUE:排列,FALSE:组合
 * @returns {number[][]} 所有排列或组合的结果
 */
function permutationOrCombination(allElements, count, isPermutation = true) {

    /** @type {number[][]} */
    const result = []

    if (allElements.length < count || count === 0) {
        return result
    }

    allElements.forEach((element, index) => iteration(index, [element], allElements))
    /** 
     * @param {number} currentInedx 现在迭代的序数
     * @param {number[]} iterationArr 保存排列选取元素的数组
     * @param {number[]} arr 保存剩余迭代元素的数组
     */
    function iteration(currentInedx, iterationArr, arr) {
        if (iterationArr.length === count) { result.push(iterationArr) }
        const remainArr = arr.filter((element, index) => isPermutation ? index !== currentInedx : index > currentInedx)
        remainArr.forEach((element, index) => iteration(index, iterationArr.concat(element), remainArr))
    }

    return result
}

/** 
 * @summary 将排列组合去重。
 * @param {number[][]} allPlaycards 未去重的排列组合。
 * @returns {number[][]} 去重后的排列组合结果。
 */
function deDuplicatedPlayCardsList(allPlaycards) {

    /** @type {number[][]} */
    const result = []
    const playCardsStrList = allPlaycards.map(playCards => playCards.toString())
    const deDuplicatedPlayCardsStrList = Array.from(new Set(playCardsStrList))
    deDuplicatedPlayCardsStrList.forEach(playCardsStr => { result.push(playCardsStr.split(",").map(str => parseInt(str))) })
    return result

}

/** 
 * @summary 获取指定张数时玩家手中牌能打出的所有排列组合(去重)。
 * @description 只要定下了第一张基本牌，后面的牌均为附属牌，
 * 所以对于手中5张牌来说，取下标0,1,2,3,4分别作为基本牌，剩下的4张则作为附属牌来进行组合即可。
 * 所以若现有牌池为2张，玩家手中牌为5张，则所有可打出的组合数为5*C4/2 = 30
 * @param {number[]} allCards 玩家手中所有卡牌
 * @param {number} [count = 1] 需要打出的指定张数(默认为1)
 * @returns {number[][]} 所有可打出的牌组合的结果(去重)
 */
function getPlayCardsListBySpecifiedCount(allCards, count = 1) {

    /** @type {number[][]} 玩家手中牌能打出的所有排列组合(未去重) */
    const result = []
    if (allCards.length === 0) {
        return result
    }

    if (count === 1) {
        // 只打出1张的话，无须排列组合，直接遍历去重后的allCards数组即可。
        const tempList = Array.from(new Set(allCards))
        while (tempList.length > 0) {
            result.push([tempList.shift()])
        }
        return result
    }

    allCards.forEach((card, index) => {
        const allCardsExceptCurrentCard = allCards.filter((card, idx) => idx !== index) // 去除1张基本牌，剩下的牌作为附属牌
        const permutationOrCombinationResult = permutationOrCombination(allCardsExceptCurrentCard, count - 1, false) // 剩下的附属牌进行组合
        permutationOrCombinationResult.forEach(playCards => {
            playCards.unshift(card) // 将基本牌补回组合中
            result.push(playCards)
        })
    })

    /** @type {number[][]} 玩家手中牌能打出的所有排列组合(去重) */
    const deDuplicatedResult = [] = deDuplicatedPlayCardsList(result)

    return deDuplicatedResult

}


/** 
 * @param {RedisCacheGame} game
 * @returns {number[][]} 各种能出的牌的组合，值为玩家手中的该牌的序号(0~4)
 */
function aiPlay(game) {

    return []
}

module.exports = {
    aiPlay: aiPlay
}

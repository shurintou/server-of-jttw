const poker = require('./poker')

/**
* @typedef {import('../types/game.js').RedisCacheGame}
* @typedef {import('../types/game.js').GameWebsocketRequestData}
* @typedef {import('../types/common.js').GamePlayerSeatIndex}
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
 * @param {number[][]} allCombination 未去重的排列组合。
 * @returns {number[][]} 去重后的排列组合结果。
 */
function deDuplicatedCombination(allCombination) {

    /** @type {number[][]} */
    const tempResult = []

    const combinationsStrList = allCombination.map(combination => combination.toString())
    // 此阶段去掉的是玩家手中有相同牌时造成的重复组合。如[1,2,2]取两张的情况下，组合[1,2],[2,1],[2,2]均会出现两次。
    const deDuplicatedCombinationsStrList = Array.from(new Set(combinationsStrList))
    deDuplicatedCombinationsStrList.forEach(combinationStr => { tempResult.push(combinationStr.split(",").map(str => parseInt(str))) })

    // 因为变身牌出现在基本牌或附属牌中意义不同，所以无须去重，直接将有变身牌的组合纳入结果中
    /** @type {number[][]} */
    const result = tempResult.filter(resItem => resItem.some(item => item >= 100))
    const orderedStrList = tempResult.filter(resItem => resItem.every(item => item < 100)).map(resItem => [...resItem].sort().toString())
    // 此阶段去掉的是牌型上的重复组合。如[1,2,2]取两张的情况下，组合[1,2],[2,1]只取其一即可，但有变身牌的组合则无须去重。
    const deDuplicatedOrderedStrList = Array.from(new Set(orderedStrList))
    deDuplicatedOrderedStrList.forEach(orderedStr => { result.push(orderedStr.split(",").map(str => parseInt(str))) })

    return result

}


/** 
 * @summary 过滤出排列组合中可打出的统一牌型。
 * @param {number[]} combination 排列组合。
 * @returns {boolean} 是否是可打出的统一牌型结果。
 */
function playCardFilter(combination) {
    if (combination.every(card => poker.getIndexOfCardList(card).num === 100)) {
        return true // 所有牌为反弹牌的情况返回TRUE
    }
    // 过滤出所有下标为1以上的牌的牌面等于基本牌的牌面或等于变身牌的牌型
    return combination.every((card, index) => index === 0 || (poker.getIndexOfCardList(card).num === poker.getIndexOfCardList(combination[0]).num || card >= 100))
}

/** 
 * @summary 获取指定张数时玩家手中牌能打出的所有排列组合(仅去重和统一牌型，但不考虑牌型是否可管上现在牌池中的牌型)。
 * @description 只要定下了第一张基本牌，后面的牌均为附属牌，
 * 所以对于手中5张牌来说，取下标0,1,2,3,4分别作为基本牌，剩下的4张则作为附属牌来进行组合即可。
 * 所以若现有牌池为2张，玩家手中牌为5张，则所有可打出的组合数为5*C4/2 = 30
 * @param {number[]} allCards 玩家手中所有牌
 * @param {number} [count = 1] 需要打出的指定张数(小于等于玩家玩家手中所有牌张数，默认为1)
 * @returns {number[][]} 所有可打出的牌组合的结果(仅去重和统一牌型，但不考虑牌型是否可管上现在牌池中的牌型)
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
        permutationOrCombinationResult.forEach(resItem => {
            resItem.unshift(card) // 将基本牌补回组合中
            result.push(resItem)
        })
    })

    /** @type {number[][]} 玩家手中牌能打出的所有排列组合(去重) */
    const deDuplicatedResult = [] = deDuplicatedCombination(result)

    const playCardSListResult = deDuplicatedResult.filter(playCardFilter)

    return playCardSListResult

}


/** 
 * @summary 获取玩家手中牌能打出的所有排列组合(去重统一且可管上现在牌池中的牌型,现在牌池中无牌时则获取所有可能张数牌能打出的所有排列组合)。
 * @description 与getPlayCardsListBySpecifiedCount的区别是不指定出牌数，而是根据游戏局势来指定。
 * @param {number[]} currentCard 现在牌池中的牌(>=0)。
 * @param {number[]} remainCards 玩家手中所有牌(>0)。
 * @returns {number[][]} 各种能出的牌的组合，值为玩家手中的该牌的序号(0~4)
 */
function getHigherPlayCardsList(currentCard, remainCards) {
    /** @type {number[][]} 各种能出的牌的组合，值为玩家手中的该牌的序号 */
    let result = []
    if (currentCard.length === 0) { // 现在牌池中无牌时，不用考虑是否能管上，直接获取玩家手中牌能打出的所有排列组合
        for (let i = 1; i <= remainCards.length; i++) {
            const playCards = getPlayCardsListBySpecifiedCount(remainCards, i)
            playCards.forEach(playCard => result.push(playCard))
        }
        return result
    }

    if (currentCard.length > remainCards.length) { // 现在牌池中的牌张数大于玩家手中所有牌的张数。
        return result
    }

    const tempResult = getPlayCardsListBySpecifiedCount(remainCards, currentCard.length)
    const { num: currentCardNum } = poker.getIndexOfCardList(currentCard[0])

    result = tempResult.filter(tempResItem => {
        const { num: cardNum } = poker.getIndexOfCardList(tempResItem[0])
        if (cardNum === 100) { // 反弹牌的话纳入结果
            return true
        }
        if (currentCardNum < 30) { // 现在牌池中的牌为师傅以外的情况
            if (cardNum < currentCardNum) { // 过滤掉牌面小于牌池的牌组合
                return false
            }
            if (cardNum > currentCardNum) { // 选取牌面大于牌池的牌组合
                return true
            }
        }
        // 现在牌池中的牌为师傅，选取牌面是妖怪牌的牌组合
        if (currentCardNum === 31 && cardNum < 20) {
            return true
        }
        // 牌面等于现在牌池中牌面时，选取所有牌花色大于现在牌池中的牌花色的牌组合
        const compareItem = [...tempResItem].sort((a, b) => poker.getIndexOfCardList(a).suit - poker.getIndexOfCardList(b).suit)
        return compareItem.every((card, index) => poker.getIndexOfCardList(card).suit > poker.getIndexOfCardList(currentCard[index]).suit)
    })

    return result
}


/** 
 * @param {RedisCacheGame} game
 * @returns {GameWebsocketRequestData} 出牌的所有信息，action应为play。
 */
function aiPlay(game) {

    /** @type {GamePlayerSeatIndex} */
    const currentPlayer = game.currentPlayer
    const remainCards = game.gamePlayer[currentPlayer].remainCards
    const playCards = getHigherPlayCardsList(game.currentCard, remainCards)
    /** @todo 目前暂定从所有能打出的牌组合中随机抽出一种打出(所以是有打必打)，今后再添加策略机制选取最佳的牌组合打出。 */
    const playCard = playCards.length > 0 ? playCards[Math.floor(Math.random() * playCards.length)] : []
    if (playCard.length > 0) {
        for (let i = 0; i < playCard.length; i++) {
            for (let j = 0; j < remainCards.length; j++) {
                if (remainCards[j] === playCard[i]) {
                    remainCards.splice(j, 1) // 把将要打出的牌从玩家手中的牌移除
                    break
                }
            }
            if (poker.getIndexOfCardList(playCard[i]).num === 100) { // 反弹牌的话不作处理
                continue
            }
            if (playCard[i] >= 100) {
                if (i === 0) {
                    playCard[i] = playCard[i] - 100 //对首张牌进行处理，若为大于等于100的变身牌则减100作为基础牌
                    continue
                }
                if (poker.getIndexOfCardList(playCard[0]).num === poker.getIndexOfCardList(playCard[i]).num) {
                    if (Math.random() > 0.5) {
                        playCard[i] = playCard[i] - 100 //若附属的变身牌本身就等于基础牌，则有1/2几率作为基础牌，1/2几率作为变身牌
                        continue
                    }
                }
                //对附属的变身牌处理，牌面变为与原形牌相同，再加回100以示为变身牌
                playCard[i] = playCard[0] + poker.getIndexOfCardList(playCard[0]).suit - poker.getIndexOfCardList(playCard[i]).suit
                if (playCard[i] < 100) {
                    playCard[i] = playCard[i] + 100
                }
            }
        }
    }
    playCard.sort((a, b) => {
        return poker.getIndexOfCardList(a).suit - poker.getIndexOfCardList(b).suit
    })
    const result = {
        type: 'game',
        action: playCard.length > 0 ? 'play' : 'discard',
        id: game.id,
        seatIndex: currentPlayer,
        playCard: playCard,
        remainCards: remainCards
    }
    return result
}

module.exports = {
    aiPlay: aiPlay
}
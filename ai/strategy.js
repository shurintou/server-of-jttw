const poker = require('../common/poker')

/** 
 * @todo 策略待优化
 * @summary 出牌策略处理，选出最佳的出牌组合。
 * @description 牌池中无牌时，按妖怪，徒弟，师傅&反弹的顺序选出出牌的组合。即有可打出的妖怪牌组合时优先打妖怪牌中的随机组合，没有则打徒弟，依次类推。
 * 牌池中有牌时，则按所有出牌组合中牌面最小，牌序数和最小的组合打出。
 * @param {RedisCacheGame} game
 * @param {number[][]} playCards 各种能出的牌的组合。
 * @returns {number[]} 经过策略推算后打出的牌组合。
 */
module.exports = function strategy(game, playCards) {
    if (playCards.length === 0) return []

    const currentCard = game.currentCard
    if (currentCard.length === 0) {
        const excludeNums = [20, 30, 100]
        let i = 0
        while (i < excludeNums.length) { // 妖怪，徒弟，师傅&反弹，的顺序检查是否有可打出的牌组合
            const excludedPlayCards = playCards.filter(playCard => poker.getIndexOfCardList(playCard[0]).num <= excludeNums[i])
            if (excludedPlayCards.length > 0) {
                return excludedPlayCards[Math.floor(Math.random() * excludedPlayCards.length)] // 随机打出该过滤条件下的其中一种组合
            }
            i++
        }
    }
    playCards.sort((a, b) => {
        if (poker.getIndexOfCardList(a[0]).num !== poker.getIndexOfCardList(b[0]).num) { // 牌面不一致，按牌面升序排
            return poker.getIndexOfCardList(a[0]).num - poker.getIndexOfCardList(b[0]).num
        }
        return a.reduce((acr, cur) => acr + cur) - b.reduce((acr, cur) => acr + cur)  // 牌面一致，按牌序数和升序排
    })
    /** 目前暂定选出所有能打出的牌中牌面最小，牌序数和最小的组合打出。 */
    return playCards[0]
}
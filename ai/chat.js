const { asyncGet, asyncExists, asyncMultiExec, asyncPttl, asyncSet } = require('../database/redis')
const chatHandler = require('../websocket/chatHandler.js')
const conf = require('../config/')
const { aiPlayerMetaData } = require('./playCard.js')
const logger = require('../common/log')
const poker = require('../common/poker.js')
const { getRandom } = poker
const gameHandler = require('../websocket/gameHandler')

/** 
 * @typedef {import('../types/game.js').RedisCacheGame}
 * @typedef {import('../types/game.js').GameWebsocketRequestData}
 * @typedef {import('../types/room.js').RedisCacheRoomInfo}
 * @typedef {import('../types/room.js').RoomChatWebsocketRequestData}
 * @typedef {import('../types/common.js').GamePlayerSeatIndex}
 * @typedef {import('../types/websocket.js').WebSocketRequestRawData}
 */

/** 
 * @summary 电脑玩家聊天的处理。
 * @param {number} id 游戏房间id/游戏id。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @returns {Promise<void>}
 */
async function chatIntervalHandler(id, wss) {
    const gameRes = await asyncGet(conf.redisCache.gamePrefix + id)
    if (gameRes === null) { // 游戏不存在，则处理在房间中的聊天
        const gameRoomRes = await asyncGet(conf.redisCache.gameRoomPrefix + id)
        if (gameRoomRes === null) {
            return
        }
        /** @type {RedisCacheRoomInfo} */
        const gameRoom = JSON.parse(gameRoomRes)
        /** @type {number[]} */
        const aiPlayerIds = []
        for (let i = 0; i < Object.keys(gameRoom.playerList).length; i++) {
            /** @type {GamePlayerSeatIndex} */
            const iSeatIndex = i
            if (gameRoom.playerList[iSeatIndex].id < 0) {
                aiPlayerIds.push(gameRoom.playerList[iSeatIndex].id)
            }
        }
        if (aiPlayerIds.length === 0) { // 无电脑玩家存在则结束处理
            return
        }
        aiPlayerIds.forEach(async aiPlayerId => {
            if (await aiPlayerChatCooldown(id, aiPlayerId) === false) return
            const aiPlayerChatKey = conf.redisCache.aiChatPrefix + id + ':' + aiPlayerId // 发言前缀:房间id:电脑玩家id
            const aiPlayerIndex = -1 * (aiPlayerId + 1)
            const aiPlayerChatContent = aiPlayerChatContents[aiPlayerIndex]
            /** @type {string[]} */
            let chatContents = [].concat(commonChatContent)
            if (gameRoom.lastLoser === aiPlayerId) { chatContents = chatContents.concat(loserChatContent) }
            else if (gameRoom.lastWinner === aiPlayerId) { chatContents = chatContents.concat(winnerChatContent) }
            chatContents = chatContents.concat(aiPlayerChatContent.content)
            const results = await asyncMultiExec([['set', aiPlayerChatKey, aiPlayerId], ['expire', aiPlayerChatKey, 10 - aiPlayerChatContent.talkative]])()
            if (results === null) {
                logger.error(e)
            }
            /** @type {WebSocketRequestRawData & RoomChatWebsocketRequestData} */
            const chatResponseDto = {
                type: 'chat',
                userId: aiPlayerId,
                nickname: aiPlayerMetaData[aiPlayerIndex].nickname,
                player_loc: id,
                text: chatContents[Math.floor(Math.random() * chatContents.length)]
            }
            chatHandler(chatResponseDto, wss)
        })
        return
    }
    // 游戏存在，则处理游戏中聊天
    /** @type {RedisCacheGame} */
    const game = JSON.parse(gameRes)
    /** @type {[ {aiPlayerId: number, seatIndex: GamePlayerSeatIndex} ]} */
    const aiPlayerIdSeatIndexList = []
    for (let i = 0; i < Object.keys(game.gamePlayer).length; i++) {
        /** @type {GamePlayerSeatIndex} */
        const iSeatIndex = i
        if (game.gamePlayer[iSeatIndex].id < 0) {
            aiPlayerIdSeatIndexList.push({ aiPlayerId: game.gamePlayer[iSeatIndex].id, seatIndex: iSeatIndex })
        }
    }
    if (aiPlayerIdSeatIndexList.length === 0) { // 无电脑玩家存在则结束处理
        return
    }
    const playCardTimerkey = conf.redisCache.aiChatPrefix + id + ':' + conf.redisCache.playCardTimerKeyStr
    const playCardTimerPExpire = await asyncPttl(playCardTimerkey)
    if (playCardTimerPExpire > 0 && playCardTimerPExpire < (poker.waitTime * 0.6)) {
        const pushTimes = parseInt(await asyncGet(playCardTimerkey) || 0) // 催促次数，不超过电脑玩家的健谈程度
        aiPlayerIdSeatIndexList.forEach(async ({ aiPlayerId, seatIndex }) => {
            if (await aiPlayerChatCooldown(id, aiPlayerId) === false || game.currentPlayer === seatIndex) return
            const aiPlayerChatKey = conf.redisCache.aiChatPrefix + id + ':' + aiPlayerId // 发言前缀:房间id:电脑玩家id
            const aiPlayerIndex = -1 * (aiPlayerId + 1)
            const aiPlayerChatContent = aiPlayerChatContents[aiPlayerIndex]
            const playCardTimerExpire = playCardTimerPExpire / 1000
            if (getRandom(0, playCardTimerExpire) <= aiPlayerChatContent.talkative && pushTimes < aiPlayerChatContent.talkative) { // 所剩时间越少，电脑玩家越倾向于催促
                textToPlayerInGame(game, aiPlayerChatContent, aiPlayerGameMessages[1], seatIndex, game.currentPlayer, aiPlayerChatKey, wss)
                await asyncSet(playCardTimerkey, pushTimes + 1)
            }
        })
    }
    if (game.remainCards.length === 0) {
        aiPlayerIdSeatIndexList.forEach(async ({ aiPlayerId, seatIndex }) => {
            if (await aiPlayerChatCooldown(id, aiPlayerId) === false) return
            const aiPlayerChatKey = conf.redisCache.aiChatPrefix + id + ':' + aiPlayerId // 发言前缀:房间id:电脑玩家id
            const aiPlayerIndex = -1 * (aiPlayerId + 1)
            const aiPlayerChatContent = aiPlayerChatContents[aiPlayerIndex]
            if (game.gamePlayer[seatIndex].remainCards.length <= aiPlayerChatContent.talkative && getRandom(0, 50) <= aiPlayerChatContent.talkative) { // 电脑玩家牌越少越倾向于再来一局
                textToPlayerInGame(game, aiPlayerChatContent, aiPlayerGameMessages[3], seatIndex, -1, aiPlayerChatKey, wss)
            }
        })
    }
}


/** 
 * @summary 在游戏中发送聊天语音信息。
 * @param {RedisCacheGame} game 游戏。
 * @param {AiPlayerChatContent} aiPlayerChatContent 电脑玩家聊天属性。
 * @param {AiPlayerGameMessage} aiPlayerGameMessage 电脑玩家聊天信息。
 * @param {GamePlayerSeatIndex} sourceSeatIndex 发出信息电脑玩家座位。
 * @param {GamePlayerSeatIndex | -1} [targetSeatIndex = -1] 接收信息玩家座位，默认-1。
 * @param {string} aiPlayerChatKey 储存在redis中的电脑玩家key。
 * @param {WebSocketServerInfo} wss WebSocketServer信息，包含所有玩家的WebSocket连接。
 * @returns {Promise<void>}
 */
async function textToPlayerInGame(game, aiPlayerChatContent, aiPlayerGameMessage, sourceSeatIndex, targetSeatIndex, aiPlayerChatKey, wss) {
    /** @type {GameWebsocketRequestData & WebSocketRequestRawData} */
    const data = {
        type: "game",
        userId: aiPlayerChatContent.id,
        action: "textToPlayer",
        id: game.id,
        source: sourceSeatIndex,
        target: targetSeatIndex,
        targetId: game.gamePlayer[targetSeatIndex]?.id || 0,
        sourceId: aiPlayerChatContent.id,
        text: aiPlayerGameMessage.text,
        soundSrc: aiPlayerGameMessage.music,
    }
    gameHandler(data, wss)
    const results = await asyncMultiExec([['set', aiPlayerChatKey, aiPlayerChatContent.id], ['expire', aiPlayerChatKey, 10 - aiPlayerChatContent.talkative]])()
    if (results === null) {
        logger.error(e)
    }
}


/** 
 * @summary 获得电脑玩家是否可聊天的boolean。
 * @param {number} id 游戏房间id/游戏id。
 * @param {number} aiPlayerId 电脑玩家id。
 * @returns {Promise<boolean>}
 */
async function aiPlayerChatCooldown(id, aiPlayerId) {
    if (id === 0 || aiPlayerId >= 0) return false
    const aiPlayerChatKey = conf.redisCache.aiChatPrefix + id + ':' + aiPlayerId // 发言前缀:房间id:电脑玩家id
    const isAiPlayerHasChat = await asyncExists(aiPlayerChatKey)
    if (isAiPlayerHasChat > 0) { // 该电脑玩家尚有发言在缓存中，则不继续发言
        return false
    }
    const aiPlayerIndex = -1 * (aiPlayerId + 1)
    const aiPlayerChatContent = aiPlayerChatContents[aiPlayerIndex]
    if (Math.random() * 50 > aiPlayerChatContent.talkative) { // 若电脑玩家的健谈程度小于随机值则结束处理
        return false
    }
    return true
}

const commonChatContent = [
    '今天天气不错。',
    '今天也是美好的一天。',
    '有时间多来玩玩。',
    '下次也一起玩吧。',
    '准备好去西天取经了吗？',
    '来一局愉快的游戏吧！',
    '我准备好了，你呢？',
    '放松心情，享受游戏的乐趣。',
    '准备好被我打败了吗？',
]

const winnerChatContent = [
    '大吉大利，今晚吃鸡。',
    '下一局再来挑战我吧！',
    '下一局祝你们好运！',
    '各位不要灰心，再接再厉。',
    '每一步都重要，谨慎选择。',
    '想要战胜我？还早得很呢！',
    '欢迎来挑战我，我可不会手下留情。',
    '胜利的滋味真是美妙，希望你也能尝到。',
    '我赢了，你们输了，人生就是这么美妙！',
    '这就是我的实力。',
    '今天手气不错。',
    '今天幸运女神站在了我这边。',
    '和你玩得很愉快。',
]

const loserChatContent = [
    '但愿下把运气能好点。',
    '下一局一定要赢回来。',
    '下一局祝我好运吧！',
    '胜败乃兵家常事。',
    '输赢都是游戏的一部分，享受过程才是最重要的。',
    '今天真背。',
    '今天幸运女神不在我这边啊。',
    '现在只是开始，等着看我反击。',
]

/** 
 * @typedef {object} AiPlayerChatContent
 * @property {number} id 电脑玩家的id
 * @property {1|2|3|4|5} talkative 健谈程度,值越高则说话越频繁。
 * @property {string[]} content 电脑玩家的聊天用语
*/

/** 
 * @type {AiPlayerChatContent[]}
 */
const aiPlayerChatContents = [
    { id: -1, talkative: 3, content: ['俺老牛力大无穷。', '别把老牛给惹恼了。'], },
    { id: -2, talkative: 3, content: ['大师兄，师傅被妖怪抓走了！', '二师兄，师傅被妖怪抓走了！'], },
    { id: -3, talkative: 1, content: ['我其实是一条龙。', '行李很沉。'], },
    { id: -4, talkative: 3, content: ['大师兄，师傅被妖怪抓走了！', '此恨绵绵无绝期...'], },
    { id: -5, talkative: 4, content: ['看马匹真无聊。', '一会去偷两个蟠桃吃。'], },
    { id: -6, talkative: 2, content: ['阿弥陀佛。', '善哉善哉。'], },
    { id: -7, talkative: 3, content: ['我能看透一切。', '万物皆逃不过我的法眼。'], },
    { id: -8, talkative: 2, content: ['阿弥陀佛。', '善哉善哉。'], },
    { id: -9, talkative: 2, content: ['阿弥陀佛。', '善哉善哉。'], },
    { id: -10, talkative: 3, content: ['俺老孙来也。', '俺老孙去也。'], },
    { id: -11, talkative: 2, content: ['放下屠刀，立地成佛。', '阿弥陀佛。', '善哉善哉。'], },
    { id: -12, talkative: 4, content: ['我才是真的美猴王。', '我才是真的孙悟空。'], },
    { id: -13, talkative: 3, content: ['我挑着担。', '我牵着马。'], },
    { id: -14, talkative: 3, content: ['有情人终成眷属。', '但愿人长久，千里共婵娟。'], },
    { id: -15, talkative: 3, content: ['吾乃东海龙王。', '我才是雨神。'], },
    { id: -16, talkative: 2, content: ['泼猴，你又闯祸了。', '悟空，休耍嘴贫。'], },
    { id: -17, talkative: 5, content: ['看我七十二变。', '猴儿们，操练起来。'], },
    { id: -18, talkative: 2, content: ['你能逃出我的五指山吗。', '阿弥陀佛。', '善哉善哉。'], },
    { id: -19, talkative: 3, content: ['嫦娥真美呀。', '问世间情为何物...'], },
    { id: -20, talkative: 2, content: ['阿弥陀佛。', '善哉善哉。'], },
    { id: -21, talkative: 2, content: ['护持国土。', '慈悲为怀。'], },
    { id: -22, talkative: 3, content: ['想吃唐僧肉。', '吾乃万兽之王。'], },
    { id: -23, talkative: 3, content: ['此树是我栽，此地归我管。', '要想从此过，留下买路财。'], },
    { id: -24, talkative: 3, content: ['道生一，一生二，二生三，三生万物。', '太极生两仪，两仪生四象。'], },
    { id: -25, talkative: 3, content: ['吾乃玉皇大帝。', '来人。给我捉拿妖猴!', '快去请如来佛祖...'], },
    { id: -26, talkative: 4, content: ['我命由我不由天。', '是他是他就是他...'], },
    { id: -27, talkative: 3, content: ['我要娶老婆。', '我怎么变这鬼样子了...'], },
    { id: -28, talkative: 3, content: ['来人，取我宝塔。', '吾乃托塔天王。'], },
    { id: -29, talkative: 4, content: ['呔！妖怪，哪里跑！', '吃俺老孙一棒。'], },
    { id: -30, talkative: 2, content: ['阿弥陀佛。', '善哉善哉。'], },
    { id: -31, talkative: 3, content: ['那头牛又跑去狐狸精那了。', '我四十米的蒲扇已经架不住了。'], },
    { id: -32, talkative: 3, content: ['我是牛魔王。', '哞...'], },
    { id: -33, talkative: 3, content: ['我的意中人会架着七彩祥云来接我。', '我猜中了开头，却猜不中结尾。'], },
    { id: -34, talkative: 3, content: ['我虽然看不见，但我可不瞎哦。'], },
    { id: -35, talkative: 3, content: ['问世间情为何物...', '我希望期限是一万年...'], },
]

/** 
 * @typedef {object} AiPlayerGameMessage
 * @property {number} id 电脑玩家的id
 * @property {string} music 播放的音频文件名。
 * @property {string} text 播放的音频对应的文本内容。
*/

/** 
 * @type {AiPlayerGameMessage[]} 配置参考前端'src\components\chatRoom\tabs\SettingModule.vue' messageGroups
 */
const aiPlayerGameMessages = [
    { id: 1, music: "1", text: "你的牌打得太好了" },
    { id: 2, music: "2", text: "我等得花儿都谢了" },
    { id: 3, music: "3", text: "合作愉快" },
    { id: 4, music: "4", text: "都别走，大战到天亮" },
    { id: 5, music: "5", text: "小小小" },
    { id: 6, music: "6", text: "大大大" },
    { id: 7, music: "7", text: "求师傅" },
    { id: 8, music: "8", text: "求拉满" },
    { id: 9, music: "9", text: "求转向" },
    { id: 10, music: "10", text: "收" },
    { id: 11, music: "11", text: "我太难了" },
    { id: 12, music: "12", text: "我人没了" },
    { id: 13, music: "13", text: "战略性收牌" }
]

module.exports = {
    chatIntervalHandler: chatIntervalHandler,
    commonChatContent: commonChatContent,
    winnerChatContent: winnerChatContent,
    loserChatContent: loserChatContent,
    aiPlayerChatContents: aiPlayerChatContents,
}
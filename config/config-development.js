/* 开发环境配置文件 */

module.exports = {
	mysql: {
		host: 'localhost',
		username: 'leback',
		password: '123456',
		database: 'local_db',
		port: 3306,
		pool: {
			max: 10,
			min: 0,
			idle: 30000
		},
		timezone: '+09:00'
	},
	redis: {
		host: '127.0.0.1',
		port: 6379,
	},
	redisCache: {
		expire: 900,
		playerPrefix: 'player:',
		sessionPrefix: 'sess:',
		gameRoomPrefix: 'room:',
		/** 
		 * @description 该路径下
		 * 游戏id:playCardTimer 保存出牌倒数计时开始经过的时间，
		 * 游戏id:AI玩家id 保存该电脑玩家聊天冷却
		 * 游戏id:chatMessage_时间戳 保存电脑玩家将要发的言
		 */
		aiChatPrefix: 'aiChat:',
		playCardTimerKeyStr: 'playCardTimer',
		aiMessageKeyStr: 'chatMessage_',
		gamePrefix: 'game:',
		playerRecordPrefix: 'playerRecord:',
		gameRecordPrefix: 'gameRecord:',
		rankPrefix: 'rank:',
		rankSubTopPlayersListPrefix: 'rank:topPlayersList:',
	},
	logConf: {
		appenders: {
			jttw: { type: "dateFile", filename: "log/jttw", pattern: '.yyyy-MM-dd.log', alwaysIncludePattern: true }
		},
		categories: {
			default: { appenders: ["jttw"], level: "warn" }
		}
	},
	port: 3000,
	frontOrigin: 'http://localhost:8080',
	APIRoot: '/rest/v1',
	session: {
		name: 'journey_to_the_west',
		secret: 'journey to the west !',
		cookie: {
			maxAge: 3600000,// 1 hour
			secure: false,
			httpOnly: false, //为true的话前端获取不到cookie
		},
		resave: false,
		saveUninitialized: false
	},
	httpHeaders: {
		allowHeaders: 'Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method',
		allowMethods: 'GET, POST, OPTIONS, PATCH, PUT, DELETE',
		allowCredentials: 'true',
	},
	ws: {
		deadTtl: 100, //2700
		forceLogoutTtl: 300, //3000 , 当时间低于这个数说明一段时间没有操作，可以被挤号
		checkPeriod: 60000,
		config: {
			clientTracking: true,
			noServer: true,
			perMessageDeflate: {
				zlibDeflateOptions: {
					chunkSize: 1024,
					memLevel: 7,
					level: 3
				},
				zlibInflateOptions: {
					chunkSize: 10 * 1024
				},
				clientNoContextTakeover: true,
				serverNoContextTakeover: true,
				serverMaxWindowBits: 10,
				concurrencyLimit: 10,
				threshold: 1024,
			}
		},
	},
	ai: {
		chatIntervalDelay: 1000,
	}
}


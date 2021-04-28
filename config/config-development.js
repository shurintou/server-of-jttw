module.exports = {
  mysql:{
      host: 'localhost',
      username: 'leback',
      password: '123456',
      database:'local_db',
      port: 3306,
      pool: {
        max: 10,
        min: 0,
        idle: 30000
      },
      timezone: '+09:00'
  },
  redis:{
      host: '127.0.0.1',
      port: 6379,
  },
  redisCache:{
      expire: 900,
      playerPrefix: 'player:',
      sessionPrefix: 'sess:',
      gameRoomPrefix: 'room:',
      gamePrefix: 'game:',
      playerRecordPrefix: 'playerRecord:',
      gameRecordPrefix: 'gameRecord:',
      rankPrefix: 'rank:',
  },
  logConf:{
    appenders: { 
      jttw: { type: "dateFile", filename: "log/jttw", pattern: '.yyyy-MM-dd.log', alwaysIncludePattern: true } 
    },
    categories: {
      default: { appenders: ["jttw"], level: "error" }
    }
  },
  port: 3000,
  frontOrigin: 'http://192.168.11.11:8080',
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
  httpHeaders:{
    allowHeaders:  'Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method',
    allowMethods: 'GET, POST, OPTIONS, PATCH, PUT, DELETE',
    allowCredentials: 'true',
  },
  ws:{
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
  }
};


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
  }
};


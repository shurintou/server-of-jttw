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
  port: 3000,
  frontOrigin: 'http://192.168.11.11:8080',
  APIRoot: '/rest/v1',
};


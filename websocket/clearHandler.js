const store = require('../common/session').store
const conf = require('../config/')
const redis = require('../database/redis')
const logoutHandler = require('./logoutHandler')

/* 定期清除失活的连接，session，player */  
module.exports =  function(wss){setInterval(function checkConnections() {
    wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false){
        ws.terminate()
        logoutHandler(wss, ws)
      }
      ws.isAlive = false;
    }) 
    store.all( function(err, sessions){
      if (err) {return console.error('error redis response - ' + err)}
      for(let i = 0; i < sessions.length; i++){
        redis.ttl(conf.redisCache.sessionPrefix + sessions[i].sessionID, function(err, res){
          if (err) {return console.error('error redis response - ' + err)}
          if( res < conf.ws.deadTtl ){logoutHandler(wss, sessions[i])}
        })
      }
    }) 
}, conf.ws.checkPeriod)}
var express = require("express");
var session = require('express-session')
var app = express();
const routers = require('./common/routers')
const routerInterceptor = require('./common/routerInterceptor')
let RedisStore = require('connect-redis')(session)
let redisClient = require('./database/redis')

/* 配置config */
const conf = require('./config/')
const port = conf.port
var sess = conf.session
/*************/

/* 解析JSON */
app.use(express.json());
app.use(express.urlencoded({extended: true}));
/************/

/* session */
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}
sess.store = new RedisStore({ client: redisClient }),
app.use(session(sess))
app.use('*', routerInterceptor)//拦截器
/**********/

/* API*(路由) */
Object.keys(routers).forEach(key => {
    app.use(conf.APIRoot, routers[key])//给路由增加根路径
})
/*******/

/* 启动服务器 */
app.listen(port, () => { console.log(`Example app listening at http://localhost:${port}`) })
/*************/


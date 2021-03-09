var express = require("express");
var session = require('./common/session').session
var app = express();
const http = require('http');
const wss = require('./websocket/')
const routers = require('./common/routers')
const routerInterceptor = require('./common/routerInterceptor')

/* 配置config */
const conf = require('./config/')
/*************/

/* 解析JSON */
app.use(express.json());
app.use(express.urlencoded({extended: true}));
/************/

/* session */
if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
}
app.use(session)
app.use('*', routerInterceptor)//拦截器
/**********/

/* websocket */
const server = http.createServer(app);
server.on('upgrade', function (request, socket, head) {
  session(request, {}, () => {
    if (request.session.username === undefined || !request.session.username) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit('connection', ws, request);
    });
  });
});
/************/

/* API*(路由) */
Object.keys(routers).forEach(key => {
    app.use(conf.APIRoot, routers[key])//给路由增加根路径
})
/*******/

/* 启动服务器 */
// app.listen( conf.port, () => {} )
server.listen(conf.port, () => {}) 
/*************/


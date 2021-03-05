var express = require("express");
var bodyParser = require('body-parser');
var register = require('./routers/register')
var app = express();
const conf = require('./config/config-development')
const models = require('./common/models')

/* 配置config */
var port = conf.port
const frontOrigin = conf.frontOrigin
const APIRoot = conf.APIRoot

/* 解析JSON */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

/* 允许跨域 */
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', frontOrigin)
    res.header('Access-Control-Allow-Headers', 'Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method' )
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE')
    res.header('Allow', 'GET, POST, PATCH, OPTIONS, PUT, DELETE')
    next();
});

/* API */
app.use(APIRoot, register)


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})


/* DAO */
async function asd(){
  var InvitationCode = models.invitationCode
  await InvitationCode.create(
    { invitation_code: "gsdbc"},
  );
}
asd()
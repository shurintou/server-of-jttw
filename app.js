var express = require("express");
var register = require('./routers/register')
var app = express();
const conf = require('./config/config-development')

/* 配置config */
const port = conf.port
const frontOrigin = conf.frontOrigin
const APIRoot = conf.APIRoot

/* 解析JSON */
// app.use(bodyParser.json());
app.use(express.json());
// app.use(bodyParser.urlencoded({extended: true}));
app.use(express.urlencoded({extended: true}));

/* 允许跨域 */
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
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


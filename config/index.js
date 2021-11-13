/* 系统运行时引入的配置文件，会根据环境变量来引入不同配置文件 */

if(process.env.NODE_ENV === 'development'){
    var f = 'config-development.js'
    module.exports = require('../config/' + f)

}
else{
    var f = 'config-production.local.js'
    module.exports = require('../config/' + f)
}

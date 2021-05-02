if(process.env.NODE_ENV === 'development'){
    var f = 'config-development.js'
    module.exports = require('../config/' + f)

}
else{
    var f = 'config-production.local.js'
    module.exports = require('../config/' + f)
}

const fs = require('fs')
if(process.env.NODE_ENV === 'development'){
    var f = 'config-development.js'
    console.log('import config from file ' + f) 
    module.exports = require('../config/' + f)

}
else{
    var f = 'config-production.js'
    console.log('import config from file ' + f )
    module.exports = require('../config/' + f)
}

const fs = require('fs');
var f
if(process.env.NODE_ENV === 'development'){
    f = 'config-development.js'
    console.log('import config from file ' + f); 
    module.exports = require('../config/' + f);

}
else{
    f = 'config-production.js'
    console.log('import config from file ' + f );
    module.exports = require('../config/' + f);
}

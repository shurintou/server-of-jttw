const devConfig = require('../config/config-development.js')
const proConfig = require('../config/config-production.local.js')

if (process.env.NODE_ENV === 'production') {
    module.exports = proConfig
}
else {
    module.exports = devConfig
}

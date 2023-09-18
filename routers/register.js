const express = require('express')
const router = express.Router()
const registerService = require('../services/registerService')
const logger = require('../common/log')


router.post('/register', function (req, res) {
    registerService.register(req.body)
        .then(result => {
            /* status是200的情况下也会有错误，主要看result.code的状态码 */
            res.status(200).json({ code: result.code, message: result.message })
        })
        .catch(err => {
            logger.error(err.message)
            res.status(err.code ? err.code : 500).json({ message: err.message })
        })
})


module.exports = router
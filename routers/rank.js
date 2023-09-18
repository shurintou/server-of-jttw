const express = require('express')
const router = express.Router()
const rankService = require('../services/rankService')
const logger = require('../common/log')

router.get('/rank/', function (req, res) {
    rankService.getRankInfo(req)
        .then(result => {
            res.status(200).json({ code: result.code, message: result.message, type: result.type, rank: result.result ? result.result : null })
        })
        .catch(err => {
            logger.error(err.message)
            res.status(err.code ? err.code : 500).json({ message: err.message })
        })
})

module.exports = router
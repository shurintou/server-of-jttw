const express = require('express')
const router = express.Router()
const modifyService = require('../services/modifyService')
const baseUrl = '/modify'
const logger = require('../common/log')

router.put(baseUrl + '/avatar', function (req, res) {
    modifyService.modifyAvatar(req)
        .then(result => {
            res.status(200).json({ code: result.code, message: result.message })
        })
        .catch(err => {
            logger.error(err.message)
            res.status(err.code ? err.code : 500).json({ message: err.message })
        })
})

router.put(baseUrl + '/nickname', function (req, res) {
    modifyService.modifyNickname(req)
        .then(result => {
            res.status(200).json({ code: result.code, message: result.message })
        })
        .catch(err => {
            logger.error(err.message)
            res.status(err.code ? err.code : 500).json({ message: err.message })
        })
})

module.exports = router

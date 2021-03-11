var express = require('express');
var router = express.Router();
const modifyService = require('../services/modifyService')
const baseUrl = '/modify'

router.put( baseUrl + '/avatar', function (req, res) {
    modifyService.modifyAvatar(req)
    .then(result => {
        res.status(200).json({code: result.code, message: result.message})
    })
    .catch(err => {
        res.status(err.code? err.code:500).json({message: err.message})
    })
});

router.put( baseUrl + '/nickname', function (req, res) {
    modifyService.modifyNickname(req)
    .then(result => {
        res.status(200).json({code: result.code, message: result.message})
    })
    .catch(err => {
        res.status(err.code? err.code:500).json({message: err.message})
    })
});

module.exports = router

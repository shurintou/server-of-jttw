var express = require('express')
var router = express.Router()
const infoSearchService = require('../services/infoSearchService')


router.get('/player/record/:id', function (req, res) {
    infoSearchService.getPlayerRecord(req)
    .then(result => {
        res.status(200).json({code: result.code,  message: result.message, record: result.record ? result.record : null})
    })
    .catch(err => {
        res.status(err.code? err.code:500).json({message: err.message})
    })
})

router.get('/game/records/:page', function(req, res){
    infoSearchService.getGameRecordsList(req)
    .then(result => {
        res.status(200).json({code: result.code,  message: result.message, pageNum: result.pageNum ? result.pageNum : 0, list: result.list? result.list : []})
    })
    .catch(err => {
        res.status(err.code? err.code:500).json({message: err.message})
    })
})


module.exports = router
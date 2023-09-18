const express = require('express')
const router = express.Router()
const infoSearchService = require('../services/infoSearchService')
const logger = require('../common/log')
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/http').ClientResponse}
 */

router.get('/player/record/:id', function (req, res) {
    /** 
     * @param {ClientRequest} req
     * @param {ClientResponse} res
     */
    infoSearchService.getPlayerRecord(req)
        .then(result => {
            res.status(200).json({ code: result.code, message: result.message, record: result.record ? result.record : null })
        })
        .catch(err => {
            logger.error(err.message)
            res.status(err.code ? err.code : 500).json({ message: err.message })
        })
})

router.get('/game/records/',
    /** 
     * @param {ClientRequest} req
     * @param {ClientResponse} res
     */
    function (req, res) {
        infoSearchService.getGameRecordsList(req)
            .then(result => {
                res.status(200).json({ code: result.code, message: result.message, pageNum: result.pageNum ? result.pageNum : 0, list: result.list ? result.list : [] })
            })
            .catch(err => {
                logger.error(err.message)
                res.status(err.code ? err.code : 500).json({ message: err.message })
            })
    })

router.get('/game/record/:id',
    /** 
     * @param {ClientRequest} req
     * @param {ClientResponse} res
     */
    function (req, res) {
        infoSearchService.getGameRecord(req)
            .then(result => {
                res.status(200).json({ code: result.code, message: result.message, gameResult: result.gameResult ? result.gameResult : null })
            })
            .catch(err => {
                logger.error(err.message)
                res.status(err.code ? err.code : 500).json({ message: err.message })
            })
    })


module.exports = router
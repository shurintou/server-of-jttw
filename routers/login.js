const express = require('express')
const router = express.Router()
const loginService = require('../services/loginService')
const sessionHandler = require('../common/session').sessionHandler
const logger = require('../common/log')
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/http').ClientResponse}
 */

router.post('/login',
    /** 
     * @param {ClientRequest} req
     * @param {ClientResponse} res
     */
    function (req, res) {
        loginService.login(req)
            .then(result => {
                /* code为200则登录成功，设置session */
                if (result.code === 200) {
                    sessionHandler(req, result.account)
                    res.status(200).json({ code: result.code, message: result.message, account: result.account })
                }
                else if (result.code === 409) {
                    req.session.destroy(() => { })
                    res.status(200).json({ code: result.code, message: result.message })
                }
                else {
                    req.session.destroy(() => { })
                    res.status(200).json({ code: result.code, message: result.message })
                }
            })
            .catch(err => {
                req.session.destroy(() => { })
                logger.error(err.message)
                res.status(err.code ? err.code : 500).json({ message: err.message })
            })
    })

router.delete('/logout',
    /** 
     * @param {ClientRequest} req
     * @param {ClientResponse} res
     */
    function (req, res) {
        loginService.logout(req).then(() => {
            res.status(200).json({ code: 200, message: '' })
        })
    })


module.exports = router
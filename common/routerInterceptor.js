/* 路由拦截器 */

const conf = require('../config/')
const errors = require('./errors')
/** 
 * @typedef {import('../types/http').ClientRequest}
 * @typedef {import('../types/http').ClientResponse}
 * @typedef {import('express').NextFunction}
 */

module.exports =
    /** 
     * @param {ClientRequest} req
     * @param {ClientResponse} res
     * @param {NextFunction} next
     * @returns {void}
     */
    function (req, res, next) {
        res.header('Access-Control-Allow-Origin', conf.frontOrigin)
        res.header('Access-Control-Allow-Headers', conf.httpHeaders.allowHeaders)
        res.header('Access-Control-Allow-Methods', conf.httpHeaders.allowMethods)
        res.header('Access-Control-Allow-Credentials', conf.httpHeaders.allowCredentials)
        //如果请求的路径是登录或注册，则通过
        if (req._parsedUrl.path.indexOf('/login') !== -1 || req._parsedUrl.path.indexOf('/register') !== -1) {
            next()
        }
        else {
            //如果请求的是其他路径，且请求中带有session.username，则通过
            if (req.session.username) {
                next()
            }
            //否则报session过期错误
            else {
                res.status(200).json(errors.SESSION_TIMEOUT)
            }
        }
    }
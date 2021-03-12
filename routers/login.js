var express = require('express');
var router = express.Router();
const loginService = require('../services/loginService')
const sessionHandler = require('../common/session').sessionHandler

router.post('/login', function (req, res) {
    loginService.login(req)
    .then(result => {
        /* code为200则登录成功，设置session */
        if(result.code === 200){
            sessionHandler(req, result.account)
            res.status(200).json({code: result.code, message: result.message, account: result.account})
        }
        else if(result.code === 409){
            req.session.destroy( () => {} )
            res.status(200).json({code: result.code, message: result.message})
        }
        else{
            req.session.destroy( () => {} )
            res.status(200).json({code: result.code, message: result.message})
        }
    })
    .catch(err => {
        req.session.destroy( () => {} )
        res.status(err.code? err.code:500).json({message: err.message})
    })
});

router.delete('/logout', function(req, res){
    loginService.logout(req)
    res.status(200).json({code: 200, message: ''})
})


module.exports = router
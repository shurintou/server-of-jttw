var express = require('express');
var router = express.Router();
const loginService = require('../services/loginService')

router.post('/login', function (req, res) {
    loginService.login(req.body)
    .then(result => {
        /* code为200则登录成功，设置session */
        if(result.code === 200){
            req.session.username = req.body.username
            req.session.userId = result.account.id
            res.status(200).json({code: result.code, message: result.message, account: result.account})
        }
        else if(result.code === 409){
            req.session.destroy( () => {} )
        }
    })
    .catch(err => {
        res.status(err.code? err.code:500).json({message: err.message})
    })
});

router.delete('/logout', function(req, res){
    loginService.logout(req)
})


module.exports = router
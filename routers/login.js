var express = require('express');
var router = express.Router();
const loginService = require('../service/loginService')

router.post('/login', function (req, res) {
    loginService.login(req.body)
    .then(result => {
        /* code为200则登录成功，设置session */
        if(result.code === 200){
            req.session.username = req.body.username
        }
        res.status(200).json({code: result.code,  message: result.message})
    })
    .catch(err => {
        res.status(err.code? err.code:500).json({message: err.message})
    })
});


module.exports = router
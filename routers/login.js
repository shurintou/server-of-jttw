var express = require('express');
var router = express.Router();
const loginService = require('../service/loginService')

router.post('/login', function (req, res) {
    loginService.login(req.body)
    .then(result => {
        res.status(200).json({code: result.code,  message: result.message})
    })
    .catch(err => {
        res.status(err.code? err.code:500).json({message: err.message})
    })
});


module.exports = router
var express = require('express');
var router = express.Router();


router.post('/register', function (req, res) {
    console.log(req.body)
    res.json({result : 1, message: '服务器正忙'})
});


module.exports = router
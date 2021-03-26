const models = require('../common/models')
const redis = require('../database/redis')
const conf = require('../config/')

module.exports = {
    getPlayerRecord: async function(req){
        var recordId = 'record:' + req.params.id
        try{
            var checkResult = await redisWrapper(recordId)
            if(checkResult.result){
                /* 缓存中有record的话直接读取 */
                return Promise.resolve({code: 200, message: '', record: checkResult.record})
            }
            else{
                /* 没有record的话从数据库读取数据返回结果，并同时缓存到redis */
                const Record = models.record
                var records = await Record.findAll({where:{ accountId : req.params.id }})
                var record = records[0]
                redis.multi()
                .set(recordId, JSON.stringify(record, null, 4))
                .expire(recordId, conf.redisCache.expire)
                .exec( function(err){
                    if (err) {return console.error('error redis response - ' + err)}
                })
                return Promise.resolve({code: 200, message: '', record: record.toJSON()})
            }
        }
        catch(e){
            return Promise.reject({message: e})
        }
    }
}

function redisWrapper(recordId){
    return new Promise((resolve, reject) => {
        /* 查询redis中是否有缓存，并返回结果 */
        redis.get(recordId, function(err, res){
            if (err) {return reject({message: 'error redis response - ' + err })}
            if(res === null){
                return resolve({result: false})
            }
            else{
                return resolve({result: true, record: JSON.parse(res)})
            }
        })
    })  
}
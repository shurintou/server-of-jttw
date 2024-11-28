const bcrypt = require('bcrypt')

// 定义加密强度
const salt = bcrypt.genSaltSync(10);

module.exports = {
    /** 
    * @summary 生成哈希密码。
    * @param {string} userPassword 密码
    * @returns {string} 密码的哈希值
    */
    getHash: function (userPassword) {
        return bcrypt.hashSync(userPassword, salt)
    },
    /** 
    * @summary 比较哈希值与用户输入的密码。
    * @param {string} userPassword 用户输入密码
    * @param {string} storedPasswordHash 储存的密码的哈希值
    * @returns {boolean} 比较结果
    */
    compare: function (userPassword, storedPasswordHash) {
        return bcrypt.compareSync(userPassword, storedPasswordHash)
    },
}
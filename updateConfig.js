const os = require('os')
const fs = require('fs')
const path = require('path')
const { frontPort } = require('./config/config-development')

// 该脚本旨在获取本地 IP 地址并以此更新开发配置文件。

/** 
 * 获取本地 IP 地址
 * @returns {string}
 */
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces()
    let ipAddress = ''

    for (let iface in interfaces) {
        for (let i = 0; i < interfaces[iface].length; i++) {
            const address = interfaces[iface][i]
            // 选择 IPv4 地址并排除环回地址
            if (address.family === 'IPv4' && !address.internal) {
                ipAddress = address.address
                break
            }
        }
    }

    return ipAddress
}

/** 
 * 更新 config 文件中的前端 IP 地址
 * @param {string} ipAddress
 * @returns {void}
 */
function updateConfig(ipAddress) {
    const configFilePath = path.join(__dirname, './config/config-development.js') // config 文件路径
    let fileContent = fs.readFileSync(configFilePath, 'utf8')

    // 使用正则表达式替换 frontOrigin 的值
    const updatedContent = fileContent.replace(/frontOrigin: '.*?'/, `frontOrigin: 'http://${ipAddress}:${frontPort}'`)

    // 写回 config 文件
    fs.writeFileSync(configFilePath, updatedContent, 'utf8')
}

// 主函数
function main() {
    const ipAddress = getLocalIpAddress()
    if (ipAddress) {
        console.log(`Local IP address: ${ipAddress}`)
        updateConfig(ipAddress)
        console.log('config file updated successfully')
    } else {
        console.log('Failed to get local IP address')
    }
}

main()

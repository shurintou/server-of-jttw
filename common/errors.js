module.exports={
    SESSION_TIMEOUT: {code: 401, message: '账号信息已过期，请重新登录'},
    WEBSOCKET_SESSION_TIMEOUT: {code: 1000, message: '账号信息已过期，请重新登录'},
    USERNAME_NOT_FOUND: {code: 406, message: '用户名不存在，请重新输入'},
    USERNAME_USED: {code: 406 , message: '用户名已使用，请重新输入'},
    WRONG_PASSWORD: {code: 406, message: '密码不正确，请重新输入'},
    DUBLICATE_ACCESS: {code: 409, message: '请勿重复登录'},
    INVITATIONCODE_NOT_FOUND: {code: 406, message: '邀请码不存在，请重新输入'},
    INVITATIONCODE_USED: {code: 406, message: '邀请码已使用，请重新输入'},
}
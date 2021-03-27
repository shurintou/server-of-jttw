module.exports={
    SESSION_TIMEOUT: {code: 401, message: '账号信息已过期，请重新登录'},
    WEBSOCKET_SESSION_TIMEOUT: {code: 1000, message: '账号信息已过期，请重新登录'},
    USERNAME_NOT_FOUND: {code: 406, message: '用户名不存在，请重新输入'},
    USERNAME_USED: {code: 406 , message: '用户名已使用，请重新输入'},
    WRONG_PASSWORD: {code: 406, message: '密码不正确，请重新输入'},
    DUBLICATE_ACCESS: {code: 409, message: '系统检测到重复登录，请稍后重试'},
    INVITATIONCODE_NOT_FOUND: {code: 406, message: '邀请码不存在，请重新输入'},
    INVITATIONCODE_USED: {code: 406, message: '邀请码已使用，请重新输入'},
    ROOM_FULL:{code: 0, message: '房间已满员，无法进入'},
    SEAT_FULL:{code: 0, message: '座位已被占，无法进入'},
    ALREADY_IN_ROOM:{code: 0, message: '已在房间之中'},
}
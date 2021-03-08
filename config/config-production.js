module.exports = {

    session: {
        name: 'journey_to_the_west',
        secret: 'journey to the west !',
        cookie: {
            maxAge: 3600000, // 1 hour
            secure: true
        },
        resave: false,
        saveUninitialized: false
    },
}
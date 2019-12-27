const verify = require('./util.verify');

module.exports = secret => function (req, res, next) {
    const token = req.get('x-authorization');
    const {username, sessionId} = verify(token, secret);
    req.username = username;
    req.sessionId = sessionId;
    next();
};

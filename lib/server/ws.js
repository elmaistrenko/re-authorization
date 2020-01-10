const parseUrl = require('parseurl');
const qs = require('qs');
const verify = require('./util.verify');

const TOKEN_KEY = 'access';

const handleUpgrade = secret => function (req, socket, head) {
    let token;
    try {
        const parsed = parseUrl(req);
        token = qs.parse(parsed.query)[TOKEN_KEY];
        req.user = verify(token, secret);
    } catch (e) {
        socket.destroy();
        return false;
    }
};

module.exports = {
   TOKEN_KEY,
   handleUpgrade,
};

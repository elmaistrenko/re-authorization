const parseUrl = require('parseurl');
const qs = require('qs');
const verify = require('./util.verify');
const constants = require('../constants');

const handleUpgrade = (secret, tokenKey = constants.DEFAULT_WS_ACCESS_PARAM) => function (req, socket, head) {
    let token;
    try {
        const parsed = parseUrl(req);
        token = qs.parse(parsed.query)[tokenKey];
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

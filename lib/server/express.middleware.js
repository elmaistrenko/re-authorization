const verify = require('./util.verify');
const constants = require('../constants');

module.exports = (secret, headerName = constants.DEFAULT_HTTP_ACCESS_HEADER) => function (req, res, next) {
    const token = req.get(headerName);
    req.user = verify(token, secret);
    next();
};

const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const is400 = require('./util.is400');

module.exports = function (token, secret) {
    try {
        return jwt.verify(token, secret);
    } catch (e) {
        if (is400(e))
            throw createError(401);
        throw e;
    }
};

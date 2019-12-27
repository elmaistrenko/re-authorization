const {isString, pick} = require('lodash');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const credentialsSchema = require('./credentialsSchema');
const is400 = require('./util.is400');

const TEN_YEARS_MS = 10 * 365 * 24 * 3600 * 1000;
const ONE_HOUR_MS = 3600 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

module.exports = async function (credentialsRaw, options) {
    let {
        refreshSecret,
        accessSecret,
        accessTtl = FIFTEEN_MIN_MS,
        checkCredentials,
        sessionStorage,
    } = options;
    let {value: credentials, error} = credentialsSchema.validate(credentialsRaw);
    if (error)
        throw createError(400);
    let sessionId, expiresIn, remember;
    if (isString(credentials)) {
        try {
            const payload = jwt.verify(credentials, refreshSecret);
            credentials = payload.credentials;
            sessionId = payload.sessionId;
            remember = payload.remember;
            const {exp} = payload;
            expiresIn = exp * 1000 - new Date();
        } catch (e) {
            if (is400(e))
                throw createError(400);
            throw e;
        }
    } else {
        remember = credentials.remember;
        expiresIn = remember ? TEN_YEARS_MS: ONE_HOUR_MS;
    }
    const {username} = credentials;
    const {add, check} = sessionStorage;
    if (
        !await checkCredentials(pick(credentials, ['username', 'password'])) ||
        sessionId && !await check(sessionId, username)
    )
        throw createError(400);
    if (!sessionId)
        sessionId = await add(username, expiresIn);
    const refresh = jwt.sign({
        credentials,
        sessionId,
        remember,
    }, refreshSecret, {
        expiresIn: Math.round(expiresIn / 1000),
    });
    const access = jwt.sign({
        username,
        sessionId,
    }, accessSecret, {
        expiresIn: Math.round(accessTtl / 1000),
    });

    return {refresh, access};
};



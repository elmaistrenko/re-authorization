const {Router} = require('express');
const {isObject} = require('lodash');
const middleware = require('./express.middleware');
const sign = require('./util.sign');

module.exports = options => {
    let {
        accessSecret,
        sessionStorage: {remove, removeAll},
        getUser = async username => ({username}),
    } = options;
    const router = new Router();
    router.post('/login', async function(req, res, next) {
        try {
            await res.json(await sign(isObject(req.body) ? {...req.body, ...req.query}: req.body, options));
        } catch (e) {
            next(e);
        }
    });
    router.post('/logout', middleware(accessSecret), async function(req, res, next) {
        try {
            const {sessionId, username} = req.user;
            await remove(sessionId, username);
            res.status(204);
            await res.send();
        } catch (e) {
            next(e);
        }
    });
    router.post('/logout-all', middleware(accessSecret), async function(req, res, next) {
        try {
            const {username} = req.user;
            await removeAll(username);
            res.status(204);
            await res.send();
        } catch (e) {
            next(e);
        }
    });
    router.get('/me', middleware(accessSecret), async function(req, res, next) {
        try {
            const {username} = req.user;
            await res.json(await getUser(username));
        } catch (e) {
            next(e);
        }
    });

    return router;
};

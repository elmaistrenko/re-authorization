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

const handleUpgradeLogout = (wss, pathname = constants.DEFAULT_LOGOUT_WS_PATHNAME, liveTime, sessionStorage, callbacks) => function (req, socket, head) {
    try {
        const parsed = parseUrl(req);
        if (pathname !== parsed.pathname)
            return;
        const {sessionId, username} = req.user;
        const {check} = sessionStorage;
        wss.handleUpgrade(req, socket, head, function (ws) {
            function callback() {
                check(sessionId, username, undefined, false)
                    .then(r => {
                        if (!r)
                            ws.close(4001);
                    })
                    .catch(() => {});
            }

            callbacks.push(callback);
            ws.onclose = () => callbacks.splice(callbacks.indexOf(callback), 1);
            if (liveTime)
                setTimeout(function () {
                    ws.close(1000);
                }, liveTime);
        });
        return true;
    } catch (e) {
        socket.destroy();
        return false;
    }
};

function onUpgrade(server, handlers) {
    server.on('upgrade', (req, socket, head) => {
        let handled = false;
        [
            ...handlers,
            function () {
                socket.destroy();
            },
        ].forEach(handleUpgrade => {
            if (!handled && !socket.destroyed) {
                const r = handleUpgrade(req, socket, head);
                if (r === true) {
                    handled = true;
                } else if (r === false) {
                    socket.destroy();
                }
            }
        });
    });
}

module.exports = {
    onUpgrade,
    handleUpgrade,
    handleUpgradeLogout,
};

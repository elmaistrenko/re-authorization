const {Server} = require('http');
const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');
const {wrapper} = require('mongodb-reconnectable');
const WebSocket = require('ws');
const router = require('../lib/server/express.router');
const middleware = require('../lib/server/express.middleware');
const createSessionStorage = require('../lib/server/sessionStorage');
const onUpgrade = require('../lib/server/onUpgrade');
const {handleUpgrade, handleUpgradeLogout} = require('../lib/server/ws');

app.use(
    cors(),
    bodyParser.json(),
    bodyParser.text(),
);

const server = new Server(app);

const wss = new WebSocket.Server({
    noServer: true,
    clientTracking: false,
});

const callbacks = [];

const {wrapped, destroy, isDestroyed} = wrapper({
    url: 'mongodb://faces.vc:28025',
    onError: console.log,
    clientOptions: {
        replicaSet: 'rs',
    },
    onChange: function (change) {
        const {ns: {db, coll}} = change;
        console.log(db, coll, callbacks)
        if (db === 'test' && coll === 'session') {
            callbacks.forEach(c => c());
        }
    },
});

const coll = function() {
    return wrapped('test', 'session');
};

const sessionStorage = createSessionStorage(coll);

onUpgrade.apply(server, [
    [
        handleUpgrade('qwerty11'),
        handleUpgradeLogout(wss, '/logout', 5000, sessionStorage, callbacks),
    ]
]);

app.use(router({
    refreshSecret: 'qwerty',
    accessSecret: 'qwerty11',
    checkCredentials: async ({username, password}) => username === password,
    sessionStorage,
}));

server.listen(3000);

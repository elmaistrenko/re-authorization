const app = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');
const {wrapper} = require('mongodb-reconnectable');
const router = require('../lib/server/express.router');
const middleware = require('../lib/server/express.middleware');
const createSessionStorage = require('../lib/server/sessionStorage');

app.use(
    cors(),
    bodyParser.json(),
    bodyParser.text(),
);

const {wrapped, destroy, isDestroyed} = wrapper({
    url: 'mongodb://localhost:28025',
    onError: console.log,
    clientOptions: {
        replicaSet: 'rs',
    },
    onChange: console.log,
});

const coll = function() {
    return wrapped('test', 'session');
};

const sessionStorage = createSessionStorage(coll);

app.use(router({
    refreshSecret: 'qwerty',
    accessSecret: 'qwerty1',
    checkCredentials: async ({username, password}) => username === password,
    sessionStorage,
}));

app.listen(3000);

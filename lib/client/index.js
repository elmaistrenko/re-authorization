require('isomorphic-fetch');
const createError = require('http-errors');
const {merge, isString, isUndefined, isNull} = require('lodash');
const retry = require('promise-retry');
const WebSocket = require('isomorphic-ws');
const param = require('jquery-param');
const Emittery = require('emittery');
const {runSaga, stdChannel} = require('redux-saga');
const {call, delay} = require('redux-saga/effects');
const constants = require('../constants');

const AUTHORIZED = 'AUTHORIZED';
const UNAUTHORIZED = 'UNAUTHORIZED';
const HAS_REQUESTS = 'HAS_REQUESTS';
const HAS_HTTP_REQUESTS = 'HAS_HTTP_REQUESTS';
const HAS_NOT_REQUESTS = 'HAS_NOT_REQUESTS';
const HAS_NOT_HTTP_REQUESTS = 'HAS_NOT_HTTP_REQUESTS';

class ApiClient extends Emittery {
    constructor({
                    base,
                    store = new MemoryStore(),
                    isAuthRequired = true,
                    wsAccessKey = constants.DEFAULT_WS_ACCESS_PARAM,
                    accessHeader = constants.DEFAULT_HTTP_ACCESS_HEADER,
                    routes = {
                        login: '/login',
                        logout: '/logout',
                        logoutAll: '/logout-all',
                        me: '/me',
                    },
                    logoutWsPathname = constants.DEFAULT_LOGOUT_WS_PATHNAME,
                }) {
        super();
        const s = /^https:\/\//.test(base);
        const wsBase = base.replace(/^https?:\/\//, s ? 'wss://' : 'ws://');
        this._config = {base, store, isAuthRequired, wsBase, routes, wsAccessKey, accessHeader, logoutWsPathname};
        this._requestsCount = 0;
        this._httpRequestsCount = 0;
        this._authorized = false;
        this._authorizedCallbacks = [];
        this.on(AUTHORIZED, () => {
            this._authorized = true;
            this._authorizedCallbacks.forEach(fn => fn(true));
        });
        this.on(UNAUTHORIZED, () => {
            this._authorized = false;
            this._authorizedCallbacks.forEach(fn => fn(false));
        });
    }

    get isAuthRequired() {
        return this._config.isAuthRequired;
    }

    authorized(timeout) {
        const {isAuthRequired} = this._config;

        return new Promise(resolve => {
            if (!isAuthRequired)
                return resolve();

            if (this._authorized)
                return resolve(true);

            let t;
            const cb = (value = true) => {
                resolve(value);
                this._authorizedCallbacks.splice(this._authorizedCallbacks.indexOf(cb), 1);
                clearTimeout(t);
            };
            this._authorizedCallbacks.push(cb);
            if (timeout)
                t = setTimeout(() => {
                    cb(false);
                }, timeout);
        });
    }

    async _request(url, options) {
        const {base} = this._config;
        const res = await fetch(
            makeUrl(url, base),
            options,
        );
        if (res.status === 204)
            return;
        let r;
        if (/^application\/json/.test(res.headers.get('Content-Type')))
            r = await res.json();
        if (!res.ok) {
            const error = createError(res.status, res.statusText);
            error.details = r;
            throw error;
        }
        return isUndefined(r) ? res : r;
    }

    async login(credentials, remember = true, logout = false) {
        const {routes: {login: url}, store} = this._config;
        if (logout && await store.get())
            await this.logout();
        const isToken = isString(credentials);
        const r = await this.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': isToken ? 'text/plain' : 'application/json',
            },
            body: isToken ? credentials : JSON.stringify({...credentials, remember}),
        }, true);
        const obj = {...r, remember};
        await store.set(obj);
        this.emit(AUTHORIZED);
        return obj;
    }

    wsRequest(url, noAuth) {
        this._startRequest(false);
        let triedToAuth = false;
        let authFailed = false;
        const {wsBase, wsAccessKey, isAuthRequired} = this._config;
        return retry(async retry => {
            try {
                const u = new URL(makeUrl(url, wsBase));
                const access = await this.getAccess(noAuth, authFailed);
                if (access)
                    u.searchParams.set(wsAccessKey, access);
                return await new Promise((resolve, reject) => {
                    const ws = new WebSocket(u.toString());
                    ws.onopen = function () {
                        resolve(ws);
                    };
                    ws.onclose = function () {
                        reject(createError(401));
                    };
                    ws.onerror = () => {
                        reject(createError(401));
                    };
                });
            } catch (e) {
                if (e.statusCode === 401) {
                    authFailed = true;
                    if (triedToAuth) {
                        this.emit(UNAUTHORIZED);
                        throw e;
                    }
                    if (!triedToAuth && !noAuth) {
                        triedToAuth = true;
                        return retry(e);
                    }
                }
                if (e.statusCode >= 500)
                    return retry(e);
                throw e;
            }
        }, {
            retries: 3,
            minTimeout: 100,
            maxTimeout: 2000,
        }).then(r => {
            if (isAuthRequired && !noAuth && !this._authorized)
                this.emit(AUTHORIZED);
            return r;
        }).finally(() => {
            this._endRequest(false);
        });
    }

    request(url, options, noAuth = false) {
        this._startRequest();
        let triedToAuth = false;
        let authFailed = false;
        const {isAuthRequired} = this._config;
        return retry(async retry => {
            try {
                const access = await this.getAccess(noAuth, authFailed);
                return await this._request(url, merge({
                    ...access ? {
                        headers: {
                            [this._config.accessHeader]: access,
                        }
                    } : {}
                }, options));
            } catch (e) {
                if (e.statusCode === 401) {
                    authFailed = true;
                    if (triedToAuth) {
                        this.emit(UNAUTHORIZED);
                        throw e;
                    }
                    if (!triedToAuth && !noAuth) {
                        triedToAuth = true;
                        return retry(e);
                    }
                }
                if (e.statusCode >= 500)
                    return retry(e);
                throw e;
            }
        }, {
            retries: 3,
            minTimeout: 100,
            maxTimeout: 2000,
        }).then(r => {
            if (isAuthRequired && !noAuth && !this._authorized)
                this.emit(AUTHORIZED);
            return r;
        }).finally(() => {
            this._endRequest();
        });
    }

    async getAccess(noAuth = false, forceUpdate = false) {
        const {isAuthRequired} = this._config;
        if (noAuth || !isAuthRequired)
            return;
        const {store} = this._config;
        let {access, refresh, remember} = await store.get() || {};
        if (!access || forceUpdate) {
            if (!refresh)
                throw createError(401);
            try {
                return (await this.login(refresh, remember)).access;
            } catch (e) {
                if (e.statusCode === 400) {
                    await store.set(null);
                }
                throw createError(401);
            }
        }
        return access;
    }

    async logout(req = true) {
        const {routes: {logout: url}} = this._config;
        if (req)
            await this.request(url, {
                method: 'POST',
            });
        await this._config.store.set(null);
        this.emit(UNAUTHORIZED);
    }

    async logoutAll() {
        const {routes: {logoutAll: url}} = this._config;
        await this.request(url, {
            method: 'POST',
        });
        await this.logout(false);
    }

    me() {
        const {routes: {me: url}} = this._config;
        return this.request(url);
    }

    _startRequest(http = true) {
        this._requestsCount++;
        if (this._requestsCount === 1)
            this.emit(HAS_REQUESTS);
        if (http) {
            this._httpRequestsCount++;
            if (this._httpRequestsCount === 1)
                this.emit(HAS_HTTP_REQUESTS);
        }
    }

    _endRequest(http = true) {
        this._requestsCount--;
        if (this._requestsCount === 0)
            this.emit(HAS_NOT_REQUESTS);
        if (http) {
            this._httpRequestsCount--;
            if (this._httpRequestsCount === 0)
                this.emit(HAS_NOT_HTTP_REQUESTS);
        }
    }

    watchLogout() {
        const client = this;
        runSaga({
            channel: stdChannel(),
            getState() {
            },
            dispatch(output) {
            }
        }, function* () {
            while (true) {
                let socket;
                try {
                    socket = yield call([client, client.wsRequest], client._config.logoutWsPathname);
                    yield call(() => new Promise((resolve, reject) => {
                        socket.onclose = evt => {
                            if (evt.code === 4001)
                                client.logout(false).then(resolve).catch(() => {});
                            else
                                reject(new Error());
                        };
                    }));
                } catch (e) {
                    console.log(e)
                    if (e.statusCode === 401) {
                        while (true) {
                            const authorized = yield call(async () => await client.authorized() !== false);
                            if(authorized === true)
                                break;
                        }
                    }
                    delay(1000);
                } finally {
                    if (socket)
                        socket.close();
                }
            }
        });
    }
}

class MemoryStore {
    constructor(initialState) {
        this._state = initialState || null;
    }

    async get() {
        return this._state;
    }

    async set(value) {
        this._state = value;
    }
}

class BrowserStore {
    constructor(urlKey = constants.DEFAULT_URL_ACCESS_PARAM, storageKey = constants.DEFAULT_BROWSER_STORAGE_KEY) {
        const u = new URL(location.href);
        const access = u.searchParams.get(urlKey);
        const session = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        const local = JSON.parse(localStorage.getItem(storageKey) || 'null');
        this._urlState = access ? {access}: null;
        this._useUrlStorage = !!access;
        this._useSessionStorage = !!session;
        this._useLocalStorage = !!local;
        this._storageKey = storageKey;
    }

    async get() {
        if (this._useUrlStorage)
            return this._urlState;
        if (this._useSessionStorage)
            return JSON.parse(sessionStorage.getItem(this._storageKey) || 'null');
        if (this._useLocalStorage)
            return JSON.parse(localStorage.getItem(this._storageKey) || 'null');
    }

    async set(value) {
        if (this._useUrlStorage)
            return;
        sessionStorage.removeItem(this._storageKey);
        localStorage.removeItem(this._storageKey);
        if (isNull(value))
            return;
        const {remember} = value;
        if (remember) {
            this._useLocalStorage = true;
            this._useSessionStorage = false;
        } else {
            this._useSessionStorage = true;
            this._useLocalStorage = false;
        }
        return (remember ? localStorage : sessionStorage).setItem(this._storageKey, JSON.stringify(value || null));
    }
}

const fullUrlRegExp = /^((http|ws)s?:)?\/\//;

function isFullUrl(url) {
    const str = isString(url) ? url : (url.base || '');
    return fullUrlRegExp.test(str);
}

function makeUrl(url, base) {
    const isFull = isFullUrl(url);
    if (isString(url))
        return isFull ? url : base + url;
    const {base: _base = '', pathname = '', query = {}, hash = ''} = url;
    let r = (isFull ? _base : base) + pathname;
    if (Object.keys(query).length > 0)
        r += '?' + param(query);
    if (hash)
        r += '#' + hash;
    return r;
}

module.exports = {
    ApiClient,
    MemoryStore,
    BrowserStore,
    isFullUrl,
    makeUrl,
    fullUrlRegExp,
    AUTHORIZED,
    UNAUTHORIZED,
    HAS_REQUESTS,
    HAS_HTTP_REQUESTS,
    HAS_NOT_REQUESTS,
    HAS_NOT_HTTP_REQUESTS,
};

require('isomorphic-fetch');
const createError = require('http-errors');
const {merge, isString} = require('lodash');
const retry = require('promise-retry');
const WebSocket = require('isomorphic-ws');
const param = require('jquery-param');
const Emittery = require('emittery');
const {TOKEN_KEY} = require('../server/ws');


class ApiClient extends Emittery {
    AUTHORIZED = 'AUTHORIZED';
    UNAUTHORIZED = 'UNAUTHORIZED';
    AUTH_PROCESS = 'AUTH_PROCESS';

    constructor(base, store, isAuthRequired = true) {
        super();
        const s = /^https:\/\//.test(base);
        const wsBase = base.replace(/^https?:\/\//, s ? 'wss://' : 'ws://');
        this._config = {base, store, isAuthRequired, wsBase};
        this._requestsCount = 0;
        this._wasRequests = false;
        this._authorized = false;
        resolve(false);
        this._authorizedCallbacks = [];
        this.on(this.AUTHORIZED, () => {
            this._authorized = true;
            this._authorizedCallbacks.forEach(fn => fn());
        });
    }

    get isAuthRequired() {
        return this._config.isAuthRequired;
    }

    authorized(timeout) {
        return new Promise((resolve => {
            if (this._authorized)
                return resolve(true);
            let t;
            const cb = (value = true) => {
                resolve(value);
                this._authorizedCallbacks.splice(this._authorizedCallbacks.indexOf(cb), 1);
                if (value)
                    clearTimeout(t);
            };
            this._authorizedCallbacks.push(cb);
            if (timeout)
                t = setTimeout(() => {
                    cb(false);
                }, timeout);
        }));
    }

    async _request(url, options) {
        const {base} = this._config;
        const res = await fetch(
            makeUrl(url, base),
            options,
        );
        let r;
        if (/^application\/json/.test(res.headers.get('Content-Type')))
            r = await res.json();
        if (!res.ok) {
            const error = createError(res.status, res.statusText);
            error.details = r;
            throw error;
        }
        return r;
    }

    async login(credentials, remember = true) {
        const isToken = isString(credentials);
        const r = await this._request('/login', {
            method: 'POST',
            headers: {
                'Content-Type': isToken ? 'text/plain' : 'application/json',
            },
            body: isToken ? credentials : JSON.stringify({...credentials, remember}),
        });
        const {store} = this._config;
        const obj = {...r, remember};
        await store.set(obj);
        this.emit(this.AUTHORIZED);
        return obj;
    }

    request(url, options, noAuth = false) {
        const {base, store, isAuthRequired} = this._config;

        return retry(async retry => {
            let {access, refresh, remember} = await store.get();
            if (!access) {
                if (isAuthRequired && !noAuth) {
                    if (!refresh)
                        throw createError(401);
                    try {
                        const r = await this.login(refresh, remember);
                        access = r.access;
                        refresh = r.refresh;
                        remember = r.remember;
                    } catch (e) {
                        throw createError(401);
                    }
                }
            }
        }, {
            retries: 3,
            minTimeout: 100,
            maxTimeout: 2000,
        });
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
    return  r;
}

class WsConnectionError extends Error {
    constructor(reason) {
        super();
        this.reason = reason;
    }
}

module.exports = function (options) {
    const s = /^https:\/\//.test(options.base);
    const {
        base,
        wsBase = base.replace(/^https?:\/\//, s ? 'wss://' : 'ws://'),
        initialState = {},
        authRequired = true,
        onLoggedIn,
        onUnauthorized,
        onHasRequest,
        onHasNotRequest,
    } = options;

    let activeCounter = 0;
    let state = {...initialState};
    if (onHasNotRequest)
        onHasNotRequest();
    let firstRequest = true;

    function request(url, options) {
        let u;
        if (isString(url))
            u = url;
        else {
            const {pathname, query} = url;
            u = pathname + '?' + param(query);
        }
        let triedToAuth = false;
        activeCounter++;
        if (onHasRequest)
            onHasRequest();
        const isLogin = u === '/login';
        return retry(async (retry) => {
            const {access, refresh} = state;
            if (!isLogin && !access && !refresh && authRequired)
                throw createError(401);
            const res = await fetch(
                base + u,
                !isLogin ? merge({
                    ...authRequired ? {
                        headers: {
                            'x-authorization': access,
                        }
                    } : {}
                }, options) : options,
            );
            let r;
            if (/^application\/json/.test(res.headers.get('Content-Type')))
                r = await res.json();
            if (!res.ok) {
                const error = createError(res.status, res.statusText);
                error.details = r;
                if (res.status === 401) {
                    delete state.access;
                    const {credentials, remember} = state;
                    if (triedToAuth || (!refresh && !credentials))
                        throw error;
                    await login(credentials || refresh, remember);
                    triedToAuth = true;
                }
                if (res.status >= 500 || res.status === 401)
                    return retry(error);
                throw error;
            }
            return r;
        }, {
            retries: 3,
            minTimeout: 100,
            maxTimeout: 2000,
        }).then(r => {
            if (firstRequest && !isLogin) {
                firstRequest = false;
                if (onLoggedIn)
                    onLoggedIn(state);
            }
            return r;
        }).catch(e => {
            if (e.statusCode === 401) {
                if (onUnauthorized)
                    onUnauthorized();
            }
            throw e;
        }).finally(() => {
            activeCounter--;
            if (activeCounter === 0 && onHasNotRequest)
                onHasNotRequest();
        });
    }

    function ws(url) {
        let u;
        if (isString(url))
            u = url;
        else {
            const {pathname, query} = url;
            u = pathname + '?' + param(query);
        }
        let triedToAuth = false;
        u = new URL(wsBase + u);
        return retry(async function (retry) {
            const {access, refresh} = state;
            if (!access && !refresh)
                throw new WsConnectionError(4001);
            u.searchParams.set(TOKEN_KEY, access);
            try {
                return await new Promise((resolve, reject) => {
                    const ws = new WebSocket(u.toString());
                    let opened = false;
                    ws.onopen = function () {
                        resolve(ws);
                        opened = true;
                    };
                    const initialTime = +new Date();
                    ws.onclose = function (evt) {
                        const now = +new Date();
                        if (!opened || (evt.reason === 1006 && now - initialTime <= 1000))
                            reject(new WsConnectionError(evt.reason));
                    };
                    ws.onerror = () => {
                    };
                });
            } catch (e) {
                if (triedToAuth)
                    throw e;
                delete state.access;
                const {credentials, remember, refresh} = state;
                await login(credentials || refresh, remember);
                triedToAuth = true;
                retry(e);
            }
        }, {
            retries: 2,
            minTimeout: 100,
            maxTimeout: 2000,
        });
    }

    async function login(credentials, remember = true) {
        const isToken = isString(credentials);
        const r = await request('/login', {
            method: 'POST',
            headers: {
                'Content-Type': isToken ? 'text/plain' : 'application/json',
            },
            body: isToken ? credentials : JSON.stringify({...credentials, remember}),
        });
        state = {...state, ...r, remember};
        if (onLoggedIn)
            onLoggedIn(state);
        return state;
    }

    async function logout(req = true) {
        if (req)
            await request('/logout', {
                method: 'POST',
            });
        delete state.access;
        delete state.refresh;
        delete state.remember;
        if (onUnauthorized)
            onUnauthorized();
    }

    async function logoutAll() {
        await request('/logout-all', {
            method: 'POST',
        });
        await logout(false);
    }

    function me() {
        return request('/me');
    }

    return {request, login, logout, me, logoutAll, ws};
};

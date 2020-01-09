require('isomorphic-fetch');
const createError = require('http-errors');
const {merge, isString} = require('lodash');
const retry = require('promise-retry');

module.exports = function (options) {
    const {
        base,
        initialState = {},
        onLoggedIn,
        onUnauthorized,
        onHasRequest,
        onHasNotRequest,
    } = options;

    let activeCounter = 0;
    let state = {...initialState};
    if(onHasNotRequest)
        onHasNotRequest();
    let firstRequest = true;

    function request(url, options) {
        let triedToAuth = false;
        activeCounter++;
        if (onHasRequest)
            onHasRequest();
        const isLogin = url === '/login';
        return retry(async (retry) => {
            const {access, refresh} = state;
            if (!isLogin && !access && !refresh)
                throw createError(401);
            const res = await fetch(
                base + url,
                !isLogin ? merge({
                    headers: {
                        'x-authorization': access,
                    }
                }, options): options,
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

    async function login(credentials, remember = true) {
        const isToken = isString(credentials);
        const r = await request('/login', {
            method: 'POST',
            headers: {
                'Content-Type': isToken ? 'text/plain': 'application/json',
            },
            body: isToken ? credentials: JSON.stringify({...credentials, remember}),
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

    return {request, login, logout, me, logoutAll};
};

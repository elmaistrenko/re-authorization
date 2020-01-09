import {useState, useEffect} from 'react';
import {isEqual} from 'lodash';
import createClient from '../client';
import eventTarget from "./eventTarget";

const u = new URL(window.location.href);
const access = u.searchParams.get('access');
let initialState = {};
const session = JSON.parse(sessionStorage.getItem('authorization') || 'null');
const local = JSON.parse(localStorage.getItem('authorization') || 'null');
if (access)
    initialState = {access};
else if (session)
    initialState = session;
else if (local)
    initialState = local;

let _user = null;
let userCallbacks = [];

export const {request, logout, login, me: rawMe, logoutAll} = createClient({
    initialState,
    base: process.env.REACT_APP_BASE,
    onLoggedIn: r => {
        if (!access)
            (r.remember ? localStorage : sessionStorage).setItem('authorization', JSON.stringify(r));
        eventTarget.dispatchEvent(new Event('loggedIn'));
    },
    onUnauthorized: () => {
        [localStorage, sessionStorage].forEach(i => i.removeItem('authorization'));
        eventTarget.dispatchEvent(new Event('unauthorized'));
        if (_user) {
            _user = null;
            userCallbacks.forEach(c => c(null));
        }
    },
    onHasRequest: () => {
        eventTarget.dispatchEvent(new Event('hasRequest'));
    },
    onHasNotRequest: () => {
        eventTarget.dispatchEvent(new Event('hasNotRequest'));
    },
});

export function me() {
    return rawMe().then(r => {
        if (!isEqual(r, _user)) {
            _user = r;
            userCallbacks.forEach(c => c(r));
        }
        return r;
    })
}

export function useUser() {
    const [user, setUser] = useState(null);
    useEffect(() => {
        setUser(_user);
        userCallbacks.push(setUser);
        return () => {
            userCallbacks.splice(userCallbacks.indexOf(setUser), 1);
        };
    }, []);
    return user;
}

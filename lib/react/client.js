import createClient from '../client';
import eventTarget from "./eventTarget";

const u = new URL(window.location.href);
const access = u.searchParams.get('access');
let initialState = {
    ...JSON.parse(localStorage.getItem('authorization') || '{}'),
    ...JSON.parse(sessionStorage.getItem('authorization') || '{}'),
};
if (access)
    initialState = {access};

export const {request, logout, login, me, logoutAll} = createClient({
    initialState,
    base: process.env.REACT_APP_BASE,
    onLoggedIn: (r) => {
        if (!access)
            (r.remember ? localStorage: sessionStorage).setItem('authorization', JSON.stringify(r));
        eventTarget.dispatchEvent(new Event('loggedIn'));
    },
    onUnauthorized: () => {
        if (!access)
            [localStorage, sessionStorage].forEach(i => i.removeItem('authorization'));
        eventTarget.dispatchEvent(new Event('unauthorized'));
    },
    onHasRequest: () => {
        eventTarget.dispatchEvent(new Event('hasRequest'));
    },
    onHasNotRequest: () => {
        eventTarget.dispatchEvent(new Event('hasNotRequest'));
    },
});

import {createHashHistory} from "history";
import eventTarget from "./eventTarget";
import {me} from './client';

const history = createHashHistory();
let unauthorizedPathname = '/';
eventTarget.addEventListener('unauthorized', function () {
    if (history.location.pathname !== '/login')
        unauthorizedPathname = history.location.pathname;
    history.replace('/login');
});

let previousPathname = history.location.pathname;
eventTarget.addEventListener('loggedIn', function () {
    if (unauthorizedPathname !== previousPathname)
        history.replace(unauthorizedPathname);
});

history.listen((location) => {
    if (location.pathname !== '/login' && previousPathname !== '/login')
        me().catch(() => {
        });
    previousPathname = history.location.pathname;
});
me().catch(() => {
});

export default history;

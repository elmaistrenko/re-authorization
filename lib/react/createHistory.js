import {createHashHistory} from "history";
import eventTarget from "./eventTarget";
import {me} from './client';

const LOGIN = '/login';
const ROOT = '/';

export default function(callback) {
    let loggedIn = false;
    const history = createHashHistory();
    let unauthorizedPathname = ROOT;
    eventTarget.addEventListener('unauthorized', function () {
        loggedIn = false;
        if (history.location.pathname !== LOGIN) {
            unauthorizedPathname = history.location.pathname;
            history.replace(LOGIN);
        } else
            unauthorizedPathname = ROOT;
    });

    eventTarget.addEventListener('loggedIn', function () {
        loggedIn = true;
        const {location: {pathname}} = history;
        if (pathname === unauthorizedPathname)
            return;
        history.replace(unauthorizedPathname);
    });

    function onLocationChange(location) {
        const {pathname} = location;
        if (pathname === LOGIN && loggedIn) {
            Promise.resolve().then(() => {
                history.replace(unauthorizedPathname);
            });
            return;
        }
        me().catch(e => {
            if (e.statusCode !== 401)
                callback(e);
        });
    }

    history.listen(onLocationChange);

    onLocationChange(history.location);

    return history;
}

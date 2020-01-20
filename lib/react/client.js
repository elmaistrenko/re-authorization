import React, {useEffect, useState, useContext, useRef} from "react";
import {isEqual, isNull} from "lodash";
import {useSnackbar} from "notistack";
import {AUTHORIZED, UNAUTHORIZED} from '../client';

let _user = null;
let userCallbacks = [];

export const ClientContext = React.createContext(null);

export function ClientProvider ({client, children}) {
    const {me} = client;
    const {enqueueSnackbar} = useSnackbar();
    client.watchLogout();

    client.me = function () {
        return me.apply(client).then(r => {
            if (!isEqual(r, _user)) {
                _user = r;
                userCallbacks.forEach(c => c(r));
            }
            return r;
        });
    };

    const processingReqUser = useRef(false);

    function reqUser() {
        if (processingReqUser.current)
            return;
        processingReqUser.current = true;
        client.me().catch(e => {
            if (e.statusCode !== 401)
                enqueueSnackbar(e.message, {
                    variant: 'error',
                    preventDuplicate: true,
                });
        }).finally(() => {
            processingReqUser.current = false;
        });
    }

    useEffect(reqUser, []);

    client.on(AUTHORIZED, reqUser);

    client.on(UNAUTHORIZED, () => {
        if (!isNull(_user)) {
            _user = null;
            userCallbacks.forEach(c => c(null));
        }
    });

    return <ClientContext.Provider value={client}>
        {children}
    </ClientContext.Provider>;
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

export function useClient() {
    return useContext(ClientContext);
}

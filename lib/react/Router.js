import React from "react";
import {useClient} from './client';
import {Router} from "react-router-dom";
import {useSnackbar} from 'notistack';
import {createHashHistory} from 'history';

export default function ({history=createHashHistory(), children}) {
    const client = useClient();
    const {enqueueSnackbar} = useSnackbar();
    history.listen(() => {
        client.me().catch(e => {
            if (e.statusCode !== 401)
                enqueueSnackbar(e.message, {
                    variant: 'error',
                    preventDuplicate: true,
                });
        });
    });
    return <Router history={history}>
        {children}
    </Router>;
}

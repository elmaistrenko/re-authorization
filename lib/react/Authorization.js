import React, {Fragment} from "react";
import {createHashHistory} from "history";
import CssBaseline from "@material-ui/core/CssBaseline";
import Router from "./Router";
import {ClientProvider} from "./client";
import {SnackbarProvider} from "notistack";
import LoginDialog from "./LoginDialog";
import {ApiClient, BrowserStore} from "../client";


export default function ({
                             history = createHashHistory(),
                             ClientConstructor = ApiClient,
                             clientConfig = {
                                 base: process.env.REACT_APP_BASE,
                                 store: new BrowserStore(),
                             },
                             loginDialog,
                             loginForm,
                             maxSnack = 3,
                             children,
                             authorizationTitle = 'Authorization',
                         }) {
    return <Fragment>
        <CssBaseline/>
        <SnackbarProvider maxSnack={maxSnack}>
            <ClientProvider client={new ClientConstructor(clientConfig)}>
                <Router history={history}>
                    {children}
                </Router>
                <LoginDialog component={loginDialog} loginForm={loginForm} authorizationTitle={authorizationTitle}/>
            </ClientProvider>
        </SnackbarProvider>
    </Fragment>
}

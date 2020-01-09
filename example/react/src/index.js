import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import {Router, Route} from "react-router-dom";
import Button from '@material-ui/core/Button';
import { SnackbarProvider, useSnackbar } from 'notistack';
import createHistory from "../../../lib/react/createHistory";
import LoginForm from "../../../lib/react/LoginForm";
import {logout, logoutAll, useUser} from "../../../lib/react/client";

let history;

function App() {
    const user = useUser() || {};
    const {enqueueSnackbar} = useSnackbar();
    function onError(e) {
        enqueueSnackbar(e.message, {
            variant: 'error',
            preventDuplicate: true,
        })
    }
    history = history || createHistory(onError);
    return <Fragment>
        <Router history={history}>
            {user.username}
            <Button onClick={logout}>Выйти</Button>
            <Button onClick={logoutAll}>Выйти со всех устройств</Button>
            <Route path="/login">
                <LoginForm/>
            </Route>
        </Router>
    </Fragment>
}

ReactDOM.render(<SnackbarProvider maxSnack={3}>
    <App/>
</SnackbarProvider>, document.getElementById('root'));

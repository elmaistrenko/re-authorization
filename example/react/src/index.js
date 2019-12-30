import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import {Router, Route} from "react-router-dom";
import Button from '@material-ui/core/Button';
import { SnackbarProvider } from 'notistack';
import history from "../../../lib/react/history";
import LoginForm from "../../../lib/react/LoginForm";
import {logout, logoutAll, useUser} from "../../../lib/react/client";

function App() {
    const user = useUser() || {};
    return <Fragment>
        <Router history={history}>
            <SnackbarProvider maxSnack={3}>
                {user.username}
                <Button onClick={logout}>Выйти</Button>
                <Button onClick={logoutAll}>Выйти со всех устройств</Button>
                <Route path="/login">
                    <LoginForm/>
                </Route>
            </SnackbarProvider>
        </Router>
    </Fragment>
}

ReactDOM.render(<App/>, document.getElementById('root'));

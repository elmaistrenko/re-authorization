import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import {Router, Route} from "react-router-dom";
import Button from '@material-ui/core/Button';
import history from "../../../lib/react/history";
import LoginForm from "../../../lib/react/LoginForm";
import {logout, logoutAll} from "../../../lib/react/client";

ReactDOM.render(<Fragment>
    <Router history={history}>
        <Button onClick={logout}>Выйти</Button>
        <Button onClick={logoutAll}>Выйти со всех устройств</Button>
        <Route path="/login">
            <LoginForm/>
        </Route>
    </Router>

</Fragment>, document.getElementById('root'));

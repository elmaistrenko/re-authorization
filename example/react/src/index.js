import React, {Fragment} from 'react';
import ReactDOM from 'react-dom';
import {createHashHistory} from 'history';
import Button from '@material-ui/core/Button';
import {useSnackbar} from 'notistack';
import {useUser} from "../../../lib/react/client";
import {useClient} from "../../../lib/react/client";
import Authorization from "../../../lib/react/Authorization";

function App() {
    const user = useUser() || {};
    const client = useClient();
    const {enqueueSnackbar} = useSnackbar();
    return <Fragment>
        {user.username}
        <Button onClick={() => client.logout().catch(e => enqueueSnackbar(e.message, {
            variant: 'error',
            preventDuplicate: true,
        }))}>Logout</Button>
        <Button onClick={() => client.logoutAll().catch(e => enqueueSnackbar(e.message, {
            variant: 'error',
            preventDuplicate: true,
        }))}>Logout all</Button>
    </Fragment>;
}

ReactDOM.render(<Authorization history={createHashHistory()}>
    <App/>
</Authorization>, document.getElementById('root'));

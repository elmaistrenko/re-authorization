import React, {useState, useEffect, useRef} from "react";
import {makeStyles} from '@material-ui/core/styles';
import {useSnackbar} from 'notistack';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import {useClient} from './client';


const useStyles = makeStyles(theme => ({
    field: {
        marginBottom: theme.spacing(2),
    },
    actions: {
        textAlign: 'center',
    },
}));

const initialState = {remember: true};

export default function ({component: Component}) {
    const classes = useStyles();
    const [state, setState] = useState({...initialState});
    const [disabled, setDisabled] = useState(false);
    const [errors, setErrors] = useState({});
    const {enqueueSnackbar} = useSnackbar();
    const unmounted = useRef(false);
    const client = useClient();

    useEffect(() => {
        return () => {
            unmounted.current = true;
        };
    }, []);

    function hasErrors(obj = errors) {
        return Object.values(obj).filter(Boolean).length > 0;
    }

    function handleChange(e) {
        if (e.target.type === 'checkbox') {
            setState({...state, [e.target.name]: e.target.checked});
        } else {
            const value = e.target.value.trim();
            setState({...state, [e.target.name]: value});
            setErrors({...errors, [e.target.name]: !value});
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (hasErrors())
            return;
        setDisabled(true);
        client.login({
            username: state.username,
            password: state.password,
        }, state.remember, true)
            .then(() => {
                if (!unmounted.current)
                    setState({...initialState});
            })
            .catch(e => enqueueSnackbar(e.message, {
                variant: 'error',
                preventDuplicate: true,
            }))
            .finally(() => {
                setTimeout(() => {
                    if (!unmounted.current)
                        setDisabled(false);
                }, 300);
            })
    }

    if (Component)
        return <Component
            {...{
                handleSubmit,
                handleChange,
                state,
                errors,
                disabled,
                hasErrors,
            }}
        />;
    return <form onSubmit={handleSubmit}>
        <TextField
            name="username"
            label="Имя пользователя"
            variant="outlined"
            className={classes.field}
            value={state.username || ''}
            onChange={handleChange}
            error={!!errors.username}
            autoFocus
            fullWidth
            required
            disabled={disabled}
        />
        <TextField
            name="password"
            label="Пароль"
            variant="outlined"
            className={classes.field}
            value={state.password || ''}
            onChange={handleChange}
            error={!!errors.password}
            type="password"
            fullWidth
            required
            disabled={disabled}
        />
        <FormControlLabel
            control={<Checkbox
                name="remember"
                color="primary"
                checked={state.remember}
                onChange={handleChange}
            />}
            className={classes.field}
            label="Запомнить"
            disabled={disabled}
        />
        <div className={classes.actions}>
            <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={disabled}
            >Войти</Button>
        </div>
    </form>
}

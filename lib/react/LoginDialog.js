import React, {useEffect, useRef} from "react";
import Dialog from '@material-ui/core/Dialog';
import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import {makeStyles} from "@material-ui/core/styles";
import {useUser} from './client';
import LoginForm from "./LoginForm";

const useStyles = makeStyles(theme => ({
    paper: {
        padding: theme.spacing(3),
    },
    container: {
        height: '100%',
        minHeight: 400,
    },
}));

export default function ({loginForm, component: Component, authorizationTitle}) {
    const classes = useStyles();
    const open = !useUser();
    const initialRender = useRef(true);
    const title = useRef(document.title);

    function changeTitle() {
        if (open) {
            if (document.title !== authorizationTitle) {
                title.current = document.title;
                document.title = authorizationTitle;
            }
        } else if (document.title !== title.current) {
            document.title = title.current;
        }
    }

    useEffect(changeTitle, [open]);
    useEffect(() => {
        setInterval(() => {
            if (open) {
                changeTitle();
            }
        }, 2000);
    }, []);

    return <Dialog
        fullScreen
        open={open}
        transitionDuration={initialRender.current ? 0 : 400}
        onRendered={() => initialRender.current = false}
    >
        {Component && <Component><LoginForm component={loginForm}/></Component>}
        {!Component && <Container className={classes.container}>
            <Grid container spacing={3} alignContent="center" justify="center" className={classes.container}>
                <Grid item xs={12} sm={8} md={4}>
                    <Paper className={classes.paper}>
                        <LoginForm component={loginForm}/>
                    </Paper>
                </Grid>
            </Grid>
        </Container>}
    </Dialog>
}

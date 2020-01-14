const createClient = require('../lib/client');

const {request, login, logout, me, ws} = createClient({
    base: 'http://localhost:3456',
    initialState: {
        refresh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVkZW50aWFscyI6eyJ1c2VybmFtZSI6ImEiLCJwYXNzd29yZCI6ImEiLCJyZW1lbWJlciI6dHJ1ZX0sInNlc3Npb25JZCI6IjVlMWUxYzU1NDMxZTdhMDg4OGE0OWY4NiIsInJlbWVtYmVyIjp0cnVlLCJpYXQiOjE1NzkwMzE2MzcsImV4cCI6MTg5NDM5MTYzN30.Lr_75fYhSM53HCk120lnKe9O9b0BCPoCyZSuvrq0rpU'
    }
});

ws('/cats').then(console.log, console.log);

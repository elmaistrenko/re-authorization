const createClient = require('../lib/client');

const {request, login, logout, me} = createClient({
    base: 'http://localhost:3000',
    initialState: {
        refresh: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVkZW50aWFscyI6eyJ1c2VybmFtZSI6InRlc3QiLCJwYXNzd29yZCI6IjEyMyIsInJlbWVtYmVyIjpmYWxzZX0sInNlc3Npb25JZCI6IjVlMDVjYWIyNjdhNWQ5NWQ3MGJiZDRhNSIsInJlbWVtYmVyIjpmYWxzZSwiaWF0IjoxNTc3NDM3ODc0LCJleHAiOjE1Nzc0NDE0NzR9.sKPaP7YaLWbar2t5pcL3AMF5Mgbn1GkEHp_BRNliVDU'
    }
});

me().then(console.log);

const {ApiClient, MemoryStore} = require('../lib/client');

const client = new ApiClient({
    base: 'http://localhost:3456',
    store: new MemoryStore({
        "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVkZW50aWFscyI6eyJ1c2VybmFtZSI6ImEiLCJwYXNzd29yZCI6ImEiLCJyZW1lbWJlciI6dHJ1ZX0sInNlc3Npb25JZCI6IjVlMjA1OTFkMjQ1NWMwNGM0YTlhN2IwMiIsInJlbWVtYmVyIjp0cnVlLCJpYXQiOjE1NzkxNzgyNjksImV4cCI6MTg5NDUzODI2OX0.YhqZ7GXKRW2yyHhOmA7FRBQy34S5_o99evlP0RBmuyE",
        "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImEiLCJzZXNzaW9uSWQiOiI1ZTIwNTkxZDI0NTVjMDRjNGE5YTdiMDIiLCJpYXQiOjE1NzkxNzgyNjksImV4cCI6MTU3OTE3OTE2OX0.yC5M7sNgWBCXJmrclVcfwQGAVdPa0M9PZANvUBD8QXQ"
    })
})

client.authorized().then(console.log)
client.request('/cats').then(console.log, console.log);


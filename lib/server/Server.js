const {Server: HttpServer} = require('http');
const {compose} = require('throwback');
const parseUrl = require('parseurl');

class Server extends HttpServer {
    constructor(props) {
        super(props);
        const {wss} = props;
        this._fns = [];
        this.on('upgrade', (req, socket, head) => {
            let handled = false;
            compose(this._fns)({wss, req, socket, head, handled}, function (ctx) {
                if (!ctx.handled)
                    socket.destroy();
            });
        })
    }

    useUpgrade(fn, pathname = '/', ...args) {
        this._fns.push(async function (ctx, next) {
            if (ctx.handled)
                return next();
            const parsed = parseUrl(ctx.req);
            if (pathname !== parsed.pathname)
                return next();
            await fn(...args);

            next();
        });
    }
};

(new Server({})).listen(3002)

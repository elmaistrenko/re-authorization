const verify = require('./util.verify');

module.exports = secret => function (req, res, next) {
    const token = req.get('x-authorization');
    req.user = verify(token, secret);
    next();
};

const SECRET_KEY_ERROR = 'secret or public key must be provided';

module.exports = function is400(e) {
    const {name, message} = e;
    return name === 'TokenExpiredError' || name === 'JsonWebTokenError' && message !== SECRET_KEY_ERROR;
};

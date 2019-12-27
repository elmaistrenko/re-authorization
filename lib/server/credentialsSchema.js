const Joi = require('@hapi/joi');

module.exports = Joi.alternatives().try(
    Joi.string().required(),
    Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
        remember: Joi.boolean().default(true),
    }).required().min(1),
);

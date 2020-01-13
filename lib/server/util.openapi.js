const {isPlainObject, set, omit} = require('lodash');
const {matches: [refresh, credentials]} = require('./credentialsSchema').describe();


function joi2oapi(joi, name, parent) {
    const r = {};
    const described = isPlainObject(joi) ? joi : joi.describe();
    const {type: joiType, keys = {}, flags: {description, presence, default: deft} = {}, allow, rules = []} = described;
    let type, rest = {}, format;
    if (['object', 'string', 'number', 'boolean', 'array'].includes(joiType))
        type = joiType;
    if (name && parent && presence === 'required') {
        if (!parent.required)
            parent.required = [];
        parent.required.push(name);
    }
    if (type === 'object') {
        const properties = {};
        Object.keys(keys).forEach(key => {
            properties[key] = joi2oapi(keys[key], key, r);
        });
        rest.properties = properties;
    }
    if (joiType === 'alternatives') {
        const {matches} = described;
        rest.anyOf = matches.map(i => joi2oapi(i.schema || i));
    }
    if (joiType === 'string') {
        rest.minLength = (rules.find(rule => rule.name === 'min') || {args: {}}).args.limit;
        rest.maxLength = (rules.find(rule => rule.name === 'max') || {args: {}}).args.limit;
        rest.pattern = (rules.find(rule => rule.name === 'pattern') || {args: {}}).args.regex;
    }
    if (joiType === 'number') {
        rest.minumum = (rules.find(rule => rule.name === 'min') || {args: {}}).args.limit;
        rest.maximum = (rules.find(rule => rule.name === 'max') || {args: {}}).args.limit;
        if (rules.find(rule => rule.name === 'integer'))
            rest.format = 'integer';
    }
    if (joiType === 'array') {
        rest.minItems = (rules.find(rule => rule.name === 'min') || {args: {}}).args.limit;
        rest.maxItems = (rules.find(rule => rule.name === 'max') || {args: {}}).args.limit;
        const {items} = described;
        if (items && items.length)
            rest.items = items.length > 1 ? {
                anyOf: items.map(i => joi2oapi(i)),
            } : joi2oapi(items[0]);
    }
    if (joiType === 'date') {
        type = 'string';
        format = 'date-time';
    }

    Object.assign(r, JSON.parse(JSON.stringify({
        type,
        description,
        enum: allow,
        default: deft,
        format,
        ...rest,
    })));

    return r;
}

function joi2params(schema, in_, keys) {
    const described = schema.describe();
    return Object.keys(described.keys)
        .filter(i => keys ? keys.includes(i) : true)
        .map(name => {
            const schema = joi2oapi(described.keys[name]);
            const presence = described.keys[name].presence;
            return {
                name,
                schema,
                in: in_,
                description: schema.description,
                required: presence === 'required',
            };
        });
}

const errors = (addAuth = true, add404 = false) => ({
    ...addAuth ? {
        400: {},
        401: {},
        403: {},
    } : {},
    ...add404 ? {
        404: {}
    } : {},
    '5XX': {},
});

const securitySchemes = {
    ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-authorization',
    },
};

const security = Object.keys(securitySchemes).map(key => ({[key]: []}));

function authPaths(base, tag) {
    const r = {};
    set(r, `${base}/login.post`, {
        tags: [tag],
        summary: `${base}/login`,
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: joi2oapi(credentials.schema),
                },
                'text/plain': {
                    schema: joi2oapi(refresh.schema),
                }
            },
        },
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                access: {
                                    type: 'string',
                                },
                                refresh: {
                                    type: 'string',
                                },
                                remember: {
                                    type: 'boolean',
                                },
                            },
                        },
                    },
                },
            },
            400: {},
            '5XX': {},
        },
    });
    set(r, `${base}/logout.post`, {
        tags: [tag],
        summary: `${base}/logout`,
        security,
        responses: {
            204: {},
            ...omit(errors(true), '403'),
        }
    });
    set(r, `${base}/logout-all.post`, {
        tags: [tag],
        summary: `${base}/logout-all`,
        security,
        responses: {
            204: {},
            ...omit(errors(true), '403'),
        }
    });
    set(r, `${base}/me.get`, {
        tags: [tag],
        summary: `${base}/me`,
        security,
        responses: {
            200: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                        },
                    },
                },
            },
            ...omit(errors(true), '403'),
        }
    });

    return r;
}

module.exports = {
    errors,
    joi2oapi,
    joi2params,
    securitySchemes,
    authPaths,
    security,
};

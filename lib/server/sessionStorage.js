const {ObjectId} = require('mongodb');

module.exports = function (getSessionCollWrapper) {
    async function add(username, ttl, lastIp) {
        const {insertOne} = await getSessionCollWrapper();
        const {insertedId} = await insertOne({
            username,
            ...ttl ? {
                expiredAt: new Date(+new Date() + ttl),
            } : {},
            checkedAt: new Date(),
            lastIp,
        });
        return insertedId.toHexString();
    }

    async function check(sessionId, username, lastIp, update = true) {
        const _id = new ObjectId(sessionId);
        const {findOne, updateOne} = await getSessionCollWrapper();
        const session = await findOne({
            _id,
            username,
            expiredAt: {
                $gt: new Date(),
            },
            isDeleted: {$ne: true},
        });
        if (session && update)
            await updateOne({_id}, {
                $set: {checkedAt: new Date(), lastIp},
            });
        return !!session;
    }

    async function remove(sessionId, username) {
        const _id = new ObjectId(sessionId);
        const {updateOne} = await getSessionCollWrapper();
        await updateOne({
            _id,
            username,
        }, {
            $set: {
                isDeleted: true,
            },
        });
    }

    async function removeAll(username) {
        const {updateMany} = await getSessionCollWrapper();
        await updateMany({
            username,
        }, {
            $set: {
                isDeleted: true,
            },
        });
    }

    return {add, check, remove, removeAll};
};

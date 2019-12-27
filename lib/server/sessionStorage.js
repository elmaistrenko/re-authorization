const {ObjectId} = require('mongodb');

module.exports = function (getSessionCollWrapper) {
    async function add(username, ttl) {
        const {insertOne} = await getSessionCollWrapper();
        const {insertedId} = await insertOne({
            username,
            ...ttl ? {
                expiredAt: new Date(+new Date() + ttl),
            } : {},
            checkedAt: new Date(),
        });
        return insertedId.toHexString();
    }

    async function check(sessionId, username) {
        const _id = new ObjectId(sessionId);
        const {findOne, updateOne} = await getSessionCollWrapper();
        const session = await findOne({
            _id,
            username,
            expiredAt: {
                $gt: new Date(),
            },
        });
        if (session)
            await updateOne({_id}, {
                $set: {checkedAt: new Date()},
            });
        return !!session;
    }

    async function remove(sessionId, username) {
        const _id = new ObjectId(sessionId);
        const {deleteOne} = await getSessionCollWrapper();
        await deleteOne({
            _id,
            username,
        });
    }

    async function removeAll(username) {
        const {deleteMany} = await getSessionCollWrapper();
        await deleteMany({
            username,
        });
    }

    return {add, check, remove, removeAll};
};

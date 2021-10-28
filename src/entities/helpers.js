'use strict';

const {Datastore} = require("@google-cloud/datastore");
const logger = require("../logger");
const datastore = new Datastore();
const transaction = datastore.transaction();


/**
 * Business logic wrapper around the transaction get-check-create flow.
 * Will only create an entity, if there isn't a key conflict.
 *
 * @param {object} data
 * @param {entity.Key} key
 * @return {Promise<{response: [google.datastore.v1.ICommitResponse], conflict: boolean}>}
 */
module.exports.createEntity = async ({data, key}) => {
    const entity = {
        key: key,
        data: data
    }
    try {
        let conflict = false;
        let response = null;
        const [entityResponse] = await datastore.get(key);
        if (entityResponse) {
            conflict = true;
        } else {
            response = await datastore.insert(entity);
        }
        return {
            conflict,
            response
        }
    } catch (e) {
        logger.error(`[${key.kind}/${key.name} Transaction Failure]`, entity.data);
        throw e;
    }
}


/**
 *
 * @param {object} data
 * @param {entity.Key} key
 * @return {Promise<[google.datastore.v1.ICommitResponse]>}
 */
module.exports.createOrUpdateEntity = async (data, key) => {
    const entity = {
        key: key,
        data: data
    }
    try {
        await transaction.run();
        const [entityResponse] = await transaction.get(key);
        if (entityResponse) {
            await transaction.update(entity);
        } else {
            await transaction.save(entity);
        }
        return await transaction.commit();
    } catch (e) {
        logger.error(`[${key.kind}/${key.name} Transaction Failure]`);
        await transaction.rollback();
        throw e;
    }
}
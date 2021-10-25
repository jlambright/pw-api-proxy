const {DateTime} = require("luxon");
const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();

const {createEntity} = require("./helpers");
const logger = require("../logger");
const _ = require("lodash");
const {entity} = require("@google-cloud/datastore/build/src/entity");


/**
 * @param {string|number|entity.Int|string} userID
 * @param {DateTime} timestamp
 * @param {string} matchUpID
 * @param {string} storyID
 * @param {string} roundID
 * @return {object}
 */
module.exports.voteEntityFactory = (matchUpID, roundID, storyID, timestamp, userID) => {
    const dateString = `${timestamp.month}-${timestamp.day}-${timestamp.year}`;
    const key = datastore.key(["Round", roundID, "MatchUp", matchUpID, "User", userID, "Vote", dateString]);

    const data = {
        userID,
        matchUpID,
        storyID,
        roundID,
        timestamp
    }

    return {
        /**
         *
         * @return {Promise<{response: google.datastore.v1.ICommitResponse[], conflict: boolean}>}
         */
        commit: async () => {
            try {
                return await createEntity({key: this.key, data: this.data});
            } catch (e) {
                logger.error(e);
            }
        },
        data,
        entityObject: undefined,
        /**
         *
         * @return {Promise<boolean>}
         */
        exists: async () => {
            try {
                if (!this.entityObject) {
                    const [entity] = await this.get();
                    this.entityObject = entity;
                }
                return !_.isUndefined(this.entityObject);
            } catch (e) {
                logger.error(e);
            }
        },
        /**
         *
         * @return {Promise<object>}
         */
        get: async () => {
            try {
                if (!this.entityObject) {
                    const [entity] = await datastore.get(this.key);
                    this.entityObject = entity;
                }
                return this.entityObject;
            } catch (e) {
                logger.error(e);
            }
        },
        key
    }
}
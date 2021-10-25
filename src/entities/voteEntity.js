const {DateTime} = require("luxon");
const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();

const {createEntity} = require("./helpers");
const logger = require("../logger");
const _ = require("lodash");
const {entity} = require("@google-cloud/datastore/build/src/entity");


/**
 * @param {string|number|entity.Int|string} userID
 * @param {Date} timestamp
 * @param {string} matchUpID
 * @param {string} storyID
 * @param {string} roundID
 * @return {object}
 */
const VoteEntity = (userID, matchUpID, storyID, timestamp, roundID) => {
    const date = DateTime.fromJSDate(timestamp).setZone("Americas/New_York");
    const dateString = `${date.month}-${date.day}-${date.year}`;
    const key = datastore.key(["User", userID, "Vote", dateString]);

    const data = {
        userID,
        matchUpID,
        storyID,
        date,
        roundID,
    }

    return {
        commit: async () => {
            try {
                const {conflict} = await createEntity(this.key, this.d);
                return conflict;
            } catch (e) {
                logger.error(e);
            }
        },
        data,
        entityObject: undefined,
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
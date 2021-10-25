'use strict';

const {DateTime} = require("luxon");
const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();

const {Singleton} = require("../common");
const {createEntity} = require("./helpers");
const logger = require("../logger");
const _ = require("lodash");
const {entity} = require("@google-cloud/datastore/build/src/entity");

module.exports.VoteEntity = class extends Singleton {

    /**
     * @param {string|number|entity.Int|string} userID
     * @param {DateTime} timestamp
     * @param {string} matchUpID
     * @param {string} storyID
     * @param {string} roundID
     */
    constructor(matchUpID, roundID, storyID, timestamp, userID) {
        super();
        this.data = {
            userID,
            matchUpID,
            storyID,
            roundID,
            timestamp
        };
        const dateString = `${timestamp.month}-${timestamp.day}-${timestamp.year}`;
        this.key = datastore.key(["Round", roundID, "MatchUp", matchUpID, "User", userID, "Vote", dateString]);
    }

    /**
     *
     * @return {Promise<{response: google.datastore.v1.ICommitResponse[], conflict: boolean}>}
     */
    commit = async () => {
        try {
            return await createEntity({key: this.key, data: this.data});
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     *
     * @return {Promise<boolean>}
     */
    exists = async () => {
        try {
            if (!this._instance) {
                const [entity] = await this.get();
                this._instance = entity;
            }
            return !_.isUndefined(this._instance) || !_.isNull(this._instance);
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     *
     * @return {Promise<object>}
     */
    get = async () => {
        try {
            if (!this._instance) {
                const [entity] = await datastore.get(this.key);
                this._instance = entity;
            }
            return this._instance;
        } catch (e) {
            logger.error(e);
        }
    }
}

/**
 *
 * @param {string} matchUpID
 * @param {string} roundID
 * @param {string} storyID
 * @return {Promise<number>}
 */
module.exports.calculateMatchUpVotes = async (matchUpID, roundID, storyID) => {
    try {
        const query = datastore
            .createQuery('Vote')
            .filter('roundID', '=', roundID)
            .filter('matchUpID', '=', matchUpID)
            .filter('storyID', '=', storyID)
            .order('priority', {
                descending: true,
            });
        const [votes] = await datastore.runQuery(query);
        return votes.length;
    } catch (e) {
        logger.error(e);
    }
}
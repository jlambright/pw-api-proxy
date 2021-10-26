'use strict';

const {DateTime} = require("luxon");
const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();

const {createEntity} = require("./helpers");
const logger = require("../logger");
const {entity} = require("@google-cloud/datastore/build/src/entity");

module.exports.VoteEntity = class {

    /**
     * @param {string|number|entity.Int|string} userID
     * @param {DateTime} timestamp
     * @param {string} matchUpID
     * @param {string} storyID
     * @param {string} roundID
     */
    constructor(matchUpID, roundID, storyID, timestamp, userID) {
        this.data = {
            date: timestamp.toLocaleString(DateTime.DATE_MED),
            matchUpID,
            roundID,
            storyID,
            timestamp: timestamp.toJSDate(),
            userID,
            votesFor: 0
        };
        this.key = datastore.key(["Round", roundID, "MatchUp", matchUpID, "User", userID, "Vote"]);
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
            const ancestorKey = datastore.key([
                "Round", this.data.roundID,
                "MatchUp", this.data.matchUpID,
                "User", this.data.userID]);

            const query = datastore
                .createQuery('Vote').hasAncestor(ancestorKey)
                .filter("date", "=", this.data.date)

            const [votes] = await datastore.runQuery(query);
            return (votes.length > 0);
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
            const [entity] = await datastore.get(this.key);
            return entity;
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
            .order('timestamp', {
                descending: true,
            });
        const [votes] = await datastore.runQuery(query);
        return votes.length;
    } catch (e) {
        logger.error(e);
    }
}
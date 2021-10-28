'use strict';

const {DateTime} = require("luxon");
const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();

const logger = require("../logger");
const {entity} = require("@google-cloud/datastore/build/src/entity");
const {BaseEntity} = require("./BaseEntity");
const uniqid = require("uniqid");

module.exports.VoteEntity = class extends BaseEntity {

    /**
     * @param {string|number|entity.Int|string} userID
     * @param {DateTime} timestamp
     * @param {string} matchUpID
     * @param {string} storyID
     * @param {string} roundID
     */
    constructor(matchUpID, roundID, storyID, timestamp, userID) {
        const ancestor = datastore.key(["User", userID]);
        const date = `${timestamp.month}_${timestamp.day}_${timestamp.year}`;
        const data = {
            date,
            matchUpID,
            roundID,
            storyID,
            timestamp: timestamp.toJSDate(),
            userID,
            votesFor: 0
        };
        const key = datastore.key(["User", userID, "Vote", `${date}_${uniqid()}`])
        super("Vote", data, {ancestor, key});
    }

    /**
     *
     * @return {Promise<boolean>}
     */
    exists = async () => {
        try {

            const query = datastore
                .createQuery(this.kind).hasAncestor(this.ancestor)
                .filter("date", "=", this.data.date)

            const [votes] = await datastore.runQuery(query);
            return (votes.length > 0);
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
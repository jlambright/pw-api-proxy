'use strict';

const {DateTime} = require("luxon");
const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();
const uniqid = require("uniqid");

const logger = require("../logger");
const {entity} = require("@google-cloud/datastore/build/src/entity");
const {BaseEntity} = require("./BaseEntity");
const RoundMap = require("../roundmap");
const {calculateVotesByStoryID} = require("./voteEntity");

module.exports.VoteEntity = class extends BaseEntity {

    /**
     * @param {string|number|entity.Int|string} userID
     * @param {DateTime} timestamp
     * @param {string} matchUpID
     * @param {string} storyID
     * @param {string} roundID
     */
    constructor(matchUpID, roundID, storyID, timestamp, userID) {
        const ancestor = ["User", userID];
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
        const key = ["Vote", `${date}_${uniqid()}`]
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
                .filter("date", "=", this.data.date).select("__key__");

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
module.exports.calculateVotesByStoryID = async (matchUpID, roundID, storyID) => {
    try {
        const query = datastore
            .createQuery('Vote')
            .filter('roundID', '=', roundID)
            .filter('matchUpID', '=', matchUpID)
            .filter('storyID', '=', storyID)
            .order('timestamp', {
                descending: true,
            }).select("__key__");
        const [votes] = await datastore.runQuery(query);
        return votes.length;
    } catch (e) {
        logger.error(e);
    }
}

/**
 *
 * @param {string} matchUpID
 * @param {string} roundID
 * @return {Promise<{aVoteCount: number, bVoteCount: number}>}
 */
module.exports.calculateVotesByMatchUpID = async (matchUpID, roundID) => {

    try {
        const roundMap = await RoundMap.build();
        const matchUp = roundMap.matchUps[matchUpID];
        const aStoryID = matchUp["a-story"];
        const bStoryID = matchUp["b-story"];

        const aVoteCount = await calculateVotesByStoryID(matchUpID, roundID, aStoryID);
        const bVoteCount = await calculateVotesByStoryID(matchUpID, roundID, bStoryID);

        return {
            aVoteCount,
            bVoteCount
        }

    } catch (e) {
        logger.error(e);
    }
}
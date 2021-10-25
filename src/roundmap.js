'use strict';

const {DateTime} = require("luxon");
const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();
const transaction = datastore.transaction();

const logger = require("./logger");

const activeStateKey = datastore.key(["State", "active"]);

let roundMapInstance; //Singletons y'all, well not really.

const isToday = (dateToCheck, today) => {

    return dateToCheck.hasSame(today, 'day') &&
        dateToCheck.hasSame(today, 'month') &&
        dateToCheck.hasSame(today, 'year');
}

const RoundMap = async () => {
    try {

        await transaction.run();
        const [stateObj] = await transaction.get(activeStateKey);

        // Determining if it is new day since last vote.
        const today = DateTime.now().setZone('America/New_York');
        const lastUpdateData = stateObj.hasOwnProperty("lastRoundUpdate") ? stateObj.lastRoundUpdate : today;
        let lastRoundUpdate = DateTime.fromJSDate(lastUpdateData).setZone('America/New_York');
        const newDayFlag = !isToday(lastRoundUpdate, today);

        if (!roundMapInstance) {
            let roundId;
            let matchups = {};
            let stories = {};

            Object.entries(stateObj.matchups).forEach((entry) => {
                const [key, value] = entry;

                if (!roundId) roundId = value["round-id"];

                const aStoryID = value["a-story"];
                const bStoryID = value["b-story"];
                const voters = value.voters
                const updatedOn = DateTime.fromJSDate(value["updated-on"]).setZone('America/New_York');
                matchups[key] = {
                    "a-story": aStoryID,
                    "b-story": bStoryID,
                    voters: voters,
                    "updated-on": updatedOn
                };

                stories[aStoryID] = {
                    matchID: key,
                    slot: "a"
                };
                stories[bStoryID] = {
                    matchID: key,
                    slot: "b"
                }
            });
            roundMapInstance = {
                lastRoundUpdate,
                matchups,
                newDayFlag,
                number: stateObj.number, // This is actually a UUID from Webflow, for the "number" field of the match-up.
                roundId,
                stories,
            };
        }

        return roundMapInstance;
    } catch (e) {
        logger.error("[RoundMap Creation Failure]");
        throw e;
    }
}

module.exports.build = async () => {
    try {
        return await RoundMap();
    } catch (err) {
        logger.error(JSON.stringify(err));
    }
}

/**
 * @param {number} matchUpId
 * @param {any[]} voterList
 * @param {Date} updatedOn
 * @return {Promise}
 */
module.exports.update = async (matchUpId, voterList, updatedOn) => {
    try {
        let updatedOnTz = DateTime.fromJSDate(updatedOn).setZone('America/New_York');
        await transaction.run();
        const [state] = await transaction.get(activeStateKey);
        if (state) {
            if (matchUpId in state.matchups) {
                state.matchups[matchUpId].voters = voterList;
                state.matchups[matchUpId]["updated-on"] = updatedOnTz.toJSDate();
                state.lastRoundUpdate = updatedOnTz.toJSDate();
                const entity = {
                    key: activeStateKey,
                    data: state
                }
                transaction.update(entity);
                await transaction.commit();
                roundMapInstance = await RoundMap(state);
            }
        } else {
            throw new Error("No active state entity was retrieved.");
        }
    } catch (e) {
        logger.error(`Update failed`);
        await transaction.rollback();
        throw e;
    }
}
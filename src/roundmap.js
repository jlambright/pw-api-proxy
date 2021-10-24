const { DateTime } = require("luxon");
const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();
const transaction = datastore.transaction();

const logger = require("./logger");
const {MatchUpCollection} = require("./webflowclient");

const activeStateKey = datastore.key(["State", "active"]);
// const activeStateQuery = datastore.createQuery("State").filter("__key__", activeStateKey);
const archiveStateKey = datastore.key(["State", "archive"]);
// const archiveStateQuery = datastore.createQuery("State").filter("__key__", archiveStateKey);

let roundMapInstance; //Singletons y'all.

const isToday = (dateToCheck, today) => {

    return dateToCheck.hasSame(today, 'day') &&
        dateToCheck.hasSame(today, 'month') &&
        dateToCheck.hasSame(today, 'year');
}

const createOrUpdateEntity = async (data, key) => {
    const entity = {
        key: key,
        data: data
    }
    try {
        await transaction.run();
        const [state] = await transaction.get(key);
        if (state) {
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

const RoundMap = async (stateObj) => {
    try {
        if (!roundMapInstance) {
            // Determining if it is new day since last vote.
            const today = DateTime.now().setZone('America/New_York');
            const lastUpdateData = stateObj.hasOwnProperty("lastRoundUpdate") ? stateObj.lastRoundUpdate : today;
            let lastRoundUpdate = DateTime.fromJSDate(lastUpdateData).setZone('America/New_York');
            const newDayFlag = !isToday(lastRoundUpdate, today);

            // Archive and reset each match-up's voter list in Datastore and Webflow if it is a new day.
            if (newDayFlag) {
                await createOrUpdateEntity(stateObj, archiveStateKey);
                lastRoundUpdate = today;
                for (const entry of Object.entries(stateObj.matchups)) {
                    let [matchUpID, matchUpData] = entry;
                    matchUpData.voters = [];
                    let fields = {
                        voters: matchUpData.voters.toString(),
                    }
                    const patchResponse = await MatchUpCollection.patchLiveItem(matchUpID, fields);
                    matchUpData["updated-on"] = patchResponse["updated-on"]
                    logger.debug(JSON.stringify(patchResponse));
                    stateObj.matchups[matchUpID] = matchUpData
                }
            }
            let matchups = {};
            let stories = {};

            Object.entries(stateObj.matchups).forEach((entry) => {
                const [key, value] = entry;
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
        await transaction.run();
        const [state] = await transaction.get(activeStateKey);
        return await RoundMap(state);
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
        } else throw new Error("No active state entity was retrieved.");
    } catch (e) {
        logger.error(`Update failed`);
        await transaction.rollback();
        throw e;
    }
}
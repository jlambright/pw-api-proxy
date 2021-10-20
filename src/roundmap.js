const { DateTime } = require("luxon");
const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();
const transaction = datastore.transaction();

const logger = require("./logger");

const activeStateKey = datastore.key(["State", "active"]);
const activeStateQuery = datastore.createQuery("State").filter("__key__", activeStateKey);
const archiveStateKey = datastore.key(["State", "archive"]);
// const archiveStateQuery = datastore.createQuery("State").filter("__key__", archiveStateKey);



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
        const today = DateTime.now().setZone('America/New_York');
        let lastRoundUpdate = DateTime.fromJSDate(stateObj.hasOwnProperty("lastRoundUpdate")
            ? stateObj.lastRoundUpdate
            : today).setZone('America/New_York');
        const newDayFlag = !isToday(lastRoundUpdate, today);

        if (newDayFlag) {
            await createOrUpdateEntity(stateObj, archiveStateKey);
        }
        let matchups = {};
        let stories = {};

        Object.entries(stateObj.matchups).forEach((entry) => {
            const [key, value] = entry;
            const aStoryID = value["a-story"];
            const bStoryID = value["b-story"];
            const updatedOn = DateTime.fromJSDate(value["updated-on"]).setZone('America/New_York');
            const matchNewDay = !isToday(updatedOn, today);
            const voters = (value.hasOwnProperty("voters") || !matchNewDay) ? value.voters : [];
            matchups[key] = {
                "a-story": aStoryID,
                "b-story": bStoryID,
                voters: voters,
                "updated-on": updatedOn,
                newDay: matchNewDay
            };

            stories[aStoryID] = {
                matchID: key,
                slot: "a"
            };
            stories[bStoryID] = {
                matchID: key,
                slot: "b"
            }

            if (lastRoundUpdate && lastRoundUpdate < updatedOn) {
                lastRoundUpdate = updatedOn;
            }
        });
        return {
            lastRoundUpdate,
            matchups,
            newDayFlag,
            stories,
        };
    } catch (e) {
        logger.error("[RoundMap Creation Failure]");
        throw e;
    }
}

/**
 * @return {RoundMap}
 */
module.exports.build = async () => {
    try {
        const activeStateQueryResponse = await datastore.runQuery(activeStateQuery);
        return await RoundMap(activeStateQueryResponse[0][0]);
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
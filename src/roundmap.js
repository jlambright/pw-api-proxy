const { DateTime } = require("luxon");
const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();
const transaction = datastore.transaction();

const logger = require("./logger");

const activeStateKey = datastore.key(["State", "active"]);
const activeStateQuery = datastore.createQuery("State").filter("__key__", activeStateKey);
const archiveStateKey = datastore.key(["State", "archive"]);
const archiveStateQuery = datastore.createQuery("State").filter("__key__", archiveStateKey);



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
        logger.error(`----${key.kind}${key.name} Transaction Failure----`);
        await transaction.rollback();
    }
}

const RoundMap = async (stateObj) => {
    try {
        const today = DateTime.now().setZone('America/New_York');
        const lastRoundUpdate = DateTime.fromJSDate(stateObj.hasOwnProperty("lastRoundUpdate")
            ? stateObj.lastRoundUpdate
            : today).setZone('America/New_York');

        const newDayFlag = !isToday(lastRoundUpdate, today);

        if (newDayFlag) {
            await createOrUpdateEntity(stateObj, archiveStateKey);
        }

        let roundMap = {
            lastRoundUpdate: lastRoundUpdate,
            matchups: {},
            newDay: newDayFlag,
            stories: {}
        }

        Object.entries(stateObj.matchups).forEach((entry) => {
            const [key, value] = entry;
            const aStoryID = value["a-story"];
            const bStoryID = value["b-story"];
            const updatedOn = value["updated-on"];
            const voters = (value.hasOwnProperty("voters") && newDayFlag) ? [] : value.voters;
            roundMap.matchups[key] = {
                "a-story": aStoryID,
                "b-story": bStoryID,
                voters: voters,
                "updated-on": updatedOn
            };

            roundMap.stories[aStoryID] = {
                matchID: key,
                slot: "a"
            };
            roundMap.stories[bStoryID] = {
                matchID: key,
                slot: "b"
            }

            if (roundMap.lastRoundUpdate) {
                roundMap.lastRoundUpdate =
                    roundMap.lastRoundUpdate < updatedOn ? updatedOn : roundMap.lastRoundUpdate;
            } else {
                roundMap.lastRoundUpdate = updatedOn;
            }
        });
        return roundMap;
    } catch (e) {
        logger.error("----RoundMap Creation Failure----");
    }
}

/**
 * @return {RoundMap}
 */
module.exports.build = () => datastore.runQuery(activeStateQuery)
  .then((response) => {
      return RoundMap(response[0][0]);
  }).catch(err => {
      logger.error(JSON.stringify(err));
    });

/**
 * @param {number} matchUpId
 * @param {Set<any>} voterList
 * @param {Date} updatedOn
 * @return {Promise}
 */
module.exports.update = async (matchUpId, voterList, updatedOn) => {
    try {
        await transaction.run();
        const [state] = await transaction.get(activeStateKey);
        if (state) {
            if (matchUpId in state.matchups) {
                state.matchups[matchUpId].voters = voterList;
                state.matchups[matchUpId]["updated-on"] = updatedOn;
                state.lastRoundUpdate = updatedOn;
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

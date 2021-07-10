const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();
const transaction = datastore.transaction();

const logger = require("./logger");

const activeStateKey = datastore.key(["State", "active"]);
const activeStateQuery = datastore.createQuery("State").filter("__key__", activeStateKey);
const archiveStateKey = datastore.key(["State", "archive"]);
const archiveStateQuery = datastore.createQuery("State").filter("__key__", archiveStateKey);



const isNewDay = (today, update) => {
    const todayInt = today.getUTCDay() + 1;
    const updateInt = update.getUTCDay() + 1;

    if (todayInt != updateInt) {
        if (todayInt > updateInt) {
            return true;
        } else if (today > update) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

const createOrUpdateEntity = async (data, key) => {
    const entity = {
        key: key,
        data: data
    }
    try {
        await transaction.run(async (err) => {
            const [state] = await transaction.get(key);
            if (state) {
                await transaction.update(entity);
            } else {
                await transaction.save(entity);
            }
            await transaction.commit();
        });
    } catch (e) {
        logger.error("----Datastore Transaction Failure----");
        await transaction.rollback();
    }
}

const RoundMap = async (stateObj) => {
    try {
        const today = new Date();
        const lastRoundUpdate = stateObj.hasOwnProperty("lastRoundUpdate")
            ? stateObj.lastRoundUpdate
            : today;

        const newDayFlag = isNewDay(today, lastRoundUpdate);

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
  });

/**
 * @param {number} matchUpId
 * @param {Set<any>} voterList
 * @param {Date} updatedOn
 * @return {Promise}
 */
module.exports.update = async (matchUpId, voterList, updatedOn) => {

    return transaction.run((err, transaction) => {
        return transaction.get(activeStateKey, (err, state) => {
            if (matchUpId in state.matchups) {
                state.matchups[matchUpId].voters = voterList;
                state.matchups[matchUpId]["updated-on"] = updatedOn;
                state.lastRoundUpdate = updatedOn;
                const entity = {
                    key: activeStateKey,
                    data: state
                }
                transaction.update(entity);
                transaction.commit((err, apiResponse) => {
                   if (err) {
                       logger.error(`Update failed:\n ${apiResponse}`);
                   } else {
                       logger.info(`Matchup ${matchUpId} updated.`)
                       return apiResponse;
                   }
                });
            }
        })
    })


}

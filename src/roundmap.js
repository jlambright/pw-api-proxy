const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();
const transaction = datastore.transaction();

const logger = require("./logger");

const key = datastore.key(["Active", "state"]);
const stateQuery = datastore.createQuery("Active").filter("__key__", key);

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

const RoundMap = (response) => {
    const today = new Date();
    const lastRoundUpdate = response.hasOwnProperty("lastRoundUpdate")
        ? response.lastRoundUpdate
        : today;


    let roundMap = {
        lastRoundUpdate: lastRoundUpdate,
        matchups: {},
        newDay: isNewDay(today, lastRoundUpdate),
        stories: {}
    }

    Object.entries(response.matchups).forEach((entry) => {
        const [key, value] = entry;
        const aStoryID = value["a-story"];
        const bStoryID = value["b-story"];
        const updatedOn = value["updated-on"];
        const voters = (value.hasOwnProperty("voters") && isNewDay(today, updatedOn)) ?  [] : value.voters;
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
}

/**
 * @return {RoundMap}
 */
module.exports.build = () => datastore.runQuery(stateQuery)
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
        return transaction.get(key, (err, response) => {

            let state = response[0][0];
            if (matchUpId in state.matchups) {
                state.matchups[matchUpId].voters = voterList;
                state.matchups[matchUpId]["updated-on"] = updatedOn;
                state.lastRoundUpdate = updatedOn;
                const entity = {
                    key: key,
                    data: state,
                };
                transaction.save(entity);
                return transaction.commit((err) => {
                    if (!err) {
                        logger.info("Data saved successfully.");
                    } else {
                        logger.error(err);
                    }
                });
                //What is going on here????
            }
        })
    });
}

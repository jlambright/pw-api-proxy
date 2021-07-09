const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();

const logger = require("./logger");

const key = datastore.key(["Active", "state"]);
const stateQuery = datastore.createQuery("Active").filter("__key__", key);

const isNewDay = (today, update) => {
    const todayInt = today.getUTCDay() + 1;
    const updateInt = update.getUTCDay() + 1;

    if (todayInt != updateInt) {
        return today > update;
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
        const voters = (value.hasOwnProperty("voters") && !isNewDay(today, lastRoundUpdate)) ? value.voters : [];
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
 * @param {[string]} voterList
 * @param {Date} updatedOn
 * @return {Promise}
 */
module.exports.update = (matchUpId, voterList, updatedOn) => {
    return datastore.runQuery(stateQuery)
        .then((response) => {
            let state = response[0][0];
            if ( matchUpId in state.matchups ) {
                state.matchups[matchUpId].voters = voterList;
                state.matchups[matchUpId]["updated-on"] = updatedOn;
                state.lastRoundUpdate = updatedOn;
                const entity = {
                    key: key,
                    data: state,
                };
                return datastore.save(entity, (err) => {
                    if (err !== null) {
                        logger.error(err);
                    }
                });
            }
        });
}

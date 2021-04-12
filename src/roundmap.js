const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();

const logger = require("./logger");

const key = datastore.key(["Active", "state"]);
const stateQuery = datastore.createQuery("Active").filter("__key__", key);

const RoundMap = (response) => {
    const today = new Date();
    const lastRoundUpdate = response.hasOwnProperty("lastRoundUpdate")
        ? response.lastRoundUpdate
        : new Date();

    const sameDay = today.getDay() === lastRoundUpdate.getDay();

    let roundMap = {
        lastRoundUpdate: lastRoundUpdate,
        matchups: {},
        sameDay: sameDay,
        stories: {},
    }

    Object.entries(response.matchups).forEach((entry) => {
        const [key, value] = entry;
        const aStoryID = value["a-story"];
        const bStoryID = value["b-story"];
        const updatedOn = value["updated-on"];
        const voters = (value.hasOwnProperty("voters") && sameDay) ? value.voters : [];
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

module.exports.build = () => datastore.runQuery(stateQuery)
  .then((response) => {
    return RoundMap(response[0][0]);
  });

/**
 * @param {number} matchUpId
 * @param {string} uid
 * @param {Date} updatedOn
 * @return {Promise}
 */
module.exports.update = (matchUpId, uid, updatedOn) => {
    return datastore.runQuery(stateQuery)
        .then((response) => {
            let state = response[0][0];
            if ( matchUpId in state.matchups ) {
                state.matchups[matchUpId].voters.push(uid);
                state.matchups[matchUpId].lastUpdate = updatedOn;
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

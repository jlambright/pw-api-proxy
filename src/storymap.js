const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();

const logger = require("./logger");

const key = datastore.key(["Active", "state"]);
const stateQuery = datastore.createQuery("Active").filter("__key__", key);

class RoundMap {
    matchups = {};
    stories = {}

    constructor(matchupArray) {
        try {
            matchupArray.forEach((matchupObj) => {
                const voters = matchupObj.hasOwnProperty("voters")? matchupObj.voters : [];
                const storyArray = [matchupObj["a-story"], matchupObj["b-story"]];
                this.matchups[matchupObj.id] = {
                    voters: voters,
                };
                this.matchups[matchupObj.id][matchupObj["a-story"]] = "a";
                this.matchups[matchupObj.id][matchupObj["b-story"]] = "b";

                storyArray.forEach(storyID => {
                    this.stories[storyID] = {
                        matchID: matchupObj.id,
                        slot: this.matchups[matchupObj.id][storyID],
                        voters: this.matchups[matchupObj.id].voters
                    }
                });
            });
        } catch (e) {
            logger.error(e);
        }
    }
}

module.exports.buildRoundMap = () => datastore.runQuery(stateQuery)
  .then((response) => {
    return new RoundMap(response[0][0].matchups);
  });

module.exports.updateRoundMap = (roundMap) => {

    return datastore.runQuery(stateQuery)
        .then((response) => {
            let state = response[0][0];
            state.matchups = Object.entries(roundMap.matchups).map(([key, value], index) => {
                return {
                    id: key,
                    "a-story": value.a,
                    "b-story": value.b,
                    voters: value.voters
                }
            })
            const entity = {
                key: key,
                data: state,
            };

            return datastore.save(entity, (err) => {
                if (err !== null) {
                    logger.error(key.path);
                    logger.error(key.namespace);
                }
            });
        });
};

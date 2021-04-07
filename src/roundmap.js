const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();

const logger = require("./logger");

const key = datastore.key(["Active", "state"]);
const stateQuery = datastore.createQuery("Active").filter("__key__", key);

const RoundMap = (matchupArray) => {
    let matchups = {};
    let stories = {};

    Object.entries(matchupArray).forEach((entry) => {
        const [key, value] = entry;
        const aStoryID = value["a-story"];
        const bStoryID = value["b-story"];
        const voters = value.hasOwnProperty("voters") ? value.voters : [];
        matchups[key] = {
            "a-story": aStoryID,
            "b-story": bStoryID,
            voters: voters,
        };
        stories[aStoryID] = {
            matchID: key,
            slot: this.matchups[key][value["a-story"]]
        };
        stories[bStoryID] = {
            matchID: key,
            slot: this.matchups[key][value["b-story"]]
        }
    });

    return {matchups, stories};
}

module.exports.build = () => datastore.runQuery(stateQuery)
  .then((response) => {
    return new RoundMap(response[0][0].matchups);
  });

module.exports.update = (matchUpId, uid) => datastore.runQuery(stateQuery)
        .then((response) => {
            let state = response[0][0];
            state.round.matchups[matchUpId].voters.push(uid);
            const entity = {
                key: key,
                data: state,
            };

            return datastore.save(entity, (err) => {
                if (err !== null) {
                    logger.error(err);
                }
            });
        });
const { Datastore } = require("@google-cloud/datastore");
const datastore = new Datastore();

const logger = require("./logger");

const key = datastore.key(["Active", "state"]);
const stateQuery = datastore.createQuery("Active").filter("__key__", key);

class RoundMap {
    matchups = {};
    stories = {}

    constructor(stateObj) {
        const matchupObjArray = stateObj.matchups;
        matchupObjArray.forEach((matchupObj) => {
            const storyArray = [matchupObj["a-story"], matchupObj["b-story"]];
            this.matchups[matchupObj.id] = {};
            this.matchups[matchupObj.id][matchupObj["a-story"]] = "a";
            this.matchups[matchupObj.id][matchupObj["b-story"]] = "b";

            storyArray.forEach(storyID => {
                this.stories[storyID] = {
                    matchUp: matchupObj.id,
                    slot: this.matchups[matchupObj.id][storyID]
                }
            });
        });
    }
}

module.exports.buildRoundMap = () => datastore.runQuery(stateQuery)
  .then((response) => {
    return new RoundMap(response[0][0]);
  });

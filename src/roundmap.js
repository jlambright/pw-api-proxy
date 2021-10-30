const {DateTime} = require("luxon");
const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();
const transaction = datastore.transaction();

const cache = require("./cache");

const logger = require("./logger");
const {asyncRetry} = require("./common");
const {MatchupsCollection} = require("./webflowclient");


/**
 *
 * @return {Promise<{matchUps: {}, number, stories: {}, lastRoundUpdate: DateTime, roundID}>}
 * @constructor
 */
const RoundMap = async () => {
    try {
        let roundMap = await cache.get("roundMap");

        if (!roundMap) {
            const activeStateKey = datastore.key(["State", "active"]);
            await transaction.run();
            const [stateObj] = await transaction.get(activeStateKey);

            const today = DateTime.now().setZone('America/New_York');
            const lastUpdateData = stateObj.hasOwnProperty("lastRoundUpdate") ? stateObj.lastRoundUpdate : today;
            let lastRoundUpdate = DateTime.fromJSDate(lastUpdateData).setZone('America/New_York');

            let matchUps = {};
            let roundID;
            let stories = {};

            for (const entry of Object.entries(stateObj.matchups)) {
                const [key, value] = entry;

                if (!roundID) {
                    roundID = (await MatchupsCollection.item(key))["round-id"];
                }

                const aStoryID = value["a-story"];
                const bStoryID = value["b-story"];
                const updatedOn = DateTime.fromJSDate(value["updated-on"]).setZone('America/New_York');
                matchUps[key] = {
                    "a-story": aStoryID,
                    "b-story": bStoryID,
                    "updated-on": updatedOn
                };

                stories[aStoryID] = {
                    matchUpID: key,
                    slot: "a"
                };
                stories[bStoryID] = {
                    matchUpID: key,
                    slot: "b"
                }
            }
            roundMap = {
                lastRoundUpdate,
                matchUps,
                number: stateObj.number, // This is actually a UUID from Webflow, for the "number" field of the match-up.
                roundID,
                stories,
            };
            cache.set("roundMap", roundMap);
        }

        return roundMap;
    } catch (e) {
        logger.error("[RoundMap Creation Failure]");
        throw e;
    }
}

module.exports.build = async () => {
    try {
        return await asyncRetry(1, RoundMap);
    } catch (err) {
        logger.error(JSON.stringify(err));
    }
}
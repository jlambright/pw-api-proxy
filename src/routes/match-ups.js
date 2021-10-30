'use strict';

const logger = require("../logger");
const {MatchupsCollection} = require("../webflowclient");
const RoundMap = require("../roundmap");

const {calculateVotesByMatchUpID} = require("../entities/voteEntity");

/**
 *
 * @param req
 * @param res
 * @param next
 * @return {Promise<*>}
 */
module.exports.voteCount = async (req, res, next) => {
    res.contentType = "json";
    try {
        const matchUpID = req.params.id;
        const matchUpObj = MatchupsCollection.item(matchUpID);
        const roundMap = await RoundMap.build();
        const {slot} = roundMap.stories[matchUpID];

        const data = await calculateVotesByMatchUpID(matchUpID, roundMap.id);
        let fields = {};
        fields[`${slot}-votes`] = data[slot];


        await MatchupsCollection.patchLiveItem(matchUpID, {
            fields: fields
        });
        return res.send(200, {
            data
        })

    } catch (reason) {
        if (reason !== null) logger.error(reason);
    }
}
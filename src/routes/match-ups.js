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
        const roundMap = await RoundMap.build();

        const {aVoteCount, bVoteCount} = await calculateVotesByMatchUpID(matchUpID, roundMap.id);
        let fields = {
            "a-slot": aVoteCount,
            "b-slot": bVoteCount
        };


        await MatchupsCollection.patchLiveItem(matchUpID, {
            fields: fields
        });
        return res.send(200, {
            aVoteCount,
            bVoteCount
        })

    } catch (reason) {
        if (reason !== null) logger.error(reason);
    }
}
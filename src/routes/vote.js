const {DateTime} = require("luxon");

const {getUidFromAuthHeader} = require("./helpers");
const logger = require("../logger");
const {MatchupsCollection} = require("../webflowclient");
const RoundMap = require("../roundmap");

const {voteEntityFactory} = require("../entities/voteEntity");

let voteEntity;

const getVoteEntityParamsFromRoundMap = (storyID, roundMap) => {
    const roundID = roundMap.roundId;
    const matchUpID = roundMap.stories[storyID].matchID;

    return {
        matchUpID,
        roundID,

    }
}

module.exports.voteCheck = async (req, res, next) => {
    try {
        let storyInRound;
        const roundMap = await RoundMap.build();
        const storyID = req.params.id;

        if (storyID in roundMap.stories) {
            storyInRound = true;
            const userID = await getUidFromAuthHeader(req.header('Authorization'));
            const timestamp = DateTime.now().setZone("Americas/New_York");
            const {matchUpID, roundID} = getVoteEntityParamsFromRoundMap(storyID, roundMap);
            voteEntity = voteEntityFactory(matchUpID, roundID, storyID, timestamp, userID);
        } else {
            storyInRound = false;
        }

        return res.send({
            data: {
                hasVoted: await voteEntity.exists(),
                inRound: storyInRound,
            }
        })

    } catch (reason) {
        if (reason !== null) logger.error(reason);
    }
}

module.exports.castVote = async (req, res, next) => {
    try {
        const storyID = req.params.id;
        const roundMap = await RoundMap.build();
        const userID = await getUidFromAuthHeader(req.header('Authorization'));

        if (storyID in roundMap.stories) {
            const {matchUpID, roundID} = getVoteEntityParamsFromRoundMap(storyID, roundMap);
            const slot = roundMap.stories[storyID].slot;
            if (!voteEntity || voteEntity.data.userID !== userID) {
                const timestamp = DateTime.now().setZone("Americas/New_York");
                voteEntity = voteEntityFactory(matchUpID, roundID, storyID, timestamp, userID);
            }
            await voteEntity.commit();
            const wfMatchUp = await MatchupsCollection.item(voteEntity.data.matchUpID);

            let fields = {}
            fields[`${slot}-votes`] = ++wfMatchUp[`${slot}-votes`]

            const wfPatchResponse = await MatchupsCollection.patchLiveItem(wfMatchUp._id, {
                fields: fields
            });

            logger.debug(JSON.stringify(wfPatchResponse));
            return res.send({
                data: {
                    success: true,
                    message: "vote successful",
                    roundID,
                    matchUpID,
                    storyID,
                    voteCount: fields[`${slot}-votes`]
                }
            });
        } else {
            return res.send({
                data: {
                    success: false,
                    message: "Story is not in an active round."
                }
            });
        }
    } catch (reason) {
        if (reason !== null) logger.error(reason);
    }
}
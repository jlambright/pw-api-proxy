'use strict';

const {DateTime} = require("luxon");

const {getUidFromAuthHeader} = require("./helpers");
const logger = require("../logger");
const {MatchupsCollection} = require("../webflowclient");
const RoundMap = require("../roundmap");

const {VoteEntity, calculateMatchUpVotes} = require("../entities/voteEntity");

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
        let hasVoted, inRound;
        const roundMap = await RoundMap.build();
        const storyID = req.params.id;

        if (storyID in roundMap.stories) {
            inRound = true;
            const userID = await getUidFromAuthHeader(req.header('Authorization'));
            const timestamp = DateTime.now().setZone("Americas/New_York");
            const {matchUpID, roundID} = getVoteEntityParamsFromRoundMap(storyID, roundMap);
            const voteEntity = new VoteEntity(matchUpID, roundID, storyID, timestamp, userID);
            hasVoted = await voteEntity.exists();
        } else {
            hasVoted = false;
            inRound = false;
        }

        return res.send({
            data: {
                hasVoted,
                inRound,
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
            const voteEntity = new VoteEntity(matchUpID, roundID, storyID, timestamp, userID);
            ;
            const slot = roundMap.stories[storyID].slot;
            let wfMatchUp = await MatchupsCollection.item(voteEntity.data.matchUpID);
            let votes = ++wfMatchUp[`${slot}-votes`]
            voteEntity.data.votesFor = votes
            await voteEntity.commit();
            const dsVoteCount = await calculateMatchUpVotes(matchUpID, roundID, storyID);
            wfMatchUp = await MatchupsCollection.item(voteEntity.data.matchUpID);
            const wfVotes = wfMatchUp[`${slot}-votes`];

            votes = wfVotes >= votes ? wfVotes + 1 : votes;

            let fields = {}
            // If the calculated vote count from Datastore is greater than WebFlow, use it instead.
            fields[`${slot}-votes`] = votes >= dsVoteCount ? votes : dsVoteCount;

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
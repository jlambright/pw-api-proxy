'use strict';

const {DateTime} = require("luxon");

const {getUidFromAuthHeader} = require("./helpers");
const logger = require("../logger");
const {MatchupsCollection} = require("../webflowclient");
const RoundMap = require("../roundmap");

const {VoteEntity, calculateMatchUpVotes} = require("../entities/voteEntity");

module.exports.voteCheck = async (req, res, next) => {
    try {
        let hasVoted, inRound;
        const {stories, roundID} = await RoundMap.build();
        const storyID = req.params.id;

        if (storyID in stories) {
            inRound = true;
            const userID = await getUidFromAuthHeader(req.header('Authorization'));
            const timestamp = DateTime.now().setZone("Americas/New_York");
            const {matchUpID} = stories[storyID];
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
            const {stories, roundID} = roundMap;
            const {matchUpID, slot} = stories[storyID];
            const timestamp = DateTime.now().setZone("Americas/New_York");

            const voteEntity = new VoteEntity(matchUpID, roundID, storyID, timestamp, userID);

            let wfMatchUp = await MatchupsCollection.item(matchUpID);
            let votesCheckOne = ++wfMatchUp[`${slot}-votes`]
            voteEntity.data.votesFor = votesCheckOne
            await voteEntity.commit();

            const dsVoteCount = await calculateMatchUpVotes(matchUpID, roundID, storyID);

            wfMatchUp = await MatchupsCollection.item(voteEntity.data.matchUpID);
            const votesCheckTwo = wfMatchUp[`${slot}-votes`];

            // Check for votes that occurred during processing.
            const wfVotes = votesCheckTwo >= votesCheckOne ? votesCheckTwo + 1 : votesCheckOne;
            // Go with the greater between the last Datastore record vote total and WebFlow.
            const finalVotes = wfVotes >= dsVoteCount ? wfVotes : dsVoteCount;

            let fields = {}
            fields[`${slot}-votes`] = finalVotes;

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
'use strict';

const {DateTime} = require("luxon");

const {getUidFromAuthHeader} = require("./helpers");
const logger = require("../logger");
const {MatchUpsCollection} = require("../webflowclient");
const RoundMap = require("../roundmap");

const {VoteEntity, calculateVotesByStoryID} = require("../entities/voteEntity");
const {asyncRetry} = require("../common");

module.exports.voteCheck = async (req, res, next) => {
    res.contentType = "json";
    try {
        let hasVoted, inRound;
        const roundMap = await RoundMap.build();
        const {stories, roundID} = roundMap;
        const storyID = req.params.id;

        if (storyID in stories) {
            inRound = true;
            const userID = await getUidFromAuthHeader(req.header('Authorization'));
            const timestamp = DateTime.now().setZone("America/New_York");
            const {matchUpID} = stories[storyID];
            const voteEntity = new VoteEntity(matchUpID, roundID, storyID, timestamp, userID);
            hasVoted = await voteEntity.exists();
        } else {
            hasVoted = false;
            inRound = false;
        }

        return res.send(200, {
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
    res.contentType = "json";
    try {
        const {time} = req;
        const timestamp = DateTime.fromMillis(time).setZone("America/New_York");
        const {matchUpID, storyID} = req.params;
        const roundMap = await RoundMap.build();
        const {stories, roundID} = roundMap;
        const userID = await getUidFromAuthHeader(req.header('Authorization'));

        if (storyID in stories) {
            const {slot} = stories[storyID];

            const voteEntity = new VoteEntity(matchUpID, roundID, storyID, timestamp, userID);

            if (!await voteEntity.exists()) {
                let wfMatchUp = await MatchUpsCollection.item(matchUpID);
                let votesCheckOne = wfMatchUp[`${slot}-votes`]
                voteEntity.data.votesFor = votesCheckOne

                const dsCommitResults = await asyncRetry(2, voteEntity.commit);

                if (!dsCommitResults.conflict && dsCommitResults.response) {
                    const dsVoteCount = await calculateVotesByStoryID(matchUpID, roundID, storyID);

                    wfMatchUp = await MatchUpsCollection.item(voteEntity.data.matchUpID);
                    const votesCheckTwo = wfMatchUp[`${slot}-votes`];

                    // Check for votes that occurred during processing.
                    let wfVotes = votesCheckTwo > votesCheckOne ? votesCheckTwo : votesCheckOne;

                    // Go with the greater between the last Datastore record vote total and WebFlow.
                    let finalVotes = wfVotes >= dsVoteCount ? wfVotes : dsVoteCount;
                    ++finalVotes

                    let fields = {}
                    fields[`${slot}-votes`] = finalVotes;

                    const wfPatchResponse = await MatchUpsCollection.patchLiveItem(wfMatchUp._id, {
                        fields: fields
                    });

                    logger.debug(JSON.stringify(wfPatchResponse));
                    return res.send(200, {
                        data: {
                            success: true,
                            message: "Vote successful",
                            roundID,
                            matchUpID,
                            storyID,
                            voteCount: fields[`${slot}-votes`]
                        }
                    });
                } else {
                    return res.send(409, {
                        data: {
                            success: false,
                            message: "Vote conflict detected",
                            roundID,
                            matchUpID,
                            storyID,
                            voteCount: votesCheckOne
                        }
                    });
                }
            } else {
                return res.send(400, {
                    data: {
                        success: false,
                        message: "You've already voted for this story today.",
                        roundID,
                        matchUpID,
                        storyID,
                    }
                });
            }
        } else {
            return res.send(400, {
                data: {
                    success: false,
                    message: "Story is not in an active round.",
                    roundID,
                    storyID,
                }
            });
        }
    } catch (reason) {
        if (reason !== null) logger.error(reason);
        res.send(500, {reason})
    }
}
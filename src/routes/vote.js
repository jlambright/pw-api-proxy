const {DateTime} = require("luxon");

const {getUidFromAuthHeader} = require("./helpers");
const logger = require("../logger");
const {MatchupsCollection} = require("../webflowclient");
const RoundMap = require("../roundmap");

const {voteEntityFactory} = require("../entities/voteEntity");

let roundMap, voteEntity;

module.exports.voteCheck = async (req, res, next) => {
    try {
        let storyInRound;
        roundMap = await RoundMap.build();
        const sid = req.params.id;

        if (sid in roundMap.stories) {
            storyInRound = true;
            const uid = await getUidFromAuthHeader(req.header('Authorization'));
            const rid = roundMap.roundId;
            const timestamp = DateTime.now().setZone("Americas/New_York");
            const mid = roundMap.stories[sid].matchID;
            voteEntity = voteEntityFactory(mid, rid, sid, timestamp, uid);
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
        const uid = await getUidFromAuthHeader(req.header('Authorization'));
        roundMap = await RoundMap.build();

        if (storyID in roundMap.stories) {
            const storyMatchInfo = roundMap.stories[storyID];
            const matchupID = storyMatchInfo.matchID;

            let voterIDs = new Set(((storyMatchInfo.hasOwnProperty("voters") && roundMap.newDayFlag) ? storyMatchInfo.voters : []));

            const slot = storyMatchInfo.slot;
            const matchUpObj = await MatchupsCollection.item(matchupID);

            if (matchUpObj.hasOwnProperty("voters") && !roundMap.newDayFlag) {
                let parsedVoterIDs = matchUpObj.voters.split(",");
                parsedVoterIDs.forEach(uid => voterIDs.add(uid));
            }

            if (voterIDs.has(uid)) {
                return res.send({data: {message: "You've already voted for this story."}});
            } else {
                voterIDs.add(uid)
                const voters = [...voterIDs];
                let fields = {
                    voters: voters.toString(),
                }
                fields[`${slot}-votes`] = ++matchUpObj[`${slot}-votes`]
                const patchResponse = await MatchupsCollection.patchLiveItem(matchupID, {
                    fields: fields
                });
                logger.debug(JSON.stringify(patchResponse));
                return RoundMap.update(matchupID, voters, new Date(patchResponse["updated-on"])).then(() => {
                    logger.info(`Voter: ${uid}, Story: ${storyID}`);
                    return res.send({data: {message: "vote successful"}});
                }).catch(error => logger.error(error))
            }
        } else {
            return res.send({data: "Story is not in an active round."});
        }
    } catch (reason) {
        if (reason !== null) logger.error(reason);
    }
}
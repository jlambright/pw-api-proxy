const {getToken} = require('restify-firebase-auth');

const {Admin} = require("../auth");
const logger = require("../logger");
const {MatchupsCollection} = require("../webflowclient");
const RoundMap = require("../roundmap");

module.exports = async (req, res, next) => {
    const authorization = req.header('Authorization');
    const storyID = req.params.id;
    try {
        const decodedToken = await Admin.auth().verifyIdToken(getToken(authorization));
        const uid = decodedToken.uid;
        const roundMap = await RoundMap.build();
        if (storyID in roundMap.stories) {
            const storyMatchInfo = roundMap.stories[storyID];
            const matchupID = storyMatchInfo.matchID;

            let voterIDs = new Set((storyMatchInfo.hasOwnProperty("voters") ? storyMatchInfo.voters : []));

            const slot = storyMatchInfo.slot;
            const matchUpObj = await MatchupsCollection.item(matchupID);

            if (matchUpObj.hasOwnProperty("voters")) {
                let parsedVoterIDs = matchUpObj.voters.split(",");
                parsedVoterIDs.forEach(uid => voterIDs.add(uid));
            }

            if (voterIDs.has(uid)) {
                return res.send({data: {message: "You've already voted for this story."}});
            } else {
                voterIDs.add(uid)
                voterIDs = [...voterIDs];
                let fields = {
                    voters: voterIDs.toString(),
                }
                fields[`${slot}-votes`] = ++matchUpObj[`${slot}-votes`]
                const patchResponse = await MatchupsCollection.patchLiveItem(matchupID, {
                    fields: fields
                });
                const datastoreResponse = await RoundMap.update(matchupID, voterIDs, new Date(patchResponse["updated-on"]));
                logger.info(`Voter: ${uid}, Story: ${storyID}`);
                return res.send({data: {message: "vote successful", response: datastoreResponse}})
            }
        } else {
            return res.send({data: "Story is not in an active round."});
        }
    } catch (reason) {
        if (reason !== null) logger.error(reason);
    }
}
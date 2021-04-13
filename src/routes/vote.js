const {getToken} = require('restify-firebase-auth');

const {Admin} = require("../auth");
const logger = require("../logger");
const {MatchupsCollection} = require("../webflowclient");
const RoundMap = require("../roundmap");

module.exports = async (req, res, next) => {
    const authorization = req.header('Authorization');
    const storyID = req.params.id;
    try {
        let decodedToken = await Admin.auth().verifyIdToken(getToken(authorization));
        const uid = decodedToken.uid;
        try {
            let roundMap = await RoundMap.build();
            if (storyID in roundMap.stories) {
                const storyMatchInfo = roundMap.stories[storyID];
                const matchupID = storyMatchInfo.matchID;

                let voterIDs = new Set((storyMatchInfo.hasOwnProperty("voters") ? storyMatchInfo.voters : []));

                const slot = storyMatchInfo.slot;

                try {
                    let matchUpObj = await MatchupsCollection.item(matchupID);

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

                        try {
                            let response = await MatchupsCollection.patchLiveItem(matchupID, {
                                fields: fields
                            });
                            try {
                                await RoundMap.update(matchupID, response.voters.split(','), new Date(response["updated-on"]));
                                logger.info(`Voter: ${uid}, Story: ${storyID}`);
                                return res.send({data: {message: "vote successful", response: response}})
                            } catch (reason) {
                                if (reason !== null) logger.error(reason);
                            }
                        } catch (reason1) {
                            if (reason1 !== null) logger.error(reason1);
                        }
                    }
                } catch (reason2) {
                    if (reason2 !== null) logger.error(reason2);
                }
            } else {
                return res.send({data: "Story is not in an active round."});
            }
        } catch (reason3) {
            if (reason3 !== null) logger.error(reason3);
        }
    } catch (reason4) {
        if (reason4 !== null) logger.error(reason4);
    }
}
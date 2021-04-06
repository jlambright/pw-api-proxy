const restify = require("restify");
const errors = require("restify-errors");
const corsMiddleware = require('restify-cors-middleware2')
const {getToken} = require('restify-firebase-auth');

const {Admin, FirebaseAuth} = require("./auth");
const {buildRoundMap, updateRoundMap} = require("./storymap");
const logger = require("./logger");
const {MatchupsCollection} = require("./webflowclient");

const cors = corsMiddleware({
    preflightMaxAge: 5, //Optional,
    credentials: true,
    origins: [
        'https://app.purplewallstories.com',
        'https://dev.purplewallstories.com',
        'https://purple-wall.appspot.com',
        'https://purple-wall.webflow.io',
        'https://*.purplewallstories.com',
    ],
    allowHeaders: [
        "Access-Control-Allow-Origin",
        'API-Token',
        "Authorization",
        "Content-Type",
        "Credentials",
        "Mode"
    ],
    exposeHeaders: ['API-Token-Expiry']
})

const server = restify.createServer({
    name: 'pw-api-proxy',
    version: '1.0.0'
});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(FirebaseAuth);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

server.post("/vote/:id", (req, res, next) => {
    const authorization = req.header('Authorization');
    const storyID = req.params.id;
    return Admin.auth().verifyIdToken(getToken(authorization)).then((decodedToken) => {
        const uid = decodedToken.uid;
        return buildRoundMap().then((roundMap) => {
            if (storyID in roundMap.stories) {
                let data = {}
                const storyMatchInfo = roundMap.stories[storyID];
                const matchupID = storyMatchInfo.matchID;
                let voters = storyMatchInfo.hasOwnProperty("voters")? storyMatchInfo.voters : []
                const slot = storyMatchInfo.slot;
                return MatchupsCollection.item(matchupID).then((matchUpObj) => {
                    data[`${slot}-votes`] = ++matchUpObj[`${slot}-votes`]
                    voters = matchUpObj.hasOwnProperty("voters")? JSON.parse(matchUpObj.voters) : voters;

                    if (voters.includes(uid)) {
                        return res.send(new errors.InvalidContentError());
                    } else {
                        voters.push(uid)

                        data["voters"] = voters.toString();
                        roundMap[matchupID].voters = voters;
                        roundMap[storyID].voters = voters;

                        return MatchupsCollection.patchLiveItem(matchupID, {fields: data})
                            .then((resp) => {
                                logger.info(`Vote count updated: Story - ${storyID} by UID - ${uid}`);
                                return res.send(resp);
                            }).then(() => {
                                return updateRoundMap(roundMap)
                                    .then(() => res.send({data: {message: "vote successful"}}))
                            })
                            .catch((reason) => {
                            if (reason !== null) logger.error(reason);
                        })
                        .catch((reason) => {
                            if (reason !== null) logger.error(reason);
                        });
                    }
                })
            } else {
                return res.send({data: "Story not in not in active round."});
            }
        }).catch((reason) => {
            if (reason !== null) logger.error(reason);
        });
    }).catch((reason) => {
        if (reason !== null) logger.error(reason);
    });
});

server.get("/round", (req, res, next) => {
    const storyID = req.params.id;
    return buildRoundMap().then((roundMap) => {
        return res.send({data:roundMap});
    }).catch((reason) => {
        if (reason !== null) logger.error(reason);
    });
});

const port = process.env.PORT || 3030
server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url);
});

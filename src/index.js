const restify = require("restify");
const errors = require("restify-errors");
const corsMiddleware = require('restify-cors-middleware2')
const {getToken} = require('restify-firebase-auth');

const firebaseAuth = require("./auth");
const {buildRoundMap, updateRoundMap} = require("./storymap");
const logger = require("./logger");
const {MatchupsCollection} = require("./webflowclient")
const matchupsCollection = new MatchupsCollection();

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
server.use(firebaseAuth);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

server.post("/vote/:id", (req, res, next) => {
    const authorization = req.header('Authorization');
    const storyID = req.params.id;
    return firebaseAuth.firebase.admin.verifyIdToken(getToken(authorization)).then((decodedToken) => {
        return buildRoundMap().then((roundMap) => {
            const uid = decodedToken.uid;
            if (storyID in roundMap.stories) {
                let data = {}
                const storyMatchInfo = roundMap.stories[storyID];
                const matchupID = storyMatchInfo.matchUp;
                const slot = storyMatchInfo.slot;

                matchupsCollection.item(matchupID).then((matchUpObj) => {
                    data[`${slot}-votes`] = ++matchUpObj[`${slot}-votes`]
                    const voters = matchUpObj.hasOwnProperty("voters")? JSON.parse(matchUpObj.voters) : [];

                    if (uid in voters) {
                        return next(new errors.InvalidContentError());
                    } else {
                        voters.push(uid)
                    }

                    data["voters"] = voters.toString();
                    roundMap.voters = voters;

                    updateRoundMap(roundMap).catch((reason) => {
                        if (reason !== null) logger.error(reason);
                    });
                    matchupsCollection.patchLiveItem(matchupID, {fields: data})
                        .then((resp) => {
                            return res.send(resp);
                        }).catch((reason) => {
                        if (reason !== null) logger.error(reason);
                    });
                })
            } else {
                return res.send
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
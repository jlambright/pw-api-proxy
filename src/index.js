'use strict';

require('@google-cloud/debug-agent').start({serviceContext: {enableCanary: false}});


const {URL} = require("url");
const restify = require("restify");
const {bodyParser, acceptParser, queryParser} = restify.plugins;
const throttle = require("micron-throttle");
const cors = require('cors');
const corsGate = require('cors-gate');

const cache = require("./cache");
const {firebaseAuth} = require("./pwFirebase");
const {MatchUps, Stories, Logs} = require("./routes");

const origins = [
    'https://app.purplewallstories.com',
    'https://www.purplewallstories.com',
    'https://purplewallstories.com',
    'https://purple-wall.webflow.io',
]

const corsConf = cors({
    credentials: true,
    origin: origins
});

const corsGateConf = corsGate({
    strict: true,
    allowSafe: true,
    origin: origins
})

const throttleConfig = {
    burst: 15,  // Max 15 concurrent requests (if tokens)
    rate: 0.75,  // Steady state
    ip: false,   // throttle per IP
    username: false, // throttle per username
    xff: true, // throttle per forwarded IP
    tokensTable: cache
};

const originCheck = (req, res, next) => {
    const ref = req.headers.referrer || req.headers.referer
    if (ref) {
        const urlRef = new URL(ref);
        if (origins.includes(urlRef.origin)) {
            return next();
        }
    }
    return res.send(403, {code: "Forbidden", message: 'Invalid origin'});
}

const server = restify.createServer({
    name: 'pw-api-proxy',
    version: '1.5.0'
});

server.acceptable = ["application/json"]

server.pre(restify.pre.dedupeSlashes())
server.use(corsGate.originFallbackToReferer());
server.use(corsConf);
server.use(corsGateConf);
server.use(originCheck);
server.use(throttle(throttleConfig));
server.use(acceptParser(server.acceptable));
server.use(queryParser());
server.use(bodyParser());
server.post(`/${process.env.API_VERSION}/logs`, acceptParser(["application/json"]), Logs.createLog);
server.get(`/${process.env.API_VERSION}/match-ups/:matchUpID/votes`, firebaseAuth, MatchUps.voteCount);
server.get(`/${process.env.API_VERSION}/stories/:storyID/votes`, firebaseAuth, Stories.voteCheck);
server.post(`/${process.env.API_VERSION}/stories/:storyID/votes`, firebaseAuth, Stories.castVote);


const port = process.env.PORT || 3030
server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
});

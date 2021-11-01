'use strict';

const {URL} = require("url");
const restify = require("restify");
const {bodyParser, acceptParser, queryParser} = restify.plugins;
// const throttle = require("micron-throttle"); //[Might add this back later if rate-limits are needed.]
const corsMiddleware = require('restify-cors-middleware2');

// const cache = require("./cache"); //[Might add this back later if rate-limits are needed.]
const {firebaseAuth} = require("./pwFirebase");
const {MatchUps, Stories, Logs} = require("./routes");
const logger = require("./logger");

const origins = [
    'https://app.purplewallstories.com',
    'https://www.purplewallstories.com',
    'https://purplewallstories.com',
    'https://purple-wall.webflow.io',
];

const cors = corsMiddleware({
    preflightMaxAge: 5,
    origins,
    allowHeaders: [
        "authorization",
        "content-type",
        "mode",
        "origin",
        "x-forwarded-for",
        "x-requested-with"],
    exposeHeaders: [
        "access-control-allow-header",
        "access-control-allow-methods",
        "access-control-allow-origin",
        "allow-origin",
        "authorization",
        "content-type",
        "date",
        "etag"]
});

const originCheck = (req, res, next) => {
    const ref = req.headers.referrer || req.headers.referer
    if (ref) {
        const urlRef = new URL(ref);
        if (origins.includes(urlRef.origin)) {
            if (!req.headers.hasOwnProperty("origin") || !req.headers.origin) {
                req.headers.origin = urlRef.origin;
                logger.debug("Origin injected into request header.", JSON.parse(req.toString()));
            }
            return next();
        }
    }
    logger.warning("Request originated from unauthorized origin.", JSON.parse(req.toString()));
    return res.send(403, {code: "Forbidden", message: 'Invalid origin'});
}

/* [Might add this back later if rate-limits are needed.]
const throttleConfig = {
    burst: 15,  // Max 15 concurrent requests (if tokens)
    rate: 0.75,  // Steady state
    ip: false,   // throttle per IP
    username: false, // throttle per username
    xff: true, // throttle per forwarded IP
    tokensTable: cache
};
*/

const server = restify.createServer({
    name: 'pw-api-proxy',
    version: '1.5.0'
});

server.acceptable = ["application/json"]

server.pre(originCheck);
server.pre(cors.preflight);
server.pre(restify.pre.dedupeSlashes())
server.use(cors.actual);
// server.use(throttle(throttleConfig));
server.use(acceptParser(server.acceptable));
server.use(queryParser());
server.use(bodyParser());
server.post(`/v1/logs`, Logs.createLog);
server.get(`/v1/match-ups/:matchUpID/votes`, firebaseAuth, MatchUps.voteCount);
server.get(`/v1/stories/:storyID/votes`, firebaseAuth, Stories.voteCheck);
server.post(`/v1/stories/:storyID/votes`, firebaseAuth, Stories.castVote);


const port = process.env.PORT || 3030
server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
});

'use strict';

const {URL} = require("url");
const {createServer, plugins, pre: {dedupeSlashes}} = require("restify");
const {bodyParser, acceptParser, queryParser} = plugins;
// const throttle = require("micron-throttle"); //[Might add this back later if rate-limits are needed.]
const corsMiddleware = require('restify-cors-middleware2');

// const cache = require("./cache"); //[Might add this back later if rate-limits are needed.]
const {firebaseAuth} = require("./pwFirebase");
const {MatchUps, Stories, Logs} = require("./routes");
const logger = require("./logger");
const {toPlainObject} = require("lodash/fp");
const uniqid = require("uniqid");

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

const setReqUUID = (req, res, next) => {
    const {method} = req.getRoute();
    req.id(uniqid(`${method}_`));
    return next();
};


const originCheck = (req, res, next) => {
    const ref = req.headers.referrer || req.headers.referer

    const {path, method, versions, name} = req.getRoute();
    const contentType = req.getContentType();
    const {accepts, userAgent} = req;
    let metadata = {
        id: req.id(),
        method,
        name,
        versions,
        path,
        contentType,
        accepts,
        userAgent
    };

    if (req.headers.hasOwnProperty("origin") && req.headers.origin && origins.includes(req.headers.origin)) {
        return next();
    } else if (ref) {
        const urlRef = new URL(ref);
        if (origins.includes(urlRef.origin)) {
            metadata.origin = null;
            metadata.newOrigin = urlRef.origin;
            req.headers.origin = urlRef.origin;
            req.log.debug("Origin was not defined in the request, but referer is authorized.", toPlainObject(metadata));
            return next();
        } else {
            req.log.warning("Request origin and referer are unauthorized.", toPlainObject(metadata));
        }
    } else {
        metadata.origin = req.origin ? req.origin : null;
        req.log.warning("Request origin unauthorized.", metadata);
    }
    return res.send(403, {code: "Forbidden", message: 'Unauthorized client request.'});
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

const server = createServer({
    ignoreTrailingSlash: true,
    log: logger,
    name: 'pw-api-proxy',
    noWriteContinue: true,
    version: '1.5.0',
});

server.acceptable = ["application/json"]

server.pre(setReqUUID);
server.pre(originCheck);
server.pre(cors.preflight);
server.pre(dedupeSlashes())
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

'use strict';

require('@google-cloud/debug-agent').start({serviceContext: {enableCanary: false}});


const {URL} = require("url");
const restify = require("restify");
const {bodyParser, acceptParser, queryParser} = restify.plugins;
const throttle = require("micron-throttle");
const corsMiddleware = require('restify-cors-middleware2')

const cache = require("./cache");
const {firebaseAuth} = require("./pwFirebase");
const {MatchUps, Stories, Logs} = require("./routes");
const logger = require("./logger");

const origins = [
    'https://app.purplewallstories.com',
    'https://purple-wall.appspot.com',
    'https://purple-wall.webflow.io',
]

const cors = corsMiddleware({
    preflightMaxAge: 50, //Optional,
    credentials: true,
    origins,
    allowHeaders: [
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Origin",
        'API-Token',
        "Authorization",
        "Content-Type",
        "Credentials",
        "Mode"
    ],
    exposeHeaders: ['API-Token-Expiry', "Access-Control-Allow-Headers", "Access-Control-Allow-Origin", "Authorization"]
});

const throttleConfig = {
    burst: 15,  // Max 15 concurrent requests (if tokens)
    rate: 0.75,  // Steady state
    ip: false,   // throttle per IP
    username: false, // throttle per username
    xff: true, // throttle per forwarded IP
    tokensTable: cache
};

const originCheck = (req, res, next) => {
    const ref = req.get('Referrer') || req.headers.referrer || req.headers.referer
    if (ref) {
        const urlRef = new URL(ref);
        if (origins.includes(urlRef.origin)) {
            return next();
        }
    }
    return res.send(403, {code: "Forbidden", message: 'Invalid origin'});
}

const catchAll = (req, res, next) => {
    const route = req.getRoute();
    const {path, method} = route;
    logger.warning('[Invalid API Request Attempt', route)
    return res.send(404, {
        code: "ResourceNotFound",
        message: `The resource of ${method}-${path} was not found.`
    })
}

const server = restify.createServer({
    name: 'pw-api-proxy',
    version: '1.5.0'
});

server.acceptable = ["application/json"]

server.pre(cors.preflight);
server.pre(restify.pre.dedupeSlashes())
server.pre(originCheck());
server.use(cors.actual);
server.use(throttle(throttleConfig));
server.use(acceptParser(server.acceptable));
server.use(queryParser());
server.use(bodyParser());

server.post(`/${process.env.API_VERSION}/logs`, acceptParser(["application/json"]), Logs.createLog);
server.get(`/${process.env.API_VERSION}/match-ups/:matchUpID/votes`, firebaseAuth, MatchUps.voteCount);
server.get(`/${process.env.API_VERSION}/stories/:storyID/votes`, firebaseAuth, Stories.voteCheck);
server.post(`/${process.env.API_VERSION}/stories/:storyID/votes`, firebaseAuth, Stories.castVote);
server.get('*', catchAll);
server.patch('*', catchAll);
server.post('*', catchAll);
server.put('*', catchAll);
server.del('*', catchAll);

const port = process.env.PORT || 3030
server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
});

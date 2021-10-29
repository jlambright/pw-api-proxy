'use strict';

require('@google-cloud/debug-agent').start({serviceContext: {enableCanary: false}});


const {URL} = require("url");
const restify = require("restify");
const {bodyParser, acceptParser, queryParser, throttle} = restify.plugins;
const corsMiddleware = require('restify-cors-middleware2')

const cache = require("./cache");
const {firebaseAuth} = require("./pwFirebase");
const {Vote, Logs} = require("./routes");

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
    username: true, // throttle per username
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
    return res.send(403, 'Invalid origin');
}

const server = restify.createServer({
    name: 'pw-api-proxy',
    version: '1.0.0'
});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(throttle(throttleConfig));
server.use(firebaseAuth);
server.use(acceptParser(server.acceptable));
server.use(queryParser());
server.use(bodyParser());
server.use(originCheck());

server.post("/logs", Logs.createLog);
server.get("/match-up/:id", Vote.voteCount);
server.get(("/vote/:id"), Vote.voteCheck);
server.post("/vote/:id", Vote.castVote);

const port = process.env.PORT || 3030
server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
});

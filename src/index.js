'use strict';

require('@google-cloud/debug-agent').start({serviceContext: {enableCanary: false}});

const restify = require("restify");
const corsMiddleware = require('restify-cors-middleware2')

const {FirebaseAuth} = require("./auth");
const {Vote} = require("./routes");

const cors = corsMiddleware({
    preflightMaxAge: 50, //Optional,
    credentials: true,
    origins: [
        'https://app.purplewallstories.com',
        'https://purple-wall.appspot.com',
        'https://purple-wall.webflow.io',
    ],
    allowHeaders: [
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Origin",
        'API-Token',
        "Authorization",
        "Content-Type",
        "Credentials",
        "Mode"
    ],
    exposeHeaders: ['API-Token-Expiry',"Access-Control-Allow-Headers","Access-Control-Allow-Origin", "Authorization"]
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

server.get(("/vote/:id"), Vote.voteCheck);
server.post("/vote/:id", Vote.castVote);

const port = process.env.PORT || 3030
server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
});

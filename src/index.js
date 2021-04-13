require('@google-cloud/debug-agent').start({serviceContext: {enableCanary: false}});

const restify = require("restify");
const corsMiddleware = require('restify-cors-middleware2')
const {getToken} = require('restify-firebase-auth');

const {FirebaseAuth} = require("./auth");
const {Round, Vote} = require("./routes");

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

server.post("/vote/:id", (req, res, next) => Vote(req, res, next));

server.get("/round", (req, res, next) => Round(req, res, next));

const port = process.env.PORT || 3030
server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url);
});

const restify = require("restify");
const corsMiddleware = require('restify-cors-middleware')

const logger = require("./logger");
const {buildRoundMap} = require("./storymap");
const {MatchupsCollection} = require("./webflowclient")
const matchupsCollection = new MatchupsCollection();

const cors = corsMiddleware({
    preflightMaxAge: 5, //Optional
    origins: [
        'https://*.purplewallstories.com',
        'https://purple-wall.appspot.com',
        'https://purple-wall.webflow.io'
    ],
    allowHeaders: ['API-Token'],
    exposeHeaders: ['API-Token-Expiry']
})

const server = restify.createServer({
    name: 'pw-api-proxy',
    version: '1.0.0'
});

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

server.post("/vote/:id", (req, res, next) => {
    const storyID = req.params.id;
   return buildRoundMap().then((roundMap) => {
       if (storyID in roundMap.stories) {
           let data = {}
           const storyMatchInfo = roundMap.stories[storyID];
           const matchupID = storyMatchInfo.matchUp;
           const slot = storyMatchInfo.slot;

           matchupsCollection.item(matchupID).then((matchUpObj) => {
               data[`${slot}-votes`] = ++matchUpObj[`${slot}-votes`]
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
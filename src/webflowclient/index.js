const {Champions} = require("./champions");
const {Matchups} = require("./matchups");
const {Rounds} = require("./rounds");
const {Stories} = require("./stories");
const {WebflowClient} = require("./client");

module.exports = {
  WebflowClient: new WebflowClient(),
  Champions: Champions,
  Matchups: Matchups,
  Rounds: Rounds,
  Stories: Stories,
}

const vote = require('./vote/vote.service.js');
// eslint-disable-next-line no-unused-vars
module.exports = function (app) {
  app.configure(vote);
};

const {Collection} = require('./client')

module.exports = class MatchupsCollection extends Collection {
  constructor() {
    super(process.env.WF_MATCHES_ID);
  }
}

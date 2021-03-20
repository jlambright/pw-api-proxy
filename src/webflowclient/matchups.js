const {Collection} = require('./client')

module.exports = class Matchups extends Collection {
  _cid = process.env.WF_MATCHES_ID;

  constructor() {
    super();
  }
}

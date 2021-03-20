const {Collection} = require('./client')

module.exports = class Rounds extends Collection {
  _cid = process.env.WF_ROUNDS_ID;

  constructor() {
    super();
  }
}

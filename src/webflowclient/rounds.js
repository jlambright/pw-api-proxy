const {Collection} = require('./client')

module.exports = class RoundsCollection extends Collection {
  _cid = process.env.WF_ROUNDS_ID;

  constructor() {
    super();
  }
}

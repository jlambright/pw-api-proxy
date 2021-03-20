const {Collection} = require('./client')

module.exports = class Champions extends Collection {
  _cId = process.env.WF_ROUNDS_ID;

  constructor() {
    super();
  }
}

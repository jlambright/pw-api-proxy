const {Collection} = require('./client')

module.exports = class RoundsCollection extends Collection {

  constructor() {
    super(process.env.WF_ROUNDS_ID);
  }
}

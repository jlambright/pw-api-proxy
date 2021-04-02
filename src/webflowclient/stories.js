const {Collection} = require('./client')

module.exports = class StoriesCollection extends Collection {
  _cid = process.env.WF_STORIES_ID_;

  constructor() {
    super();
  }
}

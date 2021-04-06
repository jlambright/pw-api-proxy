const Webflow = require("webflow-api");

class Singleton {
  _instance;

  constructor(object = undefined) {
    if (!this._instance) {
      this._instance = object || this;
    } else return this._instance;
  }
}

const WebflowClient = {
  api: new Webflow({ token: process.env.WF_API_KEY }),
  siteId: process.env.WF_SITE_ID,
};

class Collection extends Singleton {
  constructor(collection_id) {
    super();
    this._cid = collection_id;
  }

  get data() {
    return WebflowClient.api.collection({ collectionId: this._cid });
  }

  get id() {
    return this._cid;
  }

  item(itemId, query = {}) {
    if (!itemId) return Promise.reject(buildRequiredArgError('itemId'));

    return WebflowClient.get(`/collections/${this._cid}/items/${itemId}`, query).then(
        res => this.responseWrapper.item(res.items[0], this._cid),
    );
  }

  items(query = {}) {
    return WebflowClient.api.items({ collectionId: this._cid }, query);
  }

  createItem(data, query = {}) {
    return WebflowClient.api.createItem({ collectionId: this._cid, ...data }, query);
  }

  updateItem(itemId, data, query = {}) {
    return WebflowClient.api.updateItem(
        { collectionId: this._cid, itemId: itemId, ...data },
        query
    );
  }

  updateLiveItem(itemId, data, query = {}) {
    Object.assign(query, { live: true });
    return this.updateItem(itemId, data, query);
  }

  removeItem(itemId, query = {}) {
    return WebflowClient.api.removeItem(
        { collectionId: this._cid, itemId: itemId },
        query
    );
  }

  patchItem(itemId, fields, query = {}) {
    return WebflowClient.api.patchItem(
        { collectionId: this._cid, itemId: itemId, ...fields },
        query
    );
  }

  patchLiveItem(itemId, fields, query = {}) {
    Object.assign(query, { live: true });
    return this.patchItem(itemId, fields, query);
  }
}
const MatchupsCollection = new Collection(process.env.WF_MATCHES_ID);
const RoundsCollection = new Collection(process.env.WF_ROUNDS_ID);
const StoriesCollection = new Collection(process.env.WF_STORIES_ID);

module.exports = {
  WebflowClient,
  Collection,
  MatchupsCollection,
  RoundsCollection,
  StoriesCollection
};

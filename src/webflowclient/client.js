const Webflow = require("webflow-api")


class Singleton {
  _instance = undefined

  constructor() {
    if (!this._instance) {
      this._instance = this;
    } else return this._instance;
  }
}


class WebflowClient extends Singleton {
  constructor() {
    super();
    this._api = new Webflow({token: process.env.WF_API_KEY});
    this._siteId = process.env.WF_SITE_ID;
    return this;
  }

  collection(c_id, query = {}) {
    return this._api.collection({collectionId: c_id}, query)
  }

  collections(query = {}) {
    return this._api.collections({siteId: this._siteId}, query)
  }

  site() {
    return this._api.site({siteId: this._siteId});
  }
}

class Collection extends Singleton {
  _api = new WebflowClient();

  constructor(collection_id) {
    super();
    this._cid = collection_id;
    this._collection = this._api.collection(this._cid)
    return this;
  }

  item(itemId, query = {}) {
    return this._api.item({collectionId: this._cid, itemId: itemId}, query)
  }

  items(query = {}) {
    return this._api.items(this._cid, query);
  }

  createItem(data, query = {}) {
    return this._api.createItem({collectionId: this._cid, data: data}, query)
  }

  updateItem(itemId, data, query = {}) {
    return this._api.updateItem({collectionId: this._cid, itemId: itemId, data: data}, query)
  }

  removeItem(itemId, query = {}) {
    return this._api.removeItem({collectionId: this._cid, itemId: itemId}, query)
  }

  patchItem(itemId, data, query = {}) {
    return this._api.patchItem({collectionId: this._cid, itemId: itemId, data: data}, query)
  }
}

module.exports = {
  WebflowClient,
  Collection
}

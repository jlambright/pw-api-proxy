const NodeCache = require("node-cache");

let instance;


/**
 * A singleton extension of NodeCache.
 */
class Cache extends NodeCache {

    constructor(options) {
        if (!instance) {
            super(options)
            instance = this;
        }
        this._type = "Cache"
        return instance;
    }

    /**
     *
     * @param {string} key
     * @param {*} value
     * @param {number|string} ttl
     */
    put(key, value, [ttl] = null) {
        if (ttl) {
            this.set(key, value, ttl);
        } else {
            this.set(key, value);
        }
    }
}

module.exports = new Cache({stdTTL: 86400}); // TTL of 1 day.
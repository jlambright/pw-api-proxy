const logger = require("./logger");

/**
 *
 * @param maxRetries
 * @param fn
 * @return {Promise<*|*|*|undefined>}
 */
const asyncRetry = async (maxRetries, fn) => {
    try {
        return await fn();
    } catch (e) {
        if (maxRetries === 0) {
            logger.alert(`[Retry Failed After ${maxRetries} Attempts]`);
            logger.error(e)
        } else {
            return asyncRetry(maxRetries - 1, fn);
        }
    }
}
module.exports.asyncRetry = asyncRetry;

module.exports.Singleton = class {
    _instance;

    constructor(object = undefined) {
        if (!this._instance) {
            this._instance = object || this;
        } else return this._instance;
    }
}
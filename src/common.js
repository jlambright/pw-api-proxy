const logger = require("./logger");

/**
 *
 * @param maxRetries
 * @param fn
 * @return {Promise<*|*|*|undefined>}
 */
const asyncRetry = async (maxRetries, fn) => {

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            if (i === maxRetries) {
                logger.error(err);
            }
        }
    }
    logger.error(`[Retry Failed After ${maxRetries} Attempts]`);
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
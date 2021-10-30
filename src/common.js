const retry = require('async-await-retry');

const logger = require("./logger");

/**
 *
 * @param {int} maxRetries
 * @param fn
 * @return {Promise<*|*|*|undefined>}
 */
const asyncRetry = async (maxRetries, fn) => {

    try {
        await retry(fn, {
            retriesMax: maxRetries,
            interval: 1000,
            jitter: 250,
            onAttemptFail: (data) => {
                logger.error("[Retry failure]", data)
            }
        });
    } catch (error) {
        logger.error(`[Retry Failed After ${maxRetries} Attempts]`, error);
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
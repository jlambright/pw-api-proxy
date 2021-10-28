const logger = require("./logger");
const {delay} = require("lodash");

/**
 *
 * @param {int} maxRetries
 * @param fn
 * @param {int} attempts
 * @return {Promise<*|*|*|undefined>}
 */
const asyncRetry = async (maxRetries, fn, attempts = 0) => {

    while (maxRetries >= 0) {
        try {
            if (attempts > 0) await delay(5 * attempts);
            return await fn();
        } catch (err) {
            ++attempts;
            if (maxRetries < attempts) {
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
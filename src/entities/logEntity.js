const {Datastore} = require("@google-cloud/datastore");
const datastore = new Datastore();
const {Operator} = datastore.v1.PropertyFilter;
const Enum = require("enum");
const uniqid = require("uniqid");

const logger = require("../logger");
const {BaseEntity} = require("./BaseEntity");

const logLevels = new Enum([
    "OTHER",
    "DEBUG",
    "INFO",
    "WARN",
    "ERROR"
], {name: "LogLevel", freeze: true, ignoreCase: true});

module.exports.LOG_LEVELS = logLevels;
module.exports.LogEntity = class extends BaseEntity {

    /**
     *
     * @param {object} data
     * @param {int=} data.code
     * @param {string} data.path
     * @param {string} data.href
     * @param {int} data.level
     * @param {string} data.message
     * @param {date} data.timestamp
     */
    constructor(data) {
        const options = {
            ancestor: null,
            key: ["Log", `${data.path}_${uniqid()}`]
        }

        // Standardize log levels.
        if (!data.level || !logLevels.has(data.level)) {
            const level = logLevels.get("OTHER");
            data.level = level.value;
            data.code = level.key;
        } else {
            const level = logLevels.get(data.level);
            data.level = level.value;
            data.code = level.key;
        }

        super("Log", data, options);
        this.LOG_LEVELS = logLevels;
    }

    /**
     *
     * @return {Promise<boolean>}
     */
    exists = async () => {
        try {
            const query = datastore
                .createQuery(this.kind)
                .filter("path", "=", this.data.path)
                .filter("timestamp", "=", this.data.timestamp)
                .filter("type", "=", this.data.type)
                .filter("code", "=", this.data.code).select("__key__");

            const [votes] = await datastore.runQuery(query);
            return (votes.length > 0);
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     *
     * @param {boolean} keysOnly
     * @return {Promise<[Entity[], RunQueryInfo]>}
     */
    getSimilarLogs = async (keysOnly = true) => {
        try {
            const query = datastore
                .createQuery(this.kind)
                .filter("path", "=", this.data.path)
                .filter("type", "=", this.data.type)
                .filter("code", "=", this.data.code);

            if (keysOnly) query.select("__keys__");

            return await datastore.runQuery(query);
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     *
     * @param {boolean} keysOnly
     * @return {Promise<[Entity[], RunQueryInfo]>}
     */
    getLogsOfPath = async (keysOnly = true) => {
        try {
            let query = datastore
                .createQuery(this.kind)
                .filter("path", "=", this.data.path)

            if (keysOnly) query.select("__keys__");

            return await datastore.runQuery(query);
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     *
     * @param {boolean} keysOnly
     * @return {Promise<[Entity[], RunQueryInfo]>}
     */
    getLogsOfType = async (keysOnly = true) => {
        try {
            let query = datastore
                .createQuery(this.kind)
                .filter("type", "=", this.data.type)

            if (keysOnly) query.select("__keys__");

            return await datastore.runQuery(query);
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     *
     * @param {[string, Operator, *][]} filters
     * @param {boolean} keysOnly
     * @return {Promise<[Entity[], RunQueryInfo]>}
     */
    getLogsWithFilters = async (filters, keysOnly = true) => {
        try {
            let query = datastore
                .createQuery(this.kind);

            for (const filter of filters) {
                const [property, operator, value] = filter;
                query.filter(property, operator, value);
            }

            if (keysOnly) query.select("__keys__");

            return await datastore.runQuery(query);
        } catch (e) {
            logger.error(e);
        }
    }
}

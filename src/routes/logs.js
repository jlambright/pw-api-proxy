'use strict';

const {DateTime} = require("luxon");

const logger = require("../logger");
const {URL} = require("url");

const {LogEntity} = require("../entities/logEntity");
const {asyncRetry} = require("../common");

module.exports.createLog = async (req, res, next) => {
    try {
        const {time} = req;
        const timestamp = DateTime.fromMillis(time).setZone("America/New_York");
        const ref = req.get('Referrer') || req.headers.referrer || req.headers.referer
        const url = new URL(ref);
        const {origin, path, hostname} = url;

        if (req.body) {
            let data = req.body
            if (!data.hasOwnProperty("timestamp") || !data.timestamp) {
                data.timestamp = timestamp.toJSDate();
            }

            if (!data.hasOwnProperty("path") || !data.path) {
                data.path = path;
            }

            if (!data.hasOwnProperty("origin") || !data.origin) {
                data.origin = origin;
            }

            if (!data.hasOwnProperty("hostname") || !data.hostname) {
                data.hostname = hostname;
            }

            const logEntity = new LogEntity(data);

            if (!await logEntity.exists()) {
                await asyncRetry(2, logEntity.commit());
            }
        } else {
            return res.send({
                data: {
                    success: false,
                    message: "Request must contain a request body.",
                }
            })
        }

    } catch (reason) {
        if (reason !== null) logger.error(reason);
    }
}
const logger = require("../logger");
const RoundMap = require("../roundmap");

module.exports = async (req, res, next) => {
    try {
        let roundMap = await RoundMap.build();
        return res.send({data: roundMap});
    } catch (reason) {
        if (reason !== null) logger.error(reason);
    }
}
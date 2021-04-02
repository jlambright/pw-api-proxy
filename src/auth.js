const admin = require('firebase-admin');

const logger = require("./logger");

module.exports.getUserFromToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        res.send(401);
        return false;
    } else {
        const authToken = authHeader.replace('Bearer ', '');
        return admin.auth().verifyIdToken(authToken)
            .then((decodedToken) => admin.auth().getUser(decodedToken.sub)
                .then((user) => {
                    req.set("user", user);
                    return next();
                })).catch((e) => {
                    logger.info(e);
                res.send(401);
                return false;
            })
    }
}
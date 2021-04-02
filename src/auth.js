const firebase = require('firebase/app');
const admin = require('firebase-admin');

const logger = require("./logger");

module.exports.getUserFromToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        res.send(401);
        return false;
    }
    try {
        const authToken = authHeader.replace('Bearer ', '');
        const decodedToken = await admin.auth().verifyIdToken(authToken);
        const user = await admin.auth().getUser(decodedToken.sub);
        req.set('user', user);
        return next();
    } catch (e) {
        res.send(401);
        return false;
    }
}
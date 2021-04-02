const firebase = require('firebase/app');
const admin = require('firebase-admin');

const logger = require("./logger");

const credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_KEY));

admin.initializeApp(credential);
firebase.initializeApp(credential);

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